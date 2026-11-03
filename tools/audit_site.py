"""Static acceptance checks for the public site. Run from the repository root."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://trade-with-joreem.vercel.app"
PAGES = ["index.html", "about.html", "bookstore.html", "contact.html", "mentorship.html", "member.html", "login.html", "privacy.html", "risk.html", "terms.html"]
SLUGS = {name: ("/" if name == "index.html" else "/" + Path(name).stem) for name in PAGES}
errors: list[str] = []
warnings: list[str] = []


def fail(page: str, message: str) -> None:
    errors.append(f"{page}: {message}")


def page_file(path: str) -> Path | None:
    if path == "/":
        return ROOT / "index.html"
    clean = path.strip("/")
    if clean in {Path(name).stem for name in PAGES}:
        return ROOT / (clean + ".html")
    candidate = ROOT / clean
    return candidate if candidate.is_file() else None


def local_path(value: str) -> Path | None:
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    return ROOT / parts.path.lstrip("/")


titles: set[str] = set()
descriptions: set[str] = set()
canonicals: set[str] = set()
for name in PAGES:
    path = ROOT / name
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else ""
    description = soup.find("meta", attrs={"name": "description"})
    description = description.get("content", "").strip() if description else ""
    canonical = soup.find("link", rel="canonical")
    canonical = canonical.get("href", "") if canonical else ""
    expected = ORIGIN + SLUGS[name]
    if not title:
        fail(name, "missing title")
    if title in titles:
        fail(name, "duplicate title")
    titles.add(title)
    if not description:
        fail(name, "missing meta description")
    if description in descriptions:
        fail(name, "duplicate meta description")
    descriptions.add(description)
    if canonical != expected:
        fail(name, f"canonical {canonical!r}, expected {expected!r}")
    canonicals.add(canonical)
    robots = " ".join(meta.get("content", "") for meta in soup.find_all("meta", attrs={"name": "robots"}))
    if "noindex" in robots.lower() or "index" not in robots.lower():
        fail(name, f"indexing directives are wrong: {robots!r}")
    for prop in ["og:title", "og:description", "og:url", "og:image", "og:image:width", "og:image:height"]:
        if not soup.find("meta", attrs={"property": prop}):
            fail(name, f"missing {prop}")
    if not soup.find("meta", attrs={"name": "twitter:card", "content": "summary_large_image"}):
        fail(name, "missing large-image Twitter card")
    h1s = soup.find_all("h1")
    if len(h1s) != 1:
        fail(name, f"expected one H1, found {len(h1s)}")
    mains = soup.find_all("main")
    if len(mains) != 1 or mains[0].get("id") != "main-content":
        fail(name, "expected one #main-content main landmark")
    elif len(h1s) == 1 and h1s[0] not in mains[0].descendants:
        fail(name, "H1 is outside the main landmark")
    for toggler in soup.select(".navbar-toggler"):
        if not toggler.get("aria-label"):
            fail(name, "navigation toggler lacks an accessible name")
    previous = 0
    for heading in soup.find_all(re.compile(r"^h[1-6]$")):
        level = int(heading.name[1])
        if previous and level > previous + 1:
            fail(name, f"heading skip H{previous} → H{level} at {heading.get_text(' ', strip=True)!r}")
        previous = level
    ids = [tag["id"] for tag in soup.find_all(id=True)]
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        fail(name, f"duplicate IDs: {duplicates}")
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            if data.get("@context") != "https://schema.org" or not data.get("@graph"):
                fail(name, "JSON-LD lacks schema context or graph")
        except Exception as exc:
            fail(name, f"invalid JSON-LD: {exc}")
    if not soup.find("script", attrs={"type": "application/ld+json"}):
        fail(name, "missing JSON-LD")
    for image in soup.find_all("img"):
        for attr in ["alt", "width", "height", "loading", "decoding"]:
            if not image.get(attr):
                fail(name, f"image {image.get('src')} lacks {attr}")
        if image.get("alt") == "Image":
            fail(name, "generic image alt text")
        source = local_path(image.get("src", ""))
        if source and not source.is_file():
            fail(name, f"missing image {source.relative_to(ROOT)}")
        for candidate in image.get("srcset", "").split(","):
                url = candidate.strip().split(" ")[0]
                source = local_path(url)
                if source and not source.is_file():
                    fail(name, f"missing srcset image {source.relative_to(ROOT)}")
    for tag, attr in [(tag, attr) for tag, attrs in [("link", ["href"]), ("script", ["src"]), ("a", ["href"])] for attr in attrs]:
        for element in soup.find_all(tag):
            value = element.get(attr, "")
            if not value:
                continue
            if value == "#":
                fail(name, "placeholder href='#'")
            parts = urlsplit(value)
            if parts.scheme or parts.netloc or value.startswith(("mailto:", "tel:", "data:")):
                continue
            if parts.path.endswith(".html"):
                fail(name, f"unclean local URL {value}")
            if parts.path and not parts.path.startswith("/"):
                fail(name, f"non-root-relative local URL {value}")
            target = page_file(parts.path) if parts.path else path
            if target is None:
                fail(name, f"broken local target {value}")
            elif parts.fragment:
                target_soup = soup if target == path else BeautifulSoup(target.read_text(encoding="utf-8"), "html.parser")
                if not target_soup.find(id=parts.fragment):
                    fail(name, f"missing fragment target {value}")
    for anchor in soup.find_all("a", target="_blank"):
        if "noopener" not in anchor.get("rel", []):
            fail(name, f"target=_blank link lacks noopener: {anchor.get('href')}")

# Check CSS comment integrity and local url() references after the clean-image migration.
for css in (ROOT / "css").glob("*.css"):
    css_text = css.read_text(encoding="utf-8")
    if css_text.count("/*") != css_text.count("*/"):
        fail(str(css.relative_to(ROOT)), "unbalanced CSS comments")
    for value in re.findall(r"url\(['\"]?([^)'\"]+)", css_text):
        if value.startswith(("data:", "http://", "https://", "#")):
            continue
        parts = urlsplit(value)
        target = (ROOT / parts.path.lstrip("/")) if parts.path.startswith("/") else (css.parent / parts.path).resolve()
        if not target.is_file():
            fail(str(css.relative_to(ROOT)), f"missing CSS asset {value}")

ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
tree = ElementTree.parse(ROOT / "sitemap.xml")
locations = {node.text for node in tree.findall("s:url/s:loc", ns)}
if locations != canonicals:
    fail("sitemap.xml", f"URL mismatch: {sorted(locations ^ canonicals)}")
robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
if ORIGIN + "/sitemap.xml" not in robots:
    fail("robots.txt", "missing absolute sitemap URL")
if not (ROOT / "llms.txt").read_text(encoding="utf-8").startswith("# Trade with Joreem"):
    fail("llms.txt", "missing site heading")

if errors:
    print(f"FAIL — {len(errors)} issue(s)")
    print("\n".join(" - " + error for error in errors))
    sys.exit(1)
print(f"PASS — {len(PAGES)} pages; unique metadata, canonicals, indexing, Open Graph, JSON-LD, headings, images, local links, fragments, CSS assets, sitemap and robots validated.")
