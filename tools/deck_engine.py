from __future__ import annotations

import hashlib
import math
import os
import struct
import zipfile
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

PAGE_W = 20.0
PAGE_H = 11.25
PT_PER_IN = 72.0

COLORS = {
    "bg": "#070A09",
    "bg2": "#0B100E",
    "panel": "#111715",
    "panel2": "#191818",
    "grid": "#28332E",
    "white": "#F5F7F6",
    "muted": "#A6AAA8",
    "dim": "#6F7873",
    "green": "#33CC33",
    "green2": "#00BC00",
    "green_dark": "#123D26",
    "green_deep": "#0C2519",
    "red": "#ED1C24",
    "red_dark": "#42171B",
    "red_deep": "#280F12",
    "amber": "#E6A93D",
    "amber_dark": "#3D3018",
}

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".work" / "course_decks"
FONT_DIR = WORK / "fonts"
IMAGE_DIR = WORK / "images"
DISPLAY_DIR = WORK / "display_text"
for directory in (WORK, FONT_DIR, IMAGE_DIR, DISPLAY_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def rgb(value: str) -> tuple[int, int, int]:
    value = COLORS.get(value, value).lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def ppt_rgb(value: str) -> RGBColor:
    return RGBColor(*rgb(value))


def extract_template_fonts(template: Path) -> dict[str, Path]:
    """Extract the template's embedded EOT-wrapped fonts for matching PDF output."""
    outputs = {
        "display": FONT_DIR / "Kitchakan.otf",
        "regular": FONT_DIR / "Inter-Regular.ttf",
        "bold": FONT_DIR / "Inter-Bold.ttf",
        "semibold": FONT_DIR / "Inter-SemiBold.ttf",
    }
    if all(path.exists() for path in outputs.values()):
        return outputs
    members = {
        "display": "ppt/fonts/font16.fntdata",
        "regular": "ppt/fonts/font17.fntdata",
        "bold": "ppt/fonts/font18.fntdata",
        "semibold": "ppt/fonts/font19.fntdata",
    }
    with zipfile.ZipFile(template) as archive:
        for key, member in members.items():
            data = archive.read(member)
            eot_size, font_size = struct.unpack_from("<II", data)
            if eot_size != len(data) or not 0 < font_size <= len(data):
                raise ValueError(f"Unexpected embedded font format: {member}")
            font_data = data[-font_size:]
            if font_data[:4] not in (b"OTTO", b"\x00\x01\x00\x00"):
                raise ValueError(f"Unsupported embedded font data: {member}")
            outputs[key].write_bytes(font_data)
    return outputs


def register_pdf_fonts(fonts: dict[str, Path]) -> None:
    for name, key in (("Inter", "regular"), ("InterBold", "bold"), ("InterSemiBold", "semibold")):
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, str(fonts[key])))


class FontBook:
    def __init__(self, fonts: dict[str, Path]):
        self.paths = fonts
        self._cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}

    def pil(self, family: str, size: float) -> ImageFont.FreeTypeFont:
        key = (family, max(1, int(round(size))))
        if key not in self._cache:
            self._cache[key] = ImageFont.truetype(str(self.paths[family]), key[1])
        return self._cache[key]

    def measure(self, text: str, family: str, size: float) -> float:
        return self.pil(family, size).getlength(text)

    def wrap(self, text: str, width_in: float, family: str, size: float) -> list[str]:
        max_width = width_in * PT_PER_IN
        output: list[str] = []
        for paragraph in str(text).split("\n"):
            paragraph = paragraph.strip()
            if not paragraph:
                output.append("")
                continue
            words = paragraph.split()
            line = words[0]
            for word in words[1:]:
                candidate = f"{line} {word}"
                if self.measure(candidate, family, size) <= max_width:
                    line = candidate
                else:
                    output.append(line)
                    line = word
            output.append(line)
        return output

    def layout(
        self,
        text: str,
        width_in: float,
        height_in: float,
        family: str,
        size: float,
        min_size: float,
        leading: float,
    ) -> tuple[list[str], float]:
        chosen = size
        lines: list[str] = []
        while chosen >= min_size:
            lines = self.wrap(text, width_in, family, chosen)
            if len(lines) * chosen * leading <= height_in * PT_PER_IN + 0.5:
                break
            chosen -= 1
        return lines, max(chosen, min_size)


class Backend:
    kind = "base"

    def __init__(self, fonts: dict[str, Path]):
        self.fonts = FontBook(fonts)

    def rect(self, x, y, w, h, fill="panel", line=None, line_width=1.0, radius=0.0):
        raise NotImplementedError

    def circle(self, x, y, d, fill="green", line=None, line_width=1.0):
        raise NotImplementedError

    def line(self, x1, y1, x2, y2, color="grid", width=1.0, dash=False):
        raise NotImplementedError

    def polygon(self, points, fill="green", line=None, line_width=1.0):
        raise NotImplementedError

    def image(self, path, x, y, w, h, focus=(0.5, 0.5), darken=0.0):
        raise NotImplementedError

    def text(
        self,
        x,
        y,
        w,
        h,
        text,
        size=22,
        color="white",
        family="regular",
        align="left",
        valign="top",
        leading=1.18,
        min_size=None,
    ):
        raise NotImplementedError

    def arrow(self, x1, y1, x2, y2, color="green", width=2.0, head=0.16):
        self.line(x1, y1, x2, y2, color, width)
        angle = math.atan2(y2 - y1, x2 - x1)
        left = (
            x2 - head * math.cos(angle) + head * 0.58 * math.sin(angle),
            y2 - head * math.sin(angle) - head * 0.58 * math.cos(angle),
        )
        right = (
            x2 - head * math.cos(angle) - head * 0.58 * math.sin(angle),
            y2 - head * math.sin(angle) + head * 0.58 * math.cos(angle),
        )
        self.polygon([(x2, y2), left, right], fill=color)

    def check(self, x, y, scale=1.0, color="green", width=2.5):
        self.line(x, y + 0.12 * scale, x + 0.12 * scale, y + 0.24 * scale, color, width)
        self.line(x + 0.12 * scale, y + 0.24 * scale, x + 0.38 * scale, y, color, width)

    def cross(self, x, y, scale=1.0, color="red", width=2.0):
        self.line(x, y, x + 0.26 * scale, y + 0.26 * scale, color, width)
        self.line(x + 0.26 * scale, y, x, y + 0.26 * scale, color, width)


class PPTBackend(Backend):
    kind = "ppt"

    def __init__(self, slide, fonts):
        super().__init__(fonts)
        self.slide = slide

    def rect(self, x, y, w, h, fill="panel", line=None, line_width=1.0, radius=0.0):
        shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
        shape = self.slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
        if radius:
            try:
                shape.adjustments[0] = min(0.25, radius)
            except Exception:
                pass
        if fill is None:
            shape.fill.background()
        else:
            shape.fill.solid()
            shape.fill.fore_color.rgb = ppt_rgb(fill)
        if line is None:
            shape.line.fill.background()
        else:
            shape.line.color.rgb = ppt_rgb(line)
            shape.line.width = Pt(line_width)
        return shape

    def circle(self, x, y, d, fill="green", line=None, line_width=1.0):
        shape = self.slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
        if fill is None:
            shape.fill.background()
        else:
            shape.fill.solid()
            shape.fill.fore_color.rgb = ppt_rgb(fill)
        if line is None:
            shape.line.fill.background()
        else:
            shape.line.color.rgb = ppt_rgb(line)
            shape.line.width = Pt(line_width)
        return shape

    def line(self, x1, y1, x2, y2, color="grid", width=1.0, dash=False):
        shape = self.slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2)
        )
        shape.line.color.rgb = ppt_rgb(color)
        shape.line.width = Pt(width)
        if dash:
            shape.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        return shape

    def polygon(self, points, fill="green", line=None, line_width=1.0):
        min_x = min(point[0] for point in points)
        min_y = min(point[1] for point in points)
        local = [((x - min_x) * 1000, (y - min_y) * 1000) for x, y in points]
        builder = self.slide.shapes.build_freeform(local[0][0], local[0][1], scale=Inches(1) / 1000)
        builder.add_line_segments(local[1:], close=True)
        shape = builder.convert_to_shape(Inches(min_x), Inches(min_y))
        if fill is None:
            shape.fill.background()
        else:
            shape.fill.solid()
            shape.fill.fore_color.rgb = ppt_rgb(fill)
        if line is None:
            shape.line.fill.background()
        else:
            shape.line.color.rgb = ppt_rgb(line)
            shape.line.width = Pt(line_width)
        return shape

    def image(self, path, x, y, w, h, focus=(0.5, 0.5), darken=0.0):
        prepared = prepare_image(Path(path), w / h, focus, darken)
        return self.slide.shapes.add_picture(str(prepared), Inches(x), Inches(y), Inches(w), Inches(h))

    def text(
        self,
        x,
        y,
        w,
        h,
        text,
        size=22,
        color="white",
        family="regular",
        align="left",
        valign="top",
        leading=1.18,
        min_size=None,
    ):
        lines, chosen = self.fonts.layout(
            str(text), w, h, family, size, min_size or max(10, size * 0.65), leading
        )
        box = self.slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        frame = box.text_frame
        frame.clear()
        frame.word_wrap = False
        frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
        frame.vertical_anchor = {
            "top": MSO_ANCHOR.TOP,
            "middle": MSO_ANCHOR.MIDDLE,
            "bottom": MSO_ANCHOR.BOTTOM,
        }[valign]
        font_name = {"display": "Kitchakan", "regular": "Inter", "bold": "Inter Bold", "semibold": "Inter Semi-Bold"}[family]
        for index, line_text in enumerate(lines):
            paragraph = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
            paragraph.text = line_text
            paragraph.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[align]
            paragraph.space_before = Pt(0)
            paragraph.space_after = Pt(0)
            paragraph.line_spacing = leading
            for run in paragraph.runs:
                run.font.name = font_name
                run.font.size = Pt(chosen)
                run.font.bold = family in ("bold", "semibold")
                run.font.color.rgb = ppt_rgb(color)
        return box


class PDFBackend(Backend):
    kind = "pdf"

    def __init__(self, pdf_canvas, fonts):
        super().__init__(fonts)
        self.canvas = pdf_canvas
        self.page_height = PAGE_H * PT_PER_IN

    def _fill(self, color):
        self.canvas.setFillColorRGB(*(value / 255 for value in rgb(color)))

    def _stroke(self, color):
        self.canvas.setStrokeColorRGB(*(value / 255 for value in rgb(color)))

    def rect(self, x, y, w, h, fill="panel", line=None, line_width=1.0, radius=0.0):
        c = self.canvas
        c.saveState()
        if fill is not None:
            self._fill(fill)
        if line is not None:
            self._stroke(line)
            c.setLineWidth(line_width)
        y_pdf = self.page_height - (y + h) * PT_PER_IN
        if radius:
            c.roundRect(x * PT_PER_IN, y_pdf, w * PT_PER_IN, h * PT_PER_IN, min(radius * 12, 8), stroke=int(line is not None), fill=int(fill is not None))
        else:
            c.rect(x * PT_PER_IN, y_pdf, w * PT_PER_IN, h * PT_PER_IN, stroke=int(line is not None), fill=int(fill is not None))
        c.restoreState()

    def circle(self, x, y, d, fill="green", line=None, line_width=1.0):
        c = self.canvas
        c.saveState()
        if fill is not None:
            self._fill(fill)
        if line is not None:
            self._stroke(line)
            c.setLineWidth(line_width)
        c.circle((x + d / 2) * PT_PER_IN, self.page_height - (y + d / 2) * PT_PER_IN, d / 2 * PT_PER_IN, stroke=int(line is not None), fill=int(fill is not None))
        c.restoreState()

    def line(self, x1, y1, x2, y2, color="grid", width=1.0, dash=False):
        c = self.canvas
        c.saveState()
        self._stroke(color)
        c.setLineWidth(width)
        if dash:
            c.setDash(5, 4)
        c.line(x1 * PT_PER_IN, self.page_height - y1 * PT_PER_IN, x2 * PT_PER_IN, self.page_height - y2 * PT_PER_IN)
        c.restoreState()

    def polygon(self, points, fill="green", line=None, line_width=1.0):
        c = self.canvas
        c.saveState()
        if fill is not None:
            self._fill(fill)
        if line is not None:
            self._stroke(line)
            c.setLineWidth(line_width)
        path = c.beginPath()
        path.moveTo(points[0][0] * PT_PER_IN, self.page_height - points[0][1] * PT_PER_IN)
        for x, y in points[1:]:
            path.lineTo(x * PT_PER_IN, self.page_height - y * PT_PER_IN)
        path.close()
        c.drawPath(path, stroke=int(line is not None), fill=int(fill is not None))
        c.restoreState()

    def image(self, path, x, y, w, h, focus=(0.5, 0.5), darken=0.0):
        prepared = prepare_image(Path(path), w / h, focus, darken)
        self.canvas.drawImage(
            str(prepared),
            x * PT_PER_IN,
            self.page_height - (y + h) * PT_PER_IN,
            w * PT_PER_IN,
            h * PT_PER_IN,
            preserveAspectRatio=False,
            mask="auto",
        )

    def _display_text_image(self, lines, w, h, size, color, align, leading):
        signature = repr((lines, w, h, size, color, align, leading)).encode("utf-8")
        path = DISPLAY_DIR / f"{hashlib.sha1(signature).hexdigest()}.png"
        if path.exists():
            return path
        scale = 2
        width_px = max(2, int(math.ceil(w * PT_PER_IN * scale)))
        height_px = max(2, int(math.ceil(h * PT_PER_IN * scale)))
        image = Image.new("RGBA", (width_px, height_px), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        font = self.fonts.pil("display", size * scale)
        line_height = size * leading * scale
        for index, line_text in enumerate(lines):
            line_width = draw.textlength(line_text, font=font)
            if align == "center":
                x_pos = (width_px - line_width) / 2
            elif align == "right":
                x_pos = width_px - line_width
            else:
                x_pos = 0
            draw.text((x_pos, index * line_height), line_text, font=font, fill=(*rgb(color), 255), anchor="lt")
        image.save(path, optimize=True)
        return path

    def text(
        self,
        x,
        y,
        w,
        h,
        text,
        size=22,
        color="white",
        family="regular",
        align="left",
        valign="top",
        leading=1.18,
        min_size=None,
    ):
        lines, chosen = self.fonts.layout(
            str(text), w, h, family, size, min_size or max(10, size * 0.65), leading
        )
        content_height = len(lines) * chosen * leading / PT_PER_IN
        y_start = y
        if valign == "middle":
            y_start = y + max(0, (h - content_height) / 2)
        elif valign == "bottom":
            y_start = y + max(0, h - content_height)
        if family == "display":
            path = self._display_text_image(lines, w, content_height + 0.05, chosen, color, align, leading)
            self.canvas.drawImage(
                str(path),
                x * PT_PER_IN,
                self.page_height - (y_start + content_height + 0.05) * PT_PER_IN,
                w * PT_PER_IN,
                (content_height + 0.05) * PT_PER_IN,
                preserveAspectRatio=False,
                mask="auto",
            )
            return
        c = self.canvas
        c.saveState()
        self._fill(color)
        pdf_family = {"regular": "Inter", "bold": "InterBold", "semibold": "InterSemiBold"}[family]
        c.setFont(pdf_family, chosen)
        ascent = pdfmetrics.getAscent(pdf_family) / 1000 * chosen
        for index, line_text in enumerate(lines):
            top = (y_start * PT_PER_IN) + index * chosen * leading
            baseline = self.page_height - top - ascent
            if align == "center":
                c.drawCentredString((x + w / 2) * PT_PER_IN, baseline, line_text)
            elif align == "right":
                c.drawRightString((x + w) * PT_PER_IN, baseline, line_text)
            else:
                c.drawString(x * PT_PER_IN, baseline, line_text)
        c.restoreState()


def prepare_image(path: Path, aspect: float, focus=(0.5, 0.5), darken=0.0) -> Path:
    signature = f"{path.resolve()}|{path.stat().st_mtime_ns}|{aspect:.5f}|{focus}|{darken}".encode()
    output = IMAGE_DIR / f"{path.stem}_{hashlib.sha1(signature).hexdigest()[:16]}.jpg"
    if output.exists():
        return output
    image = Image.open(path).convert("RGB")
    width = 1600
    height = max(200, int(round(width / aspect)))
    if height > 1600:
        height = 1600
        width = max(200, int(round(height * aspect)))
    image = ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS, centering=focus)
    if darken:
        overlay = Image.new("RGB", image.size, rgb("bg"))
        image = Image.blend(image, overlay, darken)
    image.save(output, quality=88, optimize=True, progressive=True)
    return output


def add_brand_mark(b: Backend, x=1.1, y=0.54):
    # A compact candlestick signature derived from the template's red/green palette.
    b.line(x + 0.08, y + 0.02, x + 0.08, y + 0.42, "green", 1.4)
    b.rect(x + 0.02, y + 0.12, 0.12, 0.18, "green")
    b.line(x + 0.28, y + 0.09, x + 0.28, y + 0.50, "red", 1.4)
    b.rect(x + 0.22, y + 0.20, 0.12, 0.18, "red")
    b.line(x + 0.48, y, x + 0.48, y + 0.36, "green", 1.4)
    b.rect(x + 0.42, y + 0.08, 0.12, 0.18, "green")
    b.text(x + 0.68, y + 0.02, 3.9, 0.34, "TRADE WITH JOREEM", 17, "white", "bold", min_size=15)


def base_slide(b: Backend, data: dict, index: int, total: int, course_label: str):
    b.rect(0, 0, PAGE_W, PAGE_H, "bg")
    # Angular edge accents echo the supplied modern Forex template.
    b.polygon([(0, 0), (3.4, 0), (1.8, 0.18), (0, 0.18)], "green_dark")
    b.polygon([(20, 11.25), (17.8, 11.25), (19.25, 10.98), (20, 10.98)], "red_dark")
    add_brand_mark(b)
    b.text(14.0, 0.56, 4.9, 0.32, course_label.upper(), 14, "muted", "semibold", "right", min_size=12)
    b.line(1.1, 1.13, 18.9, 1.13, "grid", 0.8)
    b.line(1.1, 10.54, 18.9, 10.54, "grid", 0.8)
    b.text(1.1, 10.72, 8.0, 0.25, "EDUCATIONAL • ILLUSTRATIVE EXAMPLES • NOT FINANCIAL ADVICE", 10.5, "dim", "regular", min_size=10)
    b.text(17.2, 10.68, 1.7, 0.28, f"{index:02d} / {total:02d}", 12, "muted", "semibold", "right", min_size=11)


def add_title(b: Backend, data: dict):
    b.text(1.1, 1.46, 17.8, 0.88, data["title"], data.get("title_size", 58), data.get("title_color", "white"), "display", min_size=40, leading=1.0)
    if data.get("subtitle"):
        b.text(1.12, 2.30, 17.2, 0.43, data["subtitle"], 20, "muted", "regular", min_size=17)


def bullet_stack(b: Backend, items: Sequence, x: float, y: float, w: float, h: float, accent="green"):
    if not items:
        return
    row_h = h / len(items)
    for i, item in enumerate(items):
        if isinstance(item, str):
            head, body = "", item
        else:
            head = item.get("head", "")
            body = item.get("body", item.get("text", ""))
        yy = y + i * row_h
        b.circle(x, yy + 0.08, 0.30, accent if i % 2 == 0 else ("red" if accent == "green" else accent))
        b.text(x + 0.02, yy + 0.065, 0.26, 0.23, f"{i + 1}", 11, "bg", "bold", "center", min_size=10)
        if head:
            b.text(x + 0.52, yy, w - 0.52, 0.36, head, 22, "white", "bold", min_size=18)
            b.text(x + 0.52, yy + 0.43, w - 0.52, row_h - 0.48, body, 17.5, "muted", "regular", min_size=15)
        else:
            b.text(x + 0.52, yy + 0.02, w - 0.52, row_h - 0.08, body, 19, "muted", "regular", min_size=16)


def callout(b: Backend, text: str, x=1.1, y=9.35, w=17.8, h=0.72, color="green", label="KEY TAKEAWAY"):
    b.rect(x, y, w, h, "panel", "grid", 0.8, 0.08)
    b.rect(x, y, 0.10, h, color)
    b.text(x + 0.30, y + 0.13, 1.85, 0.26, label, 12, color, "bold", min_size=11)
    b.text(x + 2.15, y + 0.10, w - 2.42, h - 0.16, text, 18, "white", "regular", min_size=15, valign="middle")


def diagram(b: Backend, name: str, x: float, y: float, w: float, h: float, **kwargs):
    from tools.deck_diagrams import draw_diagram

    draw_diagram(b, name, x, y, w, h, **kwargs)


def render_slide(b: Backend, data: dict, index: int, total: int, course: dict):
    kind = data["type"]
    if kind == "cover":
        render_cover(b, data, index, total, course)
        return
    if kind == "closing":
        render_closing(b, data, index, total, course)
        return
    base_slide(b, data, index, total, course["short"])
    add_title(b, data)
    if kind == "roadmap":
        items = data["items"]
        gap = 0.28
        card_w = (17.8 - gap * (len(items) - 1)) / len(items)
        for i, item in enumerate(items):
            x = 1.1 + i * (card_w + gap)
            accent = "green" if i % 2 == 0 else "red"
            b.rect(x, 3.02, card_w, 5.82, "panel", "grid", 0.8, 0.08)
            b.rect(x, 3.02, card_w, 0.08, accent)
            b.text(x + 0.30, 3.36, card_w - 0.60, 0.72, f"{i + 1:02d}", 48, accent, "display", min_size=42)
            b.text(x + 0.30, 4.40, card_w - 0.60, 1.08, item["title"], 27, "white", "bold", min_size=22)
            b.text(x + 0.30, 5.65, card_w - 0.60, 2.15, item["body"], 18, "muted", "regular", min_size=16)
            b.text(x + 0.30, 8.15, card_w - 0.60, 0.30, item.get("tag", "LEARN • APPLY • REVIEW"), 11, accent, "bold", min_size=10)
        callout(b, data["callout"], y=9.25)
    elif kind == "section":
        b.text(1.05, 2.78, 2.8, 1.60, data.get("number", f"{index:02d}"), 116, "green_dark", "display", min_size=100)
        b.text(1.10, 4.15, 8.9, 0.36, data.get("kicker", "COURSE SECTION"), 15, "green", "bold", min_size=13)
        b.text(1.10, 4.66, 9.15, 0.95, data.get("headline", data["title"]), 45, "white", "bold", min_size=34)
        b.text(1.10, 5.82, 8.9, 1.15, data["summary"], 21, "muted", "regular", min_size=18)
        bullet_stack(b, data.get("bullets", []), 1.12, 7.15, 8.75, 2.15)
        b.image(course["assets"][data["image"]], 11.0, 1.48, 7.9, 8.72, data.get("focus", (0.5, 0.5)), 0.24)
        b.rect(11.0, 9.42, 7.9, 0.78, "green_dark")
        b.text(11.35, 9.61, 7.2, 0.30, data.get("image_caption", "READ THE MARKET • BUILD THE PLAN"), 13, "white", "bold", min_size=11)
    elif kind == "compare":
        cards = [data["left"], data["right"]]
        for i, card in enumerate(cards):
            x = 1.1 + i * 9.05
            accent = card.get("color", "green" if i == 0 else "red")
            b.rect(x, 3.00, 8.75, 5.95, "panel", "grid", 0.8, 0.08)
            b.rect(x, 3.00, 8.75, 0.10, accent)
            b.text(x + 0.42, 3.36, 7.9, 0.68, card["title"], 36, accent, "display", min_size=30)
            if card.get("subtitle"):
                b.text(x + 0.42, 4.15, 7.9, 0.52, card["subtitle"], 19, "white", "semibold", min_size=17)
            bullet_stack(b, card["bullets"], x + 0.42, 4.92, 7.85, 3.55, accent)
        callout(b, data["callout"], y=9.30)
    elif kind == "concept":
        bullet_stack(b, data["bullets"], 1.12, 3.04, 6.75, 5.95, data.get("accent", "green"))
        if data.get("quote"):
            b.rect(1.10, 9.15, 6.80, 0.78, data.get("quote_bg", "green_deep"), None, radius=0.08)
            b.text(1.38, 9.30, 6.25, 0.42, data["quote"], 16.5, "white", "semibold", min_size=14)
        diagram(b, data["diagram"], 8.45, 2.96, 10.45, 7.02, **data.get("diagram_args", {}))
    elif kind == "chart":
        diagram(b, data["diagram"], 1.10, 2.96, 12.05, 6.98, **data.get("diagram_args", {}))
        b.rect(13.55, 2.96, 5.35, 6.98, "panel", "grid", 0.8, 0.08)
        b.text(13.93, 3.30, 4.60, 0.68, data.get("side_title", "READ THE CHART"), 26, data.get("accent", "green"), "bold", min_size=22)
        bullet_stack(b, data["bullets"], 13.91, 4.25, 4.55, 4.68, data.get("accent", "green"))
        if data.get("side_note"):
            b.text(13.93, 9.15, 4.52, 0.48, data["side_note"], 13.5, "muted", "regular", min_size=12)
    elif kind == "steps":
        steps = data["steps"]
        start_y = 3.02
        row_h = 6.75 / len(steps)
        b.line(1.62, start_y + 0.30, 1.62, start_y + 6.30, "grid", 2.0)
        for i, step in enumerate(steps):
            yy = start_y + i * row_h
            accent = "green" if i % 2 == 0 else "red"
            b.circle(1.28, yy + 0.08, 0.68, accent)
            b.text(1.31, yy + 0.20, 0.62, 0.26, f"{i + 1:02d}", 15, "bg", "bold", "center", min_size=13)
            b.text(2.25, yy, 5.55, 0.42, step["title"], 22, "white", "bold", min_size=19)
            b.text(2.25, yy + 0.52, 5.55, row_h - 0.62, step["body"], 16.5, "muted", "regular", min_size=14)
        diagram(b, data["diagram"], 8.45, 2.96, 10.45, 7.02, **data.get("diagram_args", {}))
    elif kind == "cards":
        items = data["items"]
        gap = 0.30
        card_w = (17.8 - gap * (len(items) - 1)) / len(items)
        for i, item in enumerate(items):
            x = 1.1 + i * (card_w + gap)
            accent = item.get("color", "green" if i % 2 == 0 else "red")
            b.rect(x, 3.02, card_w, 5.85, "panel", "grid", 0.8, 0.08)
            b.circle(x + 0.34, 3.40, 0.65, accent)
            b.text(x + 0.36, 3.55, 0.61, 0.25, item.get("number", f"{i + 1:02d}"), 14, "bg", "bold", "center", min_size=12)
            b.text(x + 0.34, 4.38, card_w - 0.68, 1.02, item["title"], 26, "white", "bold", min_size=21)
            b.text(x + 0.34, 5.65, card_w - 0.68, 2.30, item["body"], 17.5, "muted", "regular", min_size=15)
            if item.get("tag"):
                b.text(x + 0.34, 8.20, card_w - 0.68, 0.30, item["tag"], 11.5, accent, "bold", min_size=10)
        callout(b, data["callout"], y=9.28)
    elif kind == "case":
        diagram(b, data["diagram"], 1.10, 2.96, 12.45, 7.02, **data.get("diagram_args", {}))
        b.rect(13.95, 2.96, 4.95, 7.02, "panel", "grid", 0.8, 0.08)
        b.text(14.30, 3.30, 4.25, 0.55, data.get("ticket_title", "TRADE TICKET"), 25, "white", "bold", min_size=22)
        ticket = data["ticket"]
        for i, row in enumerate(ticket):
            yy = 4.15 + i * 0.78
            b.text(14.30, yy, 1.45, 0.28, row[0].upper(), 12.5, "muted", "bold", min_size=11)
            b.text(15.80, yy - 0.03, 2.70, 0.36, row[1], 18, row[2] if len(row) > 2 else "white", "semibold", "right", min_size=15)
            b.line(14.30, yy + 0.47, 18.50, yy + 0.47, "grid", 0.7)
        if data.get("ticket_note"):
            b.text(14.30, 8.95, 4.15, 0.68, data["ticket_note"], 13, "muted", "regular", min_size=11.5)
    elif kind == "summary":
        items = data["items"]
        for i, item in enumerate(items):
            col = i % 2
            row = i // 2
            x = 1.1 + col * 9.05
            y = 3.00 + row * 1.78
            b.rect(x, y, 8.75, 1.48, "panel", "grid", 0.7, 0.08)
            b.circle(x + 0.28, y + 0.37, 0.58, "green" if col == 0 else "red")
            b.check(x + 0.39, y + 0.51, 0.85, "bg", 2.1)
            b.text(x + 1.08, y + 0.26, 7.25, 0.38, item["title"], 20.5, "white", "bold", min_size=18)
            b.text(x + 1.08, y + 0.76, 7.25, 0.45, item["body"], 15.5, "muted", "regular", min_size=13.5)
        callout(b, data["callout"], y=9.30)
    else:
        raise ValueError(f"Unknown slide type: {kind}")


def render_cover(b: Backend, data: dict, index: int, total: int, course: dict):
    b.rect(0, 0, PAGE_W, PAGE_H, "bg")
    b.image(course["assets"][data.get("stock", "stock_charts")], 12.15, 0, 7.85, 11.25, (0.52, 0.5), 0.52)
    b.polygon([(11.15, 0), (12.85, 0), (11.85, 11.25), (10.15, 11.25)], "bg")
    b.polygon([(11.78, 0), (12.15, 0), (11.15, 11.25), (10.78, 11.25)], "green_dark")
    add_brand_mark(b, 1.15, 0.62)
    b.text(1.15, 1.46, 8.9, 0.36, data.get("kicker", "JOREEM LEARNING SERIES"), 15, "green", "bold", min_size=13)
    b.text(1.12, 2.12, 10.15, 2.40, data["title"], data.get("title_size", 84), "white", "display", min_size=62, leading=0.98)
    b.text(1.12, 4.40, 10.30, 1.15, data["accent_title"], data.get("accent_size", 78), "green", "display", min_size=56, leading=1.0)
    b.text(1.15, 5.92, 9.75, 0.98, data["subtitle"], 23, "muted", "regular", min_size=19)
    chips = data.get("chips", [])
    for i, chip in enumerate(chips):
        x = 1.15 + i * 3.15
        b.rect(x, 7.30, 2.88, 0.58, "panel", "grid", 0.8, 0.08)
        b.text(x + 0.15, 7.46, 2.58, 0.24, chip, 12.5, "white", "bold", "center", min_size=10.5)
    b.line(1.15, 8.55, 9.95, 8.55, "grid", 0.8)
    b.text(1.15, 8.84, 9.35, 0.68, data.get("promise", "A structured learning deck with chart diagrams, checklists and practice prompts."), 17.5, "white", "regular", min_size=15)
    b.text(1.15, 10.15, 9.60, 0.30, "EDUCATIONAL ONLY • TRADING INVOLVES RISK • NO RETURNS ARE GUARANTEED", 11, "dim", "semibold", min_size=10)
    # Portrait card on top of the stock-photo panel.
    b.rect(13.15, 1.15, 5.60, 6.15, "panel", "green", 1.4, 0.06)
    b.image(course["assets"]["joreem"], 13.40, 1.40, 5.10, 5.10, (0.5, 0.43), 0.0)
    b.text(13.42, 6.68, 5.05, 0.36, "JOREEM", 22, "white", "bold", "center", min_size=20)
    b.rect(13.15, 7.70, 5.60, 1.02, "green_dark")
    b.text(13.46, 7.93, 4.98, 0.48, data.get("mentor_line", "LEARN THE PROCESS.\nRESPECT THE RISK."), 15, "white", "bold", "center", min_size=13)
    b.text(17.15, 10.62, 1.60, 0.28, f"{index:02d} / {total:02d}", 12, "white", "semibold", "right", min_size=11)


def render_closing(b: Backend, data: dict, index: int, total: int, course: dict):
    b.rect(0, 0, PAGE_W, PAGE_H, "bg")
    b.polygon([(0, 0), (7.0, 0), (5.4, 11.25), (0, 11.25)], "green_deep")
    b.image(course["assets"]["joreem"], 1.10, 1.15, 4.65, 4.65, (0.5, 0.43), 0.0)
    b.rect(1.10, 5.80, 4.65, 0.12, "green")
    b.text(1.10, 6.25, 4.65, 0.48, "JOREEM", 28, "white", "bold", min_size=24)
    b.text(1.10, 6.90, 4.65, 0.68, "TRADE WITH JOREEM\nLEARNING SERIES", 15, "muted", "semibold", min_size=13)
    add_brand_mark(b, 15.15, 0.55)
    b.text(6.55, 1.38, 12.15, 1.38, data["title"], 66, "white", "display", min_size=48)
    b.text(6.58, 2.98, 11.85, 0.90, data["body"], 22, "muted", "regular", min_size=19)
    bullet_stack(b, data["bullets"], 6.60, 4.15, 11.75, 2.55)
    b.rect(6.55, 7.08, 12.20, 1.00, "red_deep", "red_dark", 0.8, 0.08)
    b.text(6.88, 7.28, 11.55, 0.58, data["risk"], 15.5, "white", "regular", min_size=13.5)
    b.text(6.58, 8.55, 12.00, 0.30, "CONTENT & IMAGE NOTES", 12, "green", "bold", min_size=11)
    b.text(6.58, 8.98, 12.00, 0.88, data["credits"], 12.5, "muted", "regular", min_size=11)
    b.line(6.58, 10.10, 18.75, 10.10, "grid", 0.8)
    b.text(6.58, 10.35, 9.8, 0.28, "REVIEW THE RULES • PRACTISE ON DEMO • KEEP A JOURNAL", 11.5, "dim", "bold", min_size=10)
    b.text(17.15, 10.62, 1.60, 0.28, f"{index:02d} / {total:02d}", 12, "muted", "semibold", "right", min_size=11)


def remove_all_slides(prs: Presentation) -> None:
    slide_ids = list(prs.slides._sldIdLst)
    for slide_id in slide_ids:
        prs.part.drop_rel(slide_id.rId)
        prs.slides._sldIdLst.remove(slide_id)


def speaker_notes(data: dict, course: dict) -> str:
    lines = [data.get("notes") or data.get("subtitle") or data.get("title", "")]
    if data.get("source"):
        lines.append(f"\nSource: {course['source_file']} — {data['source']}.")
    lines.append("\nCharts are original schematic illustrations, not live market data. Educational use only; not financial advice.")
    return "\n".join(lines)


def finalize_pptx_package(pptx_path: Path, pdf_path: Path, slide_count: int) -> None:
    """Refresh the file-preview thumbnail and basic extended properties."""
    import io
    import pymupdf

    doc = pymupdf.open(pdf_path)
    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(0.35, 0.35), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=86, optimize=True)
    thumbnail = buffer.getvalue()
    doc.close()

    temp_path = pptx_path.with_suffix(".tmp.pptx")
    with zipfile.ZipFile(pptx_path, "r") as source, zipfile.ZipFile(temp_path, "w") as target:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename == "docProps/thumbnail.jpeg":
                data = thumbnail
            elif item.filename == "docProps/app.xml":
                text = data.decode("utf-8")
                text = text.replace("<PresentationFormat>On-screen Show (4:3)</PresentationFormat>", "<PresentationFormat>On-screen Show (16:9)</PresentationFormat>")
                text = text.replace("<Slides>0</Slides>", f"<Slides>{slide_count}</Slides>")
                text = text.replace("<Notes>0</Notes>", f"<Notes>{slide_count}</Notes>")
                data = text.encode("utf-8")
            target.writestr(item, data)
    os.replace(temp_path, pptx_path)


def build_course(course: dict, template: Path, output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    fonts = extract_template_fonts(template)
    register_pdf_fonts(fonts)
    slides = course["slides"]
    total = len(slides)

    prs = Presentation(str(template))
    remove_all_slides(prs)
    blank_layout = next((layout for layout in prs.slide_layouts if layout.name == "Blank"), prs.slide_layouts[6])
    prs.core_properties.title = course["title"]
    prs.core_properties.subject = course["subtitle"]
    prs.core_properties.author = "Trade with Joreem"
    prs.core_properties.keywords = "trading education, supply and demand, SMC, risk management"
    prs.core_properties.comments = f"Adapted from the supplied transcript: {course['source_file']}"

    pptx_path = output_dir / f"{course['slug']}.pptx"
    pdf_path = output_dir / f"{course['slug']}.pdf"
    pdf = canvas.Canvas(str(pdf_path), pagesize=(PAGE_W * PT_PER_IN, PAGE_H * PT_PER_IN), pageCompression=1)
    pdf.setTitle(course["title"])
    pdf.setAuthor("Trade with Joreem")
    pdf.setSubject(course["subtitle"])
    pdf.setKeywords("trading education, supply and demand, risk management")

    for index, data in enumerate(slides, 1):
        slide = prs.slides.add_slide(blank_layout)
        ppt_backend = PPTBackend(slide, fonts)
        render_slide(ppt_backend, data, index, total, course)
        slide.notes_slide.notes_text_frame.text = speaker_notes(data, course)

        pdf_backend = PDFBackend(pdf, fonts)
        render_slide(pdf_backend, data, index, total, course)
        bookmark = f"slide-{index}"
        pdf.bookmarkPage(bookmark)
        outline_title = data.get("title", "Cover")
        if data.get("type") == "cover" and data.get("accent_title"):
            outline_title = f"{outline_title} {data['accent_title']}"
        pdf.addOutlineEntry(f"{index:02d}  {outline_title}", bookmark, level=0, closed=False)
        pdf.showPage()

    prs.save(str(pptx_path))
    pdf.save()
    finalize_pptx_package(pptx_path, pdf_path, total)
    return pptx_path, pdf_path
