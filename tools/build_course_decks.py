#!/usr/bin/env python3
"""Build the three Trade with Joreem PowerPoint decks and matching PDF editions."""

from pathlib import Path

from tools.course_content import COURSES
from tools.deck_engine import build_course

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "Green Red and Black Modern Forex Trading Company Presentation_20261101_162544_0000.pptx"
OUTPUT = ROOT / "presentations"


def main():
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Missing supplied template: {TEMPLATE}")
    for course in COURSES:
        for key, path in course["assets"].items():
            if not Path(path).exists():
                raise FileNotFoundError(f"Missing {key} image: {path}")
        print(f"Building {course['title']} ({len(course['slides'])} slides)...", flush=True)
        pptx, pdf = build_course(course, TEMPLATE, OUTPUT)
        print(f"  {pptx.relative_to(ROOT)}  {pptx.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"  {pdf.relative_to(ROOT)}  {pdf.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
