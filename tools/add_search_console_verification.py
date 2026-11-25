"""Add a genuine Google Search Console HTML verification token to the homepage."""
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("token", help="The content value supplied by Google Search Console")
    args = parser.parse_args()
    token = args.token.strip()
    if len(token) < 10 or re.search(r"[\s<>\"'&]", token):
        parser.error("Provide the exact verification token without whitespace or HTML characters.")
    text = INDEX.read_text(encoding="utf-8")
    tag = f'<meta content="{html.escape(token)}" name="google-site-verification"/>'
    pattern = re.compile(r'<meta\b[^>]*name=["\']google-site-verification["\'][^>]*/?>', re.I)
    reverse_pattern = re.compile(r'<meta\b[^>]*content=["\'][^"\']+["\'][^>]*name=["\']google-site-verification["\'][^>]*/?>', re.I)
    if pattern.search(text):
        text = pattern.sub(tag, text, count=1)
    elif reverse_pattern.search(text):
        text = reverse_pattern.sub(tag, text, count=1)
    else:
        text = text.replace("</head>", tag + "\n</head>", 1)
    INDEX.write_text(text, encoding="utf-8")
    print("Added the supplied Search Console token to index.html. Deploy the production site before clicking Verify in Google Search Console.")


if __name__ == "__main__":
    main()
