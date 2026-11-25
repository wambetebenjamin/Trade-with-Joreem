#!/usr/bin/env python3
"""Build the three Trade with Joreem PowerPoint decks and matching PDF editions."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from tools.course_content import COURSES
from tools.deck_engine import build_course

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "Green Red and Black Modern Forex Trading Company Presentation_20261101_162544_0000.pptx"
OUTPUT = ROOT / "presentations"
COLLECTION_ZIP = OUTPUT / "Trade_with_Joreem_Complete_Collection.zip"


def build_collection_zip():
    names = [item for course in COURSES for item in (course["slug"] + ".pptx", course["slug"] + ".pdf")]
    names += ["README.md", "IMAGE_CREDITS.md"]
    with ZipFile(COLLECTION_ZIP, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for name in names:
            archive.write(OUTPUT / name, arcname=name)
    with ZipFile(COLLECTION_ZIP) as archive:
        if archive.testzip() is not None or len(archive.namelist()) != 8:
            raise RuntimeError("Collection ZIP failed its integrity check")
    return COLLECTION_ZIP


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
    archive = build_collection_zip()
    print(f"  {archive.relative_to(ROOT)}  {archive.stat().st_size / 1024 / 1024:.2f} MB (8 files)")


if __name__ == "__main__":
    main()
