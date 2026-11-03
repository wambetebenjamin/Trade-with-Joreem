"""Apply the site's repeatable SEO, accessibility and image optimizations.

Run from the repository root with: .venv/bin/python -m tools.optimize_site
The production origin is the homepage configured on the GitHub repository.
"""
from __future__ import annotations

import hashlib
import json
import re
from copy import copy
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageOps
from rcssmin import cssmin
from rjsmin import jsmin

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://trade-with-joreem.vercel.app"
MODIFIED = "2026-11-03"
PAGES = {
    "index.html": {
        "slug": "",
        "title": "Forex Mentorship & Trading Education | Trade with Joreem",
        "description": "Learn Forex, crypto and stock trading with Joreem through live market breakdowns, risk-first lessons, practical books and a supportive global community.",
        "label": "Home",
    },
    "about.html": {
        "slug": "about",
        "title": "About Joreem | Forex Trader & Trading Mentor",
        "description": "Meet Joreem, founder of Trade with Joreem, and discover the risk-first trading method, teaching philosophy and milestones behind the global learning community.",
        "label": "About Joreem",
    },
    "bookstore.html": {
        "slug": "bookstore",
        "title": "Trading Books for Forex, Crypto & Stocks | Joreem",
        "description": "Explore Joreem's practical trading books on Forex mastery, crypto signals, trading psychology and stocks, with clear frameworks for disciplined market decisions.",
        "label": "Bookstore",
    },
    "contact.html": {
        "slug": "contact",
        "title": "Contact Trade with Joreem | Trading Education Support",
        "description": "Contact the Trade with Joreem team for mentorship, book, payment and member-support questions. Reach us by email or Telegram and expect a response within one business day.",
        "label": "Contact",
    },
    "mentorship.html": {
        "slug": "mentorship",
        "title": "Forex Trading Mentorship & Live Market Rooms | Joreem",
        "description": "Join Joreem's risk-first trading mentorship for live market breakdowns, structured lessons, trade feedback and a private global community across Forex, crypto and stocks.",
        "label": "Mentorship",
    },
    "member.html": {
        "slug": "member",
        "title": "Member Dashboard | Trade with Joreem",
        "description": "Open your Trade with Joreem member dashboard for live breakdowns, structured trading lessons, resources, curriculum progress and private community access.",
        "label": "Member Dashboard",
    },
    "login.html": {
        "slug": "login",
        "title": "Member Login | Trade with Joreem",
        "description": "Sign in to your Trade with Joreem member dashboard to continue your trading curriculum, review market breakdowns and access member resources.",
        "label": "Member Login",
    },
    "privacy.html": {
        "slug": "privacy",
        "title": "Privacy Policy | Trade with Joreem",
        "description": "Read how Trade with Joreem collects, uses, protects and deletes personal information, and learn about your privacy rights and available contact options.",
        "label": "Privacy Policy",
    },
    "risk.html": {
        "slug": "risk",
        "title": "Trading Risk Disclaimer | Trade with Joreem",
        "description": "Understand the financial risks of trading and the limits of Trade with Joreem's educational content, mentorship, examples, performance records and market commentary.",
        "label": "Risk Disclaimer",
    },
    "terms.html": {
        "slug": "terms",
        "title": "Terms of Service | Trade with Joreem",
        "description": "Review the terms for Trade with Joreem accounts, mentorship, books, payments, refunds, intellectual property, acceptable use and educational services.",
        "label": "Terms of Service",
    },
}
PLACEHOLDER_SOCIAL = {"youtube", "twitter", "instagram", "whatsapp"}
BOOKS = [
    ("forex-mastery", "Forex Mastery", "59.00", "A risk-first Forex system covering structure, liquidity, timing, entries and position sizing."),
    ("crypto-signals", "Crypto Signals Handbook", "29.00", "A repeatable checklist for reading and filtering crypto setups without chasing market noise."),
    ("psychology", "Trading Psychology", "49.00", "Practical frameworks for discipline, emotional control and consistent trading decisions."),
    ("stocks-from-zero", "Stocks from Zero", "25.00", "A beginner-friendly guide to stock-market structure, analysis and risk-aware execution."),
]
IMAGE_ALTS = {
    "about": "Trader reviewing a laptop beneath a wall-mounted financial market chart",
    "hero": "Red and green financial candlesticks on a dark market chart",
    "joreem": "Joreem, founder and head trading mentor at Trade with Joreem",
    "forex-mastery": "Forex Mastery book cover by Joreem",
    "crypto-signals": "Crypto Signals Handbook book cover by Joreem",
    "psychology": "Trading Psychology book cover by Joreem",
    "stocks-from-zero": "Stocks from Zero book cover by Joreem",
}
CSS_SOURCES = [
    "/css/fonts.css",
    "/assets/vendor/fontawesome/css/all.min.css",
    "/assets/vendor/bootstrap-icons/bootstrap-icons.css",
    "/lib/owlcarousel/assets/owl.carousel.min.css",
    "/lib/animate/animate.min.css",
    "/css/bootstrap.min.css",
    "/css/style.css",
    "/css/trading.css",
    "/css/funding.css",
    "/assets/monoline/css/style.css",
    "/assets/monoline/css/responsive.css",
    "/assets/monoline/css/menu.css",
    "/css/monoline.css",
    "/css/home-lower.css",
    "/css/process.css",
    "/css/seo.css",
]
JS_SOURCES = [
    "/lib/jquery/jquery-3.6.4.min.js",
    "/lib/bootstrap/bootstrap.bundle.min.js",
    "/lib/wow/wow.min.js",
    "/lib/easing/easing.min.js",
    "/lib/waypoints/waypoints.min.js",
    "/lib/counterup/counterup.min.js",
    "/lib/owlcarousel/owl.carousel.min.js",
    "/js/main.js",
    "/js/trading.js",
]


def absolute(path: str) -> str:
    return ORIGIN + (path if path.startswith("/") else "/" + path)


def save_webp(source: Path, target: Path, width: int | None = None, quality: int = 82) -> tuple[int, int]:
    image = Image.open(source).convert("RGB")
    if width and image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    image.save(target, "WEBP", quality=quality, method=6)
    return image.size


def build_images() -> dict[str, tuple[int, int]]:
    dimensions: dict[str, tuple[int, int]] = {}
    for source in [ROOT / "img/about.jpg", ROOT / "img/joreem.jpg", *sorted((ROOT / "assets/books").glob("*.jpg"))]:
        target = source.with_suffix(".webp")
        dimensions[target.name] = save_webp(source, target)
    dimensions["hero.webp"] = save_webp(ROOT / "img/hero.jpg", ROOT / "img/hero.webp", 1600, 80)
    dimensions["hero-960.webp"] = save_webp(ROOT / "img/hero.jpg", ROOT / "img/hero-960.webp", 960, 80)
    dimensions["joreem-320.webp"] = save_webp(ROOT / "img/joreem.jpg", ROOT / "img/joreem-320.webp", 320)
    for source in sorted((ROOT / "assets/books").glob("*.jpg")):
        dimensions[f"{source.stem}-480.webp"] = save_webp(source, source.with_name(source.stem + "-480.webp"), 480, 80)

    # A dedicated 1200×630 social card avoids cropping a book cover or portrait.
    social = ImageOps.fit(Image.open(ROOT / "img/hero.jpg").convert("RGB"), (1200, 630), method=Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", social.size, (0, 0, 0, 0))
    pixels = overlay.load()
    for x in range(900):
        alpha = round(235 * max(0, 1 - x / 900) ** 0.65)
        for y in range(630):
            pixels[x, y] = (4, 12, 20, alpha)
    social = Image.alpha_composite(social.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(social)
    font_dir = ROOT / ".work/course_decks/fonts"
    regular = font_dir / "Inter-Regular.ttf"
    bold = font_dir / "Inter-Bold.ttf"
    fallback = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    fallback_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    title_font = ImageFont.truetype(str(bold if bold.exists() else fallback_bold), 66)
    small_font = ImageFont.truetype(str(bold if bold.exists() else fallback_bold), 23)
    body_font = ImageFont.truetype(str(regular if regular.exists() else fallback), 26)
    gold = "#F0B429"
    for i, height in enumerate([52, 82, 64, 98]):
        x = 72 + i * 30
        draw.line((x + 8, 72, x + 8, 72 + height + 24), fill=gold, width=4)
        draw.rounded_rectangle((x, 88, x + 16, 88 + height), radius=3, fill=gold)
    draw.text((72, 230), "TRADE WITH", font=small_font, fill=gold)
    draw.text((68, 270), "JOREEM", font=title_font, fill="white")
    draw.text((72, 372), "FOREX  •  CRYPTO  •  STOCKS", font=small_font, fill=gold)
    draw.text((72, 438), "Risk-first trading education.\nLive breakdowns. Practical books.", font=body_font, fill="#D9E2EC", spacing=12)
    social.convert("RGB").save(ROOT / "img/trade-with-joreem-social.jpg", quality=88, optimize=True, progressive=True)

    logo = Image.new("RGB", (512, 512), "#0A1220")
    logo_draw = ImageDraw.Draw(logo)
    for i, height in enumerate([142, 220, 174, 258]):
        x = 118 + i * 72
        logo_draw.line((x + 18, 102, x + 18, 102 + height + 56), fill=gold, width=12)
        logo_draw.rounded_rectangle((x, 146, x + 36, 146 + height), radius=8, fill=gold)
    logo.save(ROOT / "img/trade-with-joreem-logo.png", optimize=True)
    return dimensions


def set_meta(soup: BeautifulSoup, key: str, value: str, content: str) -> None:
    tag = soup.head.find("meta", attrs={key: value})
    if not tag:
        tag = soup.new_tag("meta")
        tag[key] = value
        soup.head.append(tag)
    tag["content"] = content


def set_link(soup: BeautifulSoup, rel: str, href: str, **attrs: str) -> None:
    tag = soup.head.find("link", rel=rel, href=href) if rel == "preload" else soup.head.find("link", rel=rel)
    if not tag:
        tag = soup.new_tag("link")
        tag["rel"] = rel
        soup.head.append(tag)
    tag["href"] = href
    for key, value in attrs.items():
        tag[key.rstrip("_").replace("_", "-")] = value


def local_root_url(value: str, page: str) -> str:
    if not value or value.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:", "#")):
        return value
    parts = urlsplit(value)
    path = parts.path
    if not path:
        return value
    if path.endswith(".html"):
        name = Path(path).name
        if name in PAGES:
            slug = PAGES[name]["slug"]
            path = "/" if not slug else "/" + slug
        elif not path.startswith("/"):
            path = "/" + path.lstrip("./")
    elif not path.startswith("/"):
        path = "/" + path.lstrip("./")
    return urlunsplit(("", "", path, parts.query, parts.fragment))


def schema_for(filename: str, soup: BeautifulSoup, canonical: str, title: str, description: str) -> dict:
    org_id = absolute("/#organization")
    site_id = absolute("/#website")
    person_id = absolute("/about#joreem")
    organization = {
        "@type": "Organization",
        "@id": org_id,
        "name": "Trade with Joreem",
        "url": absolute("/"),
        "logo": {"@type": "ImageObject", "url": absolute("/img/trade-with-joreem-logo.png"), "width": 512, "height": 512},
        "image": absolute("/img/trade-with-joreem-social.jpg"),
        "email": "hello@tradewithjoreem.com",
        "founder": {"@id": person_id},
        "sameAs": ["https://t.me/tradewithjoreem"],
    }
    graph: list[dict] = [
        organization,
        {
            "@type": "WebSite",
            "@id": site_id,
            "url": absolute("/"),
            "name": "Trade with Joreem",
            "description": "Risk-first Forex, crypto and stock trading education.",
            "publisher": {"@id": org_id},
            "inLanguage": "en",
        },
        {
            "@type": "Person",
            "@id": person_id,
            "name": "Joreem",
            "url": absolute("/about"),
            "image": absolute("/img/joreem.jpg"),
            "jobTitle": "Founder and Trading Mentor",
            "worksFor": {"@id": org_id},
        },
    ]
    page_type = "ContactPage" if filename == "contact.html" else "AboutPage" if filename == "about.html" else "WebPage"
    webpage = {
        "@type": page_type,
        "@id": canonical + "#webpage",
        "url": canonical,
        "name": title,
        "description": description,
        "isPartOf": {"@id": site_id},
        "about": {"@id": org_id},
        "primaryImageOfPage": absolute("/img/trade-with-joreem-social.jpg"),
        "dateModified": MODIFIED,
        "inLanguage": "en",
    }
    if filename not in {"index.html", "login.html"}:
        breadcrumb_id = canonical + "#breadcrumb"
        webpage["breadcrumb"] = {"@id": breadcrumb_id}
        graph.append({
            "@type": "BreadcrumbList",
            "@id": breadcrumb_id,
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": absolute("/")},
                {"@type": "ListItem", "position": 2, "name": PAGES[filename]["label"], "item": canonical},
            ],
        })
    graph.append(webpage)

    if filename == "contact.html":
        organization["contactPoint"] = {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "hello@tradewithjoreem.com",
            "url": canonical,
            "availableLanguage": "English",
        }
    if filename == "mentorship.html":
        graph.append({
            "@type": "Service",
            "@id": canonical + "#service",
            "name": "Trade with Joreem Trading Mentorship",
            "serviceType": "Forex, crypto and stock trading education",
            "url": canonical,
            "provider": {"@id": org_id},
            "areaServed": "Worldwide",
            "description": description,
        })
    if filename == "bookstore.html":
        for slug, name, price, book_description in BOOKS:
            graph.append({
                "@type": "Book",
                "@id": canonical + "#book-" + slug,
                "name": name,
                "author": {"@id": person_id},
                "image": absolute(f"/assets/books/{slug}.jpg"),
                "description": book_description,
                "url": canonical + "#book-" + slug,
                "bookFormat": "https://schema.org/Paperback" if slug in {"forex-mastery", "psychology"} else "https://schema.org/EBook",
                "offers": {
                    "@type": "Offer",
                    "price": price,
                    "priceCurrency": "USD",
                    "availability": "https://schema.org/InStock",
                    "url": canonical + "#book-" + slug,
                },
            })
    if filename in {"index.html", "mentorship.html"}:
        faqs = []
        for item in soup.select("details.faq-item"):
            summary = item.find("summary")
            answer = item.select_one(".faq-body")
            if not summary or not answer:
                continue
            summary_copy = copy(summary)
            for span in summary_copy.find_all("span"):
                span.decompose()
            question = summary_copy.get_text(" ", strip=True)
            text = answer.get_text(" ", strip=True)
            if question and text:
                faqs.append({"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": text}})
        if faqs:
            graph.append({"@type": "FAQPage", "@id": canonical + "#faq", "mainEntity": faqs})
    return {"@context": "https://schema.org", "@graph": graph}


def add_breadcrumb(soup: BeautifulSoup, filename: str) -> None:
    if filename == "index.html":
        return
    existing = soup.select_one(".page-hero ol.breadcrumb")
    inserted = soup.select_one("nav.seo-breadcrumb-nav")
    if existing:
        if inserted and existing not in inserted.descendants:
            inserted.decompose()
        if not existing.find_parent("nav", attrs={"aria-label": "Breadcrumb"}):
            nav = soup.new_tag("nav", attrs={"aria-label": "Breadcrumb"})
            existing.wrap(nav)
        return
    if inserted:
        return
    h1 = soup.find("h1", class_="display-4")
    if not h1:
        return
    nav = soup.new_tag("nav", attrs={"class": "seo-breadcrumb-nav", "aria-label": "Breadcrumb"})
    ol = soup.new_tag("ol", attrs={"class": "seo-breadcrumb"})
    home = soup.new_tag("li")
    link = soup.new_tag("a", href="/")
    link.string = "Home"
    home.append(link)
    current = soup.new_tag("li", attrs={"aria-current": "page"})
    current.string = PAGES[filename]["label"]
    ol.extend([home, current])
    nav.append(ol)
    h1.insert_before(nav)


def optimize_headings(soup: BeautifulSoup, filename: str) -> None:
    for heading in list(soup.select(".navbar-brand h1")):
        heading.name = "span"
        classes = list(heading.get("class", []))
        if "brand-name" not in classes:
            classes.append("brand-name")
        heading["class"] = classes
    for heading in list(soup.select(".section-title h5")):
        heading.name = "p"
        classes = list(heading.get("class", []))
        if "section-kicker" not in classes:
            classes.append("section-kicker")
        heading["class"] = classes
    if filename == "login.html":
        auth_title = soup.select_one(".auth-brand h2")
        if auth_title:
            auth_title.name = "h1"
            auth_title["class"] = list(auth_title.get("class", [])) + ["h2"]
        login_title = soup.select_one(".logo-row h3")
        if login_title:
            login_title.name = "h2"
            login_title["class"] = list(login_title.get("class", [])) + ["h3"]
    targeted_levels = [
        (".risk-band h6", 2),
        (".cart-head h5", 2),
        ("h5.modal-title", 2),
        (".jnode h5", 3),
        (".tl-item h5", 3),
        (".wins-panel h4", 3),
        (".show-body h4", 3),
        (".book-body h4", 3),
        (".testimonial-grid h4", 3),
        (".dash-section-title h5", 4),
        (".video-body h6", 5),
    ]
    for selector, new_level in targeted_levels:
        for heading in list(soup.select(selector)):
            old_level = int(heading.name[1])
            heading.name = f"h{new_level}"
            classes = list(heading.get("class", []))
            if f"h{old_level}" not in classes:
                classes.append(f"h{old_level}")
            heading["class"] = classes

    # Keep a logical, non-skipping outline while preserving the original visual size.
    previous = 0
    for heading in soup.find_all(re.compile(r"^h[1-6]$")):
        level = int(heading.name[1])
        target = level
        if previous == 0:
            target = 1
        elif level > previous + 1:
            target = previous + 1
        if target != level:
            old = level
            heading.name = f"h{target}"
            classes = list(heading.get("class", []))
            if f"h{old}" not in classes:
                classes.append(f"h{old}")
            heading["class"] = classes
        previous = target


def add_main_landmark(soup: BeautifulSoup) -> None:
    main = soup.find("main")
    if main is None:
        h1 = soup.find("h1")
        footer = soup.select_one(".footer-main")
        if not h1 or not footer:
            raise ValueError("Cannot identify the main content boundaries")
        start = h1
        while start.parent is not soup.body:
            start = start.parent
        footer_start = footer
        while footer_start.parent is not soup.body:
            footer_start = footer_start.parent
        main = soup.new_tag("main")
        start.insert_before(main)
        node = start
        while node is not footer_start:
            following = node.next_sibling
            main.append(node.extract())
            node = following
    main["id"] = "main-content"
    main["tabindex"] = "-1"


def optimize_page(path: Path, dimensions: dict[str, tuple[int, int]], css_bundle: str, js_bundle: str) -> None:
    filename = path.name
    config = PAGES[filename]
    canonical = absolute("/" + config["slug"]) if config["slug"] else absolute("/")
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    soup.html["lang"] = "en"
    soup.body["id"] = "top"
    title = soup.head.find("title") or soup.new_tag("title")
    title.string = config["title"]
    if not title.parent:
        soup.head.insert(0, title)
    set_meta(soup, "name", "viewport", "width=device-width, initial-scale=1.0")
    set_meta(soup, "name", "description", config["description"])
    set_meta(soup, "name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1")
    set_meta(soup, "name", "theme-color", "#0A1220")
    set_meta(soup, "property", "og:type", "website")
    set_meta(soup, "property", "og:site_name", "Trade with Joreem")
    set_meta(soup, "property", "og:locale", "en_US")
    set_meta(soup, "property", "og:title", config["title"])
    set_meta(soup, "property", "og:description", config["description"])
    set_meta(soup, "property", "og:url", canonical)
    set_meta(soup, "property", "og:image", absolute("/img/trade-with-joreem-social.jpg"))
    set_meta(soup, "property", "og:image:secure_url", absolute("/img/trade-with-joreem-social.jpg"))
    set_meta(soup, "property", "og:image:type", "image/jpeg")
    set_meta(soup, "property", "og:image:width", "1200")
    set_meta(soup, "property", "og:image:height", "630")
    set_meta(soup, "property", "og:image:alt", "Trade with Joreem risk-first trading education")
    set_meta(soup, "name", "twitter:card", "summary_large_image")
    set_meta(soup, "name", "twitter:title", config["title"])
    set_meta(soup, "name", "twitter:description", config["description"])
    set_meta(soup, "name", "twitter:image", absolute("/img/trade-with-joreem-social.jpg"))
    set_meta(soup, "name", "twitter:image:alt", "Trade with Joreem risk-first trading education")
    set_link(soup, "canonical", canonical)

    # Self-host fonts, icons and core scripts to remove third-party render delays.
    font_links = [link for link in soup.head.find_all("link", href=True) if "fonts.googleapis.com/css2" in link["href"] or link["href"] == "/css/fonts.css"]
    if font_links:
        font_links[0]["href"] = "/css/fonts.css"
        for extra in font_links[1:]:
            extra.decompose()
    else:
        soup.head.append(soup.new_tag("link", rel="stylesheet", href="/css/fonts.css"))
    for link in list(soup.head.find_all("link", href=True)):
        href = link["href"]
        if "font-awesome" in href and "all.min.css" in href:
            link["href"] = "/assets/vendor/fontawesome/css/all.min.css"
        elif "bootstrap-icons" in href and href.endswith("bootstrap-icons.css"):
            link["href"] = "/assets/vendor/bootstrap-icons/bootstrap-icons.css"
        elif "preconnect" in link.get("rel", []) and any(host in href for host in ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "code.jquery.com"]):
            link.decompose()
    for script in soup.find_all("script", src=True):
        if "code.jquery.com/jquery-3.6.4" in script["src"]:
            script["src"] = "/lib/jquery/jquery-3.6.4.min.js"
        elif "cdn.jsdelivr.net/npm/bootstrap@5.0.0" in script["src"]:
            script["src"] = "/lib/bootstrap/bootstrap.bundle.min.js"

    css_link = None
    for link in list(soup.head.find_all("link", rel="stylesheet", href=True)):
        normalized = "/" + link["href"].lstrip("/")
        if normalized in CSS_SOURCES or re.fullmatch(r"/css/site\.[0-9a-f]{12}\.min\.css", normalized):
            if css_link is None:
                css_link = link
                link["href"] = css_bundle
            else:
                link.decompose()
    if css_link is None:
        soup.head.append(soup.new_tag("link", rel="stylesheet", href=css_bundle))
    js_script = None
    for script in list(soup.find_all("script", src=True)):
        normalized = "/" + script["src"].lstrip("/")
        if normalized in JS_SOURCES or re.fullmatch(r"/js/site\.[0-9a-f]{12}\.min\.js", normalized):
            if js_script is None:
                js_script = script
                script["src"] = js_bundle
            else:
                script.decompose()

    for font in ["oswald-latin-wght-normal", "poppins-latin-400-normal", "poppins-latin-500-normal", "poppins-latin-600-normal", "poppins-latin-700-normal"]:
        set_link(soup, "preload", f"/assets/fonts/{font}.woff2", as_="font", type="font/woff2", crossorigin="")
    if filename != "login.html":
        preload_attrs = {"as_": "image", "type": "image/webp", "fetchpriority": "high", "imagesrcset": "/img/hero-960.webp 960w, /img/hero.webp 1600w", "imagesizes": "100vw"}
        if filename == "index.html":
            preload_attrs["media"] = "(min-width: 992px)"
        set_link(soup, "preload", "/img/hero.webp", **preload_attrs)

    for script in soup.head.find_all("script", attrs={"type": "application/ld+json"}):
        script.decompose()
    schema_tag = soup.new_tag("script", type="application/ld+json")
    schema_tag.string = json.dumps(schema_for(filename, soup, canonical, config["title"], config["description"]), ensure_ascii=False, separators=(",", ":"))
    soup.head.append(schema_tag)

    spinner = soup.find(id="spinner")
    if spinner:
        spinner.decompose()
    if not soup.select_one("a.skip-link"):
        skip = soup.new_tag("a", href="#main-content", attrs={"class": "skip-link"})
        skip.string = "Skip to main content"
        soup.body.insert(0, skip)
    optimize_headings(soup, filename)
    h1s = soup.find_all("h1")
    if len(h1s) != 1:
        raise ValueError(f"{filename}: expected one H1 after normalization, found {len(h1s)}")
    h1s[0].attrs.pop("id", None)
    h1s[0].attrs.pop("tabindex", None)
    add_main_landmark(soup)
    add_breadcrumb(soup, filename)
    body_classes = list(soup.body.get("class", []))
    if soup.select_one(".page-hero"):
        if "has-page-hero" not in body_classes:
            body_classes.append("has-page-hero")
    else:
        body_classes = [item for item in body_classes if item != "has-page-hero"]
    soup.body["class"] = body_classes
    for nav in soup.find_all("nav", class_="navbar"):
        nav["aria-label"] = "Primary navigation"
    for toggler in soup.select(".navbar-toggler"):
        toggler["aria-label"] = "Toggle navigation"
        toggler["aria-controls"] = "navbarCollapse"
        toggler["aria-expanded"] = "false"
    for region in soup.select(".overflow-auto"):
        if region.find("table"):
            heading = region.find_previous(re.compile(r"^h[1-6]$"))
            label = heading.get_text(" ", strip=True) if heading else "Data table"
            region["tabindex"] = "0"
            region["role"] = "region"
            region["aria-label"] = f"{label} — scrollable table"
    for timeline in soup.select(".jpath"):
        heading = timeline.find_previous(re.compile(r"^h[1-6]$"))
        label = heading.get_text(" ", strip=True) if heading else "Learning journey"
        timeline["tabindex"] = "0"
        timeline["role"] = "region"
        timeline["aria-label"] = f"{label} — scrollable timeline"

    # Replace placeholder links with real destinations and useful on-page anchors.
    # Unverified social profiles are removed rather than replaced with guessed handles.
    for anchor in list(soup.find_all("a", href=True)):
        icon = anchor.find("i", class_=True)
        icon_classes = " ".join(icon.get("class", [])) if icon else ""
        if anchor["href"] == "#" and any("fa-" + network in icon_classes for network in PLACEHOLDER_SOCIAL):
            anchor.decompose()
            continue
        if anchor["href"] == "#":
            replacement = None
            if "back-to-top" in anchor.get("class", []):
                replacement = "#top"
            elif "Forgot password" in anchor.get_text():
                replacement = "/contact?topic=password-reset"
                anchor.attrs.pop("onclick", None)
            elif "Continue Learning" in anchor.get_text():
                replacement = "/member#curriculum"
            elif "View all" in anchor.get_text():
                replacement = "/member#latest-breakdowns"
            if replacement:
                anchor["href"] = replacement
        if anchor["href"].startswith(("https://", "http://")):
            anchor["target"] = "_blank"
            rel = set(anchor.get("rel", []))
            rel.update({"noopener", "noreferrer"})
            anchor["rel"] = sorted(rel)
        if "fa-telegram" in icon_classes:
            anchor["aria-label"] = "Telegram — Trade with Joreem"
        if "back-to-top" in anchor.get("class", []):
            anchor["aria-label"] = "Back to top"
        anchor["href"] = local_root_url(anchor["href"], filename)

    for tag, attr in [(tag, attr) for tag, attrs in [("link", ["href"]), ("script", ["src"]), ("img", ["src"]), ("source", ["src"])] for attr in attrs]:
        for element in soup.find_all(tag):
            if element.get(attr):
                element[attr] = local_root_url(element[attr], filename)

    for image in soup.find_all("img"):
        source = image.get("src", "")
        if source.endswith(".jpg") and (ROOT / (source[:-4] + ".webp").lstrip("/")).is_file():
            source = source[:-4] + ".webp"
            image["src"] = source
        stem = Path(source).stem
        if stem in IMAGE_ALTS:
            image["alt"] = IMAGE_ALTS[stem]
        elif not image.get("alt"):
            image["alt"] = "Trade with Joreem educational resource"
        if Path(source).name in dimensions:
            image["width"], image["height"] = map(str, dimensions[Path(source).name])
        image["loading"] = "lazy"
        image["decoding"] = "async"
        if stem == "joreem":
            image["srcset"] = "/img/joreem-320.webp 320w, /img/joreem.webp 640w"
            image["sizes"] = "(max-width: 767px) 90vw, 640px"
        elif (ROOT / "assets/books" / f"{stem}-480.webp").exists():
            original_width = dimensions[f"{stem}.webp"][0]
            image["srcset"] = f"/assets/books/{stem}-480.webp 480w, /assets/books/{stem}.webp {original_width}w"
            image["sizes"] = "(max-width: 767px) 90vw, 260px"

    for input_tag in soup.select('.footer-about input[type="email"]'):
        input_tag["aria-label"] = "Email address for weekly market notes"
        input_tag["name"] = "email"
        input_tag["autocomplete"] = "email"
    for counter in soup.select("[data-count-to]"):
        try:
            final_number = f"{int(float(counter.get('data-count-to', '0'))):,}"
        except ValueError:
            continue
        final_text = counter.get("data-prefix", "") + final_number + counter.get("data-suffix", "")
        styles = re.sub(r"display\s*:\s*inline-block\s*;?|min-width\s*:\s*\d+ch\s*;?", "", counter.get("style", "")).strip(";")
        counter["style"] = (styles + ";" if styles else "") + f"display:inline-block;min-width:{max(1, len(final_text))}ch"
    for section in soup.select(".dash-section-title"):
        text = section.get_text(" ", strip=True)
        if "Latest Live Breakdowns" in text:
            section["id"] = "latest-breakdowns"
        elif "Your Curriculum" in text:
            section["id"] = "curriculum"
        elif "Resources" in text:
            section["id"] = "resources"
        elif "Private Community" in text:
            section["id"] = "community"
    if filename == "bookstore.html":
        for slug, name, _, _ in BOOKS:
            heading = next((h for h in soup.find_all("h3") if h.get_text(" ", strip=True) == name), None)
            if heading:
                card = heading.find_parent(class_="col-lg-6")
                if card:
                    card["id"] = "book-" + slug

    path.write_text(str(soup), encoding="utf-8")


def build_bundles() -> tuple[str, str]:
    """Build cache-busted, minified site assets without changing source files."""
    css_parts = []
    for public_path in CSS_SOURCES:
        source = ROOT / public_path.lstrip("/")
        text = source.read_text(encoding="utf-8")
        text = re.sub(r"/\*# sourceMappingURL=.*?\*/", "", text, flags=re.S)

        def absolute_css_url(match: re.Match) -> str:
            quote, value = match.group(1), match.group(2).strip()
            if value.startswith(("data:", "http://", "https://", "/", "#")):
                return match.group(0)
            parts = urlsplit(value)
            try:
                resolved = (source.parent / parts.path).resolve().relative_to(ROOT)
            except (ValueError, OSError):
                return match.group(0)
            rebased = "/" + resolved.as_posix()
            if parts.query:
                rebased += "?" + parts.query
            if parts.fragment:
                rebased += "#" + parts.fragment
            return f"url({quote}{rebased}{quote})"

        css_parts.append(re.sub(r"url\(\s*(['\"]?)([^)'\"]+)\1\s*\)", absolute_css_url, text))
    css = cssmin("\n".join(css_parts))
    css_name = f"site.{hashlib.sha256(css.encode('utf-8')).hexdigest()[:12]}.min.css"
    for old in (ROOT / "css").glob("site.*.min.css"):
        if old.name != css_name:
            old.unlink()
    (ROOT / "css" / css_name).write_text(css, encoding="utf-8")

    js_parts = []
    for public_path in JS_SOURCES:
        source = ROOT / public_path.lstrip("/")
        text = source.read_text(encoding="utf-8")
        text = re.sub(r"^//# sourceMappingURL=.*$", "", text, flags=re.M)
        if public_path.startswith("/js/"):
            text = jsmin(text)
        js_parts.append(text.rstrip(";") + ";")
    js = "\n".join(js_parts)
    js_name = f"site.{hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]}.min.js"
    for old in (ROOT / "js").glob("site.*.min.js"):
        if old.name != js_name:
            old.unlink()
    (ROOT / "js" / js_name).write_text(js, encoding="utf-8")
    return "/css/" + css_name, "/js/" + js_name


def update_css() -> None:
    replacements = [
        ("navbar-brand h1", "navbar-brand .brand-name"),
        (".footer-main h1", ".footer-main .brand-name"),
        ("footer h1", "footer .brand-name"),
        (".footer h1", ".footer .brand-name"),
        (".section-title h5", ".section-title .section-kicker"),
        (".dash-section-title .section-kicker", ".dash-section-title h4"),
        ("auth-brand h2", "auth-brand h1"),
        ("book-body h4", "book-body h3"),
        ("risk-band h6", "risk-band h2"),
        ("risk-inner h6", "risk-inner h2"),
        ("cart-head h5", "cart-head h2"),
        ("video-body h6", "video-body h5"),
        ("dash-section-title h5", "dash-section-title h4"),
        ("wins-panel h4", "wins-panel h3"),
        ("jnode h5", "jnode h3"),
        ("tl-item h5", "tl-item h3"),
        ("show-body h4", "show-body h3"),
        ("testimonial-grid h4", "testimonial-grid h3"),
    ]
    for path in (ROOT / "css").glob("*.css"):
        if path.name == "bootstrap.min.css" or path.name.startswith("site."):
            continue
        text = path.read_text(encoding="utf-8")
        for old, new in replacements:
            text = text.replace(old, new)
        text = text.replace("../img/hero.jpg", "../img/hero.webp")
        path.write_text(text, encoding="utf-8")
    for path in [ROOT / "js/trading.js"]:
        text = path.read_text(encoding="utf-8")
        text = text.replace('"member.html"', '"/member"').replace('"login.html"', '"/login"')
        text = text.replace('"assets/books/', '"/assets/books/').replace('.jpg"', '.webp"')
        path.write_text(text, encoding="utf-8")


def write_discovery_files() -> None:
    from xml.etree.ElementTree import Element, SubElement, ElementTree, indent
    urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for config in PAGES.values():
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = absolute("/" + config["slug"]) if config["slug"] else absolute("/")
        SubElement(url, "lastmod").text = MODIFIED
    tree = ElementTree(urlset)
    indent(tree, space="  ")
    tree.write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {absolute('/sitemap.xml')}\n", encoding="utf-8")
    lines = [
        "# Trade with Joreem",
        "",
        "> Risk-first Forex, crypto and stock trading education from Joreem, including live market breakdowns, structured lessons, practical books and a global member community.",
        "",
        "## Main pages",
        f"- [Home]({absolute('/')}): Overview of mentorship, trading books, student resources and community.",
        f"- [About Joreem]({absolute('/about')}): Joreem's background, teaching method and trading milestones.",
        f"- [Mentorship]({absolute('/mentorship')}): Membership options, curriculum, live breakdowns, payments and FAQs.",
        f"- [Bookstore]({absolute('/bookstore')}): Forex, crypto, psychology and stock-trading books.",
        f"- [Contact]({absolute('/contact')}): Email, Telegram and support contact details.",
        "",
        "## Member pages",
        f"- [Member login]({absolute('/login')}): Sign in to the learning dashboard.",
        f"- [Member dashboard]({absolute('/member')}): Lessons, breakdowns, progress and resources for members.",
        "",
        "## Policies",
        f"- [Risk disclaimer]({absolute('/risk')}): Educational-use limits and financial risk information.",
        f"- [Terms of service]({absolute('/terms')}): Account, payment, refund and service terms.",
        f"- [Privacy policy]({absolute('/privacy')}): Data collection, use, protection and privacy rights.",
        "",
        "## Important context",
        "- Trade with Joreem provides education, not personalized financial advice or guaranteed returns.",
        "- Trading Forex, crypto and stocks involves substantial risk of loss.",
        "- Support: hello@tradewithjoreem.com and https://t.me/tradewithjoreem",
        f"- Canonical website: {absolute('/')}",
        "",
    ]
    (ROOT / "llms.txt").write_text("\n".join(lines), encoding="utf-8")
    redirects = [{"source": "/index.html", "destination": "/", "permanent": True}] + [
        {"source": f"/{name}", "destination": "/" + config["slug"], "permanent": True}
        for name, config in PAGES.items() if config["slug"]
    ]
    config = {
        "cleanUrls": True,
        "trailingSlash": False,
        "redirects": redirects,
        "headers": [
            {
                "source": "/(.*)",
                "headers": [
                    {"key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains"},
                    {"key": "X-Content-Type-Options", "value": "nosniff"},
                    {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                    {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"},
                ],
            },
            {"source": "/img/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "/assets/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "/css/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "/js/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "/lib/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        ],
    }
    (ROOT / "vercel.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    dimensions = build_images()
    update_css()
    css_bundle, js_bundle = build_bundles()
    for filename in PAGES:
        optimize_page(ROOT / filename, dimensions, css_bundle, js_bundle)
    write_discovery_files()
    print(f"Optimized {len(PAGES)} pages; generated responsive images, metadata, discovery files and cache-busted bundles {css_bundle} and {js_bundle}.")


if __name__ == "__main__":
    main()
