from __future__ import annotations

import math
import random

from tools.deck_engine import Backend, COLORS


def candles(closes, wick=1.4, tweaks=None):
    tweaks = tweaks or {}
    output = []
    previous = closes[0] - 1.5
    for i, close in enumerate(closes):
        open_ = previous if i else closes[0] - (1.5 if closes[1] >= closes[0] else -1.5)
        high = max(open_, close) + wick * (1.0 + (i % 3) * 0.25)
        low = min(open_, close) - wick * (1.0 + ((i + 1) % 3) * 0.25)
        values = [open_, high, low, close]
        if i in tweaks:
            for j, value in enumerate(tweaks[i]):
                if value is not None:
                    values[j] = value
        output.append(tuple(values))
        previous = close
    return output


class Chart:
    def __init__(self, b: Backend, x, y, w, h, title=None, low=0, high=100, count=18):
        self.b = b
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.low = low
        self.high = high
        self.count = count
        self._zone_labels = []
        b.rect(x, y, w, h, "panel", "grid", 0.8, 0.05)
        self.top = y + (0.68 if title else 0.30)
        self.bottom = y + h - 0.48
        self.left = x + 0.36
        self.right = x + w - 0.32
        if title:
            b.text(x + 0.30, y + 0.20, w - 0.60, 0.28, title, 13, "muted", "bold", min_size=11)
        for value in range(20, 100, 20):
            yy = self.py(value)
            if self.top < yy < self.bottom:
                b.line(self.left, yy, self.right, yy, "grid", 0.55, True)
        b.text(x + 0.30, y + h - 0.30, w - 0.60, 0.18, "SCHEMATIC • NOT LIVE MARKET DATA", 8.5, "dim", "regular", min_size=8)

    def px(self, index):
        return self.left + (index + 0.5) / self.count * (self.right - self.left)

    def py(self, value):
        return self.bottom - (value - self.low) / (self.high - self.low) * (self.bottom - self.top)

    def candle(self, index, values, bull="green", bear="red", width_scale=0.52):
        open_, high, low, close = values
        xx = self.px(index)
        color = bull if close >= open_ else bear
        self.b.line(xx, self.py(high), xx, self.py(low), color, 1.15)
        slot = (self.right - self.left) / self.count
        body_w = slot * width_scale
        y1 = self.py(max(open_, close))
        y2 = self.py(min(open_, close))
        self.b.rect(xx - body_w / 2, y1, body_w, max(0.025, y2 - y1), color)

    def draw(self, values, start=0):
        for i, row in enumerate(values):
            self.candle(start + i, row)
        self._draw_zone_labels()

    def _draw_zone_labels(self):
        # Labels are rendered after candles so price bars never obscure the zone names.
        for tx, yy, label, color, align in self._zone_labels:
            self.b.rect(tx - 0.05, yy - 0.03, 1.70, 0.34, "panel")
            self.b.text(tx, yy + 0.02, 1.60, 0.25, label, 10.5, color, "bold", align, min_size=8.5)
        self._zone_labels = []

    def zone(self, start, end, low, high, color="green", label=None, label_side="left"):
        x1 = self.px(start) - (self.right - self.left) / self.count * 0.48
        x2 = self.px(end) + (self.right - self.left) / self.count * 0.48
        y1 = self.py(high)
        y2 = self.py(low)
        dark = "green_dark" if color == "green" else "red_dark" if color == "red" else "panel2"
        self.b.rect(x1, y1, x2 - x1, y2 - y1, dark, color, 0.9)
        if label:
            tx = x1 + 0.12 if label_side == "left" else x2 - 1.65
            align = "right" if label_side == "right" else "left"
            self._zone_labels.append((tx, y1 + 0.10, label, color, align))

    def hline(self, value, start=0, end=None, color="muted", width=1.0, dash=True, label=None, label_side="right"):
        end = self.count - 1 if end is None else end
        x1 = self.px(start)
        x2 = self.px(end)
        yy = self.py(value)
        self.b.line(x1, yy, x2, yy, color, width, dash)
        if label:
            if label_side == "right":
                self.b.text(x2 - 1.65, yy - 0.30, 1.55, 0.24, label, 10.5, color, "bold", "right", min_size=9)
            else:
                self.b.text(x1 + 0.08, yy - 0.30, 1.65, 0.24, label, 10.5, color, "bold", min_size=9)

    def path(self, points, color="white", width=1.5, dash=False):
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            self.b.line(self.px(x1), self.py(y1), self.px(x2), self.py(y2), color, width, dash)

    def arrow(self, start, end, color="green", width=1.8):
        self.b.arrow(self.px(start[0]), self.py(start[1]), self.px(end[0]), self.py(end[1]), color, width, 0.13)

    def label(self, index, value, text, color="white", width=1.8, above=True, align="center", size=11.5):
        xx = self.px(index)
        yy = self.py(value)
        self.b.text(xx - width / 2, yy - (0.42 if above else -0.10), width, 0.30, text, size, color, "bold", align, min_size=max(8.5, size - 2))

    def marker(self, index, value, text, color="green", above=True):
        xx = self.px(index)
        yy = self.py(value)
        cy = yy - 0.60 if above else yy + 0.22
        self.b.circle(xx - 0.18, cy, 0.36, color)
        self.b.text(xx - 0.17, cy + 0.075, 0.34, 0.17, text, 9.5, "bg", "bold", "center", min_size=8.5)


def draw_diagram(b: Backend, name: str, x: float, y: float, w: float, h: float, **kwargs):
    function = DIAGRAMS.get(name)
    if function is None:
        raise ValueError(f"Unknown diagram: {name}")
    function(b, x, y, w, h, **kwargs)


def economics(b, x, y, w, h, **kwargs):
    b.rect(x, y, w, h, "panel", "grid", 0.8, 0.05)
    b.text(x + 0.35, y + 0.28, w - 0.70, 0.32, "THE CAUSE-AND-EFFECT CHAIN", 13, "muted", "bold", min_size=11)
    nodes = [
        ("DEMAND RISES", "More buyers compete for the asset", "green"),
        ("AVAILABLE SUPPLY FALLS", "Units are bought from the market", "red"),
        ("SCARCITY RISES", "The remaining asset becomes scarcer", "green"),
        ("PRICE RESPONDS", "Higher scarcity can support higher prices", "green"),
    ]
    node_h = (h - 1.15) / 4
    for i, (title, body, color) in enumerate(nodes):
        yy = y + 0.85 + i * node_h
        b.rect(x + 0.48, yy, w - 0.96, node_h - 0.30, "bg2", color, 0.9, 0.06)
        b.text(x + 0.78, yy + 0.22, w - 1.56, 0.34, title, 19, color, "bold", min_size=16)
        b.text(x + 0.78, yy + 0.67, w - 1.56, 0.40, body, 14.5, "muted", "regular", min_size=12)
        if i < 3:
            b.arrow(x + w / 2, yy + node_h - 0.26, x + w / 2, yy + node_h + 0.02, "muted", 1.4, 0.10)


def momentum_compare(b, x, y, w, h, **kwargs):
    gap = 0.30
    panel_w = (w - gap) / 2
    configs = [
        ("SMALL / OVERLAPPING CANDLES", [48, 47, 49, 48, 50, 49, 50, 51, 50, 52], "red", "WEAK EVIDENCE"),
        ("LARGE DIRECTIONAL CANDLES", [38, 40, 45, 51, 57, 63, 69, 75, 78, 81], "green", "MOMENTUM"),
    ]
    for i, (title, closes, color, tag) in enumerate(configs):
        xx = x + i * (panel_w + gap)
        c = Chart(b, xx, y, panel_w, h, title, 20, 95, len(closes))
        values = candles(closes, 0.8 if i == 0 else 1.0)
        c.draw(values)
        c.label(4.5, 30 if i == 0 else 27, tag, color, panel_w - 0.8, False, size=13)
        if i == 1:
            c.arrow((1, 39), (8, 82), "green", 2.0)


def zone_method(b, x, y, w, h, **kwargs):
    closes = [58, 55, 52, 50, 49, 55, 62, 69, 75, 73, 69, 63, 57, 52, 55, 63, 71, 78]
    c = Chart(b, x, y, w, h, kwargs.get("title", "LAST CANDLE BEFORE THE IMPULSE"), 35, 88, len(closes))
    c.zone(3.5, 17.5, 46.5, 53.5, "green", "DEMAND")
    c.draw(candles(closes, 1.0, {4: (49, 51, 46.5, 55)}))
    c.path([(3.5, 53.5), (3.5, 46.5)], "white", 1.4)
    c.label(3.5, 58, "MARK HIGH → LOW", "white", 2.4, True, size=11)
    c.marker(4, 69, "1", "green")
    c.marker(5, 76, "2", "green")
    c.marker(6, 82, "3", "green")
    c.arrow((12.5, 62), (13.2, 51), "red", 1.6)
    c.label(13.1, 45, "RETEST", "green", 1.5, False)


def consolidation(b, x, y, w, h, **kwargs):
    closes = [62, 61, 63, 62, 64, 63, 62, 61, 55, 48, 42, 45, 51, 58, 62, 57, 50, 44]
    c = Chart(b, x, y, w, h, "CONSOLIDATION → EXPANSION → RETEST", 30, 75, len(closes))
    c.zone(0.5, 7.5, 58.5, 66, "red", "SUPPLY")
    c.zone(13, 17.5, 58.5, 66, "red", None)
    c.draw(candles(closes, 0.9))
    b.rect(c.px(0.5), c.py(66), c.px(7.5) - c.px(0.5), c.py(58.5) - c.py(66), None, "white", 1.0)
    c.arrow((7.5, 61), (10.5, 43), "red", 1.8)
    c.label(14.5, 69, "RETURN TO THE BOX", "red", 2.7, True)


def wick_rejection(b, x, y, w, h, **kwargs):
    closes = [58, 54, 48, 44, 43, 45, 52, 60, 66, 62, 55, 48, 44, 46, 54, 62, 68, 72]
    tweaks = {
        2: (54, 55, 35, 48),
        3: (48, 47, 33, 44),
        4: (44, 46, 34, 43),
        11: (48, 50, 35, 44),
        12: (44, 47, 34, 46),
    }
    c = Chart(b, x, y, w, h, "WICKS SHOW REJECTED PRICES", 25, 80, len(closes))
    c.zone(1.5, 17.5, 33, 40, "green", "REJECTION AREA")
    c.draw(candles(closes, 0.9, tweaks))
    c.label(3.2, 29, "LONG LOWER WICKS", "green", 2.6, False)
    c.arrow((12.2, 55), (12.5, 39), "red", 1.6)
    c.arrow((14, 45), (17, 70), "green", 1.8)


def confirmation(b, x, y, w, h, **kwargs):
    closes = [70, 66, 61, 55, 49, 43, 40, 41, 52, 59, 65, 69, 73, 76]
    tweaks = {5: (43, 46, 32, 40), 6: (40, 43, 37, 41), 7: (40, 54, 39, 52)}
    c = Chart(b, x, y, w, h, "REJECTION IS NOT ENOUGH — WAIT FOR CONFIRMATION", 25, 85, len(closes))
    c.zone(2.5, 13.5, 34, 43, "green", "DEMAND")
    c.draw(candles(closes, 1.0, tweaks))
    c.marker(5, 48, "1", "amber")
    c.label(5, 27, "LONG-WICK / DOJI", "amber", 2.4, False)
    c.marker(7, 60, "2", "green")
    c.label(7.6, 77, "BULLISH ENGULFING", "green", 2.8, True)
    c.hline(52, 7, 13, "white", 1.2, False, "ENTRY")


def trade_plan(b, x, y, w, h, **kwargs):
    closes = [48, 43, 39, 42, 48, 54, 60, 65, 69, 73, 75, 72, 70]
    c = Chart(b, x, y, w, h, kwargs.get("title", "DEFINE THE PLAN BEFORE ENTRY"), 25, 85, len(closes))
    c.zone(0.5, 4.5, 34, 43, "green", "DEMAND")
    c.zone(8.5, 12.5, 70, 79, "red", "SUPPLY / TARGET")
    c.draw(candles(closes, 0.9))
    c.hline(48, 2.5, 12.5, "white", 1.2, False, "ENTRY")
    c.hline(34, 2.5, 7, "red", 1.2, True, "STOP")
    c.hline(75, 7, 12.5, "green", 1.2, True, "TARGET")
    c.arrow((3.5, 47), (10.5, 74), "green", 2.0)


def short_trade_plan(b, x, y, w, h, **kwargs):
    closes = [52, 57, 61, 58, 52, 46, 40, 35, 31, 29, 33, 38, 41]
    c = Chart(b, x, y, w, h, kwargs.get("title", "SELL FROM SUPPLY WITH DEFINED INVALIDATION"), 20, 75, len(closes))
    c.zone(0.5, 4.5, 57, 66, "red", "SUPPLY / ENTRY")
    c.zone(8.5, 12.5, 25, 34, "green", "DEMAND / TARGET")
    c.draw(candles(closes, 0.9))
    c.hline(57, 2.5, 12.5, "white", 1.2, False, "ENTRY")
    c.hline(66, 2.5, 7, "red", 1.2, True, "STOP")
    c.hline(30, 7, 12.5, "green", 1.2, True, "TARGET")
    c.arrow((3.5, 57), (10.5, 30), "red", 2.0)


def fakeout(b, x, y, w, h, **kwargs):
    closes = [60, 55, 50, 45, 41, 36, 32, 39, 46, 53, 59, 65, 69]
    tweaks = {5: (36, 39, 29, 32), 6: (32, 41, 30, 39)}
    c = Chart(b, x, y, w, h, "BREAK → RECLAIM → CONFIRM", 20, 75, len(closes))
    c.zone(1.5, 12.5, 35, 43, "green", "DEMAND")
    c.draw(candles(closes, 0.9, tweaks))
    c.label(5.5, 24, "FALSE BREAK", "red", 2.1, False)
    c.marker(6, 48, "✓", "green")
    c.arrow((6.5, 40), (11.5, 66), "green", 2.0)
    c.label(8.7, 72, "RECLAIM + STRENGTH", "green", 3.1, True)


def fib_demand(b, x, y, w, h, **kwargs):
    closes = [22, 28, 36, 45, 55, 66, 78, 70, 61, 53, 45, 43, 50, 60, 72, 86]
    c = Chart(b, x, y, w, h, "FIBONACCI + DEMAND CONFLUENCE", 10, 100, len(closes))
    c.zone(8.5, 15.5, 39, 47, "green", "DEMAND + 61.8%")
    c.draw(candles(closes, 0.8))
    levels = [(78, "0 / SWING HIGH"), (56.9, "38.2%"), (50, "50%"), (42.9, "61.8%"), (32.8, "78.6%"), (22, "1 / SWING LOW")]
    for value, label in levels:
        c.hline(value, 0, 15, "amber" if value in (50, 42.9) else "muted", 1.0 if value == 42.9 else 0.7, True, label)
    c.arrow((0.5, 23), (6, 78), "green", 1.5)
    c.arrow((6.5, 77), (11, 44), "red", 1.5)


def structure(b, x, y, w, h, **kwargs):
    gap = 0.30
    pw = (w - gap) / 2
    configs = [
        ("UPTREND", [30, 45, 39, 56, 48, 66, 58, 76], "green", ["HL", "HH", "HL", "HH"]),
        ("DOWNTREND", [76, 62, 69, 52, 60, 43, 50, 32], "red", ["LH", "LL", "LH", "LL"]),
    ]
    for i, (title, closes, color, labels) in enumerate(configs):
        xx = x + i * (pw + gap)
        c = Chart(b, xx, y, pw, h, title, 15, 90, len(closes))
        c.draw(candles(closes, 0.8))
        points = [(j, closes[j]) for j in range(len(closes))]
        c.path(points, color, 1.3)
        for j, label in zip((1, 2, 4, 6), labels):
            c.label(j, closes[j] + (5 if label in ("HH", "LH") else -5), label, color, 1.0, label in ("HH", "LH"), size=12)


def trend_filter(b, x, y, w, h, **kwargs):
    closes = [84, 78, 80, 71, 65, 68, 58, 52, 56, 46, 40, 44, 34, 29]
    c = Chart(b, x, y, w, h, "DOWNTREND: PRIORITISE SUPPLY — IGNORE COUNTER-TREND DEMAND", 15, 95, len(closes))
    c.zone(1.5, 5, 73, 82, "red", "SUPPLY")
    c.zone(6.5, 10, 57, 66, "red", "SUPPLY")
    c.zone(4, 7, 43, 49, "muted", "DEMAND?")
    c.draw(candles(closes, 0.8))
    c.path([(2, 80), (5, 68), (8, 56), (11, 44)], "red", 1.5)
    c.label(7, 36, "COUNTER-TREND = NO TRADE", "muted", 3.7, False)


def imbalance(b, x, y, w, h, **kwargs):
    gap = 0.30
    pw = (w - gap) / 2
    # Left: a visible wick-to-wick gap below the final indecision candle.
    c1 = Chart(b, x, y, pw, h, "IMBALANCE STILL OPEN", 20, 90, 10)
    values1 = candles([70, 67, 64, 50, 42, 46, 55, 61, 58, 52], 0.8)
    values1[2] = (64, 68, 60, 62)
    values1[3] = (62, 63, 48, 50)
    values1[4] = (50, 51, 40, 42)
    c1.zone(1.5, 9.5, 60, 68, "red", "SUPPLY")
    c1.draw(values1)
    b.rect(c1.px(2.4), c1.py(60), c1.px(6.5) - c1.px(2.4), c1.py(51) - c1.py(60), "amber_dark", "amber", 0.8)
    c1.label(4.5, 55, "OPEN PRICE RANGE", "amber", 2.8, True)
    # Right: later trade has already filled that range.
    c2 = Chart(b, x + pw + gap, y, pw, h, "EFFICIENT / ALREADY FILLED", 20, 90, 10)
    values2 = candles([70, 67, 64, 50, 42, 55, 65, 58, 50, 45], 0.8)
    values2[2] = (64, 68, 60, 62)
    values2[5] = (42, 61, 43, 55)
    values2[6] = (55, 67, 54, 65)
    c2.zone(1.5, 9.5, 60, 68, "red", "USED ZONE")
    c2.draw(values2)
    b.cross(c2.px(6) - 0.13, c2.py(63) - 0.13, 1.0, "red", 2.0)
    c2.label(5.8, 34, "DO NOT TREAT AS FRESH", "red", 3.2, False)


def first_tap(b, x, y, w, h, **kwargs):
    closes = [45, 50, 58, 68, 73, 63, 56, 64, 72, 66, 70, 74, 78, 84]
    c = Chart(b, x, y, w, h, "FRESHNESS: THE FIRST RETEST MATTERS", 35, 92, len(closes))
    c.zone(2.5, 13.5, 70, 78, "red", "SUPPLY")
    c.draw(candles(closes, 0.8))
    c.marker(4, 84, "1", "green")
    c.marker(8, 84, "2", "amber")
    c.marker(12, 88, "3", "red")
    c.arrow((4, 72), (6, 57), "red", 1.6)
    c.label(8, 51, "REPEATED TAPS CONSUME THE ZONE", "muted", 4.6, False)
    c.arrow((11.5, 74), (13.2, 84), "green", 1.6)


def extreme(b, x, y, w, h, **kwargs):
    closes = [88, 82, 75, 68, 60, 52, 44, 37, 43, 49, 54, 57, 53, 48]
    c = Chart(b, x, y, w, h, "WHEN MULTIPLE ZONES EXIST, LOCATE THE EXTREME", 25, 98, len(closes))
    c.zone(1.0, 13.5, 78, 86, "red", "EXTREME ZONE")
    c.zone(4.0, 13.5, 55, 62, "muted", "INTERNAL ZONE")
    c.draw(candles(closes, 0.8))
    c.arrow((10, 52), (3, 81), "red", 1.7)
    c.label(6.5, 92, "FURTHEST FRESH ZONE IN THE CURRENT LEG", "red", 4.8, True)
    c.label(10.5, 45, "INTERNAL = CONFIRMATION", "muted", 3.2, False)


def confirmation_short(b, x, y, w, h, **kwargs):
    closes = [45, 50, 56, 63, 69, 65, 70, 66, 61, 56, 60, 55, 48, 41, 36]
    c = Chart(b, x, y, w, h, "BEARISH CONFIRMATION: LTF STRUCTURE SHIFT + RETEST", 25, 85, len(closes))
    c.zone(3.5, 14.5, 67, 75, "red", "HTF SUPPLY")
    c.zone(8.5, 14.5, 57, 62, "red", "LTF SUPPLY")
    c.draw(candles(closes, 0.8))
    c.path([(4, 64), (5, 69), (6, 65), (7, 70)], "green", 1.1)
    c.hline(61, 5, 9, "amber", 1.0, True, "STRUCTURE LOW")
    c.arrow((7, 69), (9, 56), "red", 1.8)
    c.label(8.2, 49, "LOWER LOW", "red", 1.8, False)
    c.arrow((10, 60), (14, 37), "red", 1.8)


def confirmation_long(b, x, y, w, h, **kwargs):
    closes = [65, 60, 54, 47, 41, 45, 40, 44, 49, 54, 50, 55, 62, 69, 74]
    c = Chart(b, x, y, w, h, "BULLISH CONFIRMATION: BREAK ABOVE STRUCTURE + RETEST", 25, 85, len(closes))
    c.zone(3.5, 14.5, 35, 43, "green", "HTF DEMAND")
    c.zone(8.5, 14.5, 48, 53, "green", "LTF DEMAND")
    c.draw(candles(closes, 0.8))
    c.path([(4, 46), (5, 41), (6, 45), (7, 40)], "red", 1.1)
    c.hline(49, 5, 9, "amber", 1.0, True, "STRUCTURE HIGH")
    c.arrow((7, 41), (9, 54), "green", 1.8)
    c.label(8.2, 61, "HIGHER HIGH", "green", 2.0, True)
    c.arrow((10, 50), (14, 73), "green", 1.8)


def fractal(b, x, y, w, h, **kwargs):
    gap = 0.25
    pw = (w - gap * 2) / 3
    for i, title in enumerate(("1 MINUTE", "1 HOUR", "4 HOURS")):
        closes = [60, 55, 48, 43, 48, 56, 64, 60, 55, 51]
        c = Chart(b, x + i * (pw + gap), y, pw, h, title, 30, 75, len(closes))
        c.zone(2.0, 9.5, 40, 46, "green", "DEMAND")
        c.draw(candles(closes, 0.7))
        c.arrow((6, 63), (8, 53), "red", 1.2)
        c.arrow((8, 52), (9.5, 62), "green", 1.2)
    b.text(x + 1.2, y + h - 0.72, w - 2.4, 0.32, "SAME LOGIC • DIFFERENT TIME COMPRESSION", 13, "white", "bold", "center", min_size=11)


def top_down(b, x, y, w, h, **kwargs):
    gap = 0.25
    pw = (w - gap * 2) / 3
    configs = [
        ("WEEKLY • NARRATIVE", [50, 58, 66, 72, 64, 55, 46, 42], "range"),
        ("DAILY / 4H • LOCATION", [62, 56, 49, 43, 46, 52, 57, 61], "demand"),
        ("LTF • EXECUTION", [48, 43, 40, 44, 50, 47, 53, 60], "entry"),
    ]
    for i, (title, closes, mode) in enumerate(configs):
        xx = x + i * (pw + gap)
        c = Chart(b, xx, y, pw, h, title, 25, 85, len(closes))
        if mode == "range":
            c.zone(0, 7.5, 68, 77, "red", "SUPPLY")
            c.zone(0, 7.5, 38, 46, "green", "DEMAND")
        elif mode == "demand":
            c.zone(2.0, 7.5, 38, 46, "green", "HTF DEMAND")
            c.hline(43, 2, 7, "white", 1.0, False, "WATCH")
        else:
            c.zone(1.0, 7.5, 37, 44, "green", "DEMAND")
            c.hline(50, 4, 7, "green", 1.0, False, "ENTRY")
            c.arrow((4, 47), (7, 60), "green", 1.4)
        c.draw(candles(closes, 0.7))
        if i < 2:
            b.arrow(xx + pw + 0.02, y + h / 2, xx + pw + gap - 0.03, y + h / 2, "muted", 1.5, 0.09)


def range_targets(b, x, y, w, h, **kwargs):
    closes = [55, 48, 39, 30, 26, 31, 40, 49, 58, 66, 73, 75, 69]
    c = Chart(b, x, y, w, h, "TRADE FROM ONE OPPOSING ZONE TO THE OTHER", 15, 90, len(closes))
    c.zone(1.5, 12.5, 22, 31, "green", "DEMAND / ENTRY")
    c.zone(1.5, 12.5, 70, 79, "red", "SUPPLY / TARGET")
    c.draw(candles(closes, 0.8))
    c.hline(31, 3.5, 11, "white", 1.1, False, "ENTRY")
    c.hline(22, 3.5, 6, "red", 1.0, True, "INVALIDATION")
    c.hline(74, 7, 12, "green", 1.0, True, "EXIT")
    c.arrow((4.5, 31), (10.5, 74), "green", 2.0)


def structure_impulse(b, x, y, w, h, **kwargs):
    closes = [30, 38, 47, 56, 64, 59, 53, 48, 51, 58, 66, 74, 80]
    c = Chart(b, x, y, w, h, "TRADE THE NEXT IMPULSE — NOT THE MIDDLE OF THE PULLBACK", 20, 90, len(closes))
    c.draw(candles(closes, 0.8))
    c.path([(0, 30), (4, 64)], "green", 2.0)
    c.path([(4, 64), (7, 48)], "amber", 2.0)
    c.path([(7, 48), (12, 80)], "green", 2.0)
    c.hline(30, 0, 7, "muted", 0.8, True, "SWING LOW")
    c.hline(64, 0, 12, "muted", 0.8, True, "SWING HIGH")
    c.label(2, 70, "IMPULSE", "green", 1.6, True)
    c.label(6, 40, "PULLBACK", "amber", 1.8, False)
    c.label(10, 85, "NEXT HIGHER HIGH?", "green", 2.8, True)


def premium_discount(b, x, y, w, h, **kwargs):
    closes = [25, 35, 47, 60, 75, 68, 58, 48, 43, 49, 58, 68]
    c = Chart(b, x, y, w, h, "0 → 0.5 → 1: KEEP THE SWING RANGE SIMPLE", 10, 90, len(closes))
    # Premium/discount regions are drawn before candles.
    b.rect(c.left, c.py(75), c.right - c.left, c.py(50) - c.py(75), "red_deep")
    b.rect(c.left, c.py(50), c.right - c.left, c.py(25) - c.py(50), "green_deep")
    c.draw(candles(closes, 0.8))
    c.hline(75, 0, 11, "red", 0.9, True, "0 • HIGH")
    c.hline(50, 0, 11, "amber", 1.2, True, "0.5 • EQUILIBRIUM")
    c.hline(25, 0, 11, "green", 0.9, True, "1 • LOW")
    c.label(8.5, 34, "DISCOUNT", "green", 2.0, False)
    c.label(2.2, 84, "PREMIUM", "red", 2.0, True)
    c.arrow((8.5, 44), (11, 68), "green", 1.7)


def liquidity_types(b, x, y, w, h, **kwargs):
    gap = 0.25
    pw = (w - gap * 2) / 3
    configs = [("TRENDLINE", "trend"), ("RANGE", "range"), ("SWING LOW", "swing")]
    for i, (title, mode) in enumerate(configs):
        xx = x + i * (pw + gap)
        c = Chart(b, xx, y, pw, h, title, 20, 85, 10)
        if mode == "trend":
            closes = [35, 43, 40, 50, 46, 57, 52, 38, 48, 62]
            c.path([(0, 34), (2, 39), (4, 45), (6, 51)], "amber", 1.2, True)
            c.hline(34, 0, 8, "red", 0.9, True, "LIQUIDITY")
        elif mode == "range":
            closes = [48, 52, 49, 53, 50, 52, 49, 42, 51, 63]
            c.hline(47, 0, 8, "red", 0.9, True, "SELL-SIDE")
            b.rect(c.px(0), c.py(55), c.px(6) - c.px(0), c.py(47) - c.py(55), None, "amber", 0.9)
        else:
            closes = [60, 52, 45, 50, 57, 53, 47, 40, 49, 62]
            c.hline(44, 1, 8, "red", 0.9, True, "BELOW LOW")
        c.draw(candles(closes, 0.7, {7: (closes[6], max(closes[6], closes[7]) + 2, 34 if mode == "trend" else 39 if mode == "range" else 38, closes[7])}))
        c.arrow((7, 41), (9, 62), "green", 1.3)


def liquidity_sweep(b, x, y, w, h, **kwargs):
    closes = [32, 40, 37, 48, 43, 55, 49, 61, 55, 38, 46, 57, 67, 75]
    tweaks = {9: (55, 56, 29, 38)}
    c = Chart(b, x, y, w, h, "ASCENDING LOWS → SWEEP → CONTINUATION", 20, 85, len(closes))
    c.draw(candles(closes, 0.7, tweaks))
    c.path([(0, 31), (2, 36), (4, 42), (6, 48), (8, 54)], "amber", 1.4, True)
    c.hline(31, 0, 10, "red", 1.0, True, "FIRST LOW / LIQUIDITY")
    for i, value in ((2, 37), (4, 43), (6, 49), (8, 55)):
        c.label(i, value - 6, "HL", "amber", 0.8, False, size=10)
    c.marker(9, 64, "S", "red")
    c.label(9, 24, "SWEEP", "red", 1.4, False)
    c.arrow((10, 46), (13, 75), "green", 1.8)


def order_flow(b, x, y, w, h, **kwargs):
    closes = [72, 66, 59, 52, 45, 39, 43, 50, 59, 68, 61, 55, 52, 59, 68]
    tweaks = {5: (43, 45, 33, 39)}
    c = Chart(b, x, y, w, h, "SELL-DOWN BEFORE THE BUY-UP THAT BREAKS STRUCTURE", 25, 85, len(closes))
    c.zone(1.5, 14.5, 34, 48, "green", "BROAD DEMAND")
    c.draw(candles(closes, 0.8, tweaks))
    c.hline(59, 0, 9, "amber", 1.0, True, "STRUCTURE HIGH")
    c.arrow((1, 69), (5, 39), "red", 1.6)
    c.arrow((6, 43), (9, 68), "green", 1.8)
    c.label(9, 76, "BOS", "green", 1.0, True)
    c.label(4, 29, "LIQUIDITY SWEEP", "red", 2.4, False)
    c.arrow((12, 53), (14, 68), "green", 1.5)


def zone_refine(b, x, y, w, h, **kwargs):
    closes = [68, 60, 52, 44, 39, 46, 56, 65, 59, 52, 48, 54, 63, 71]
    c = Chart(b, x, y, w, h, "WAIT FOR THE SHIFT — THEN USE THE NEW DEMAND", 25, 82, len(closes))
    c.zone(3.5, 13.5, 35, 44, "muted", "FIRST CONNECTION")
    c.zone(8.5, 13.5, 46, 53, "green", "REFINED DEMAND")
    c.draw(candles(closes, 0.8))
    c.hline(56, 1, 7, "amber", 1.0, True, "BOS LEVEL")
    c.arrow((4, 40), (7, 65), "green", 1.7)
    c.label(7, 73, "STRUCTURE SHIFT", "green", 2.6, True)
    c.arrow((9.5, 52), (13, 70), "green", 1.7)
    c.hline(52, 9, 13, "white", 1.0, False, "ENTRY")


def multi_timeframe(b, x, y, w, h, **kwargs):
    gap = 0.35
    pw = (w - gap) / 2
    c1 = Chart(b, x, y, pw, h, "4H • THE PARENT IMPULSE", 20, 90, 12)
    closes1 = [30, 38, 48, 59, 69, 62, 54, 49, 55, 65, 75, 82]
    c1.draw(candles(closes1, 0.8))
    c1.path([(0, 30), (4, 69)], "green", 1.7)
    c1.path([(4, 69), (7, 49)], "amber", 1.7)
    c1.path([(7, 49), (11, 82)], "green", 1.7)
    c1.label(6, 40, "1H SETUP LIVES HERE", "amber", 3.0, False)
    c2 = Chart(b, x + pw + gap, y, pw, h, "1H • IMPULSE WITHIN THE IMPULSE", 20, 90, 12)
    closes2 = [62, 57, 51, 46, 43, 48, 55, 52, 58, 66, 74, 80]
    c2.zone(2.5, 11.5, 40, 47, "green", "DEMAND")
    c2.draw(candles(closes2, 0.8))
    c2.hline(50, 3, 11, "amber", 1.0, True, "0.5 AREA")
    c2.hline(48, 5, 11, "white", 1.0, False, "ENTRY")
    c2.arrow((7, 52), (11, 80), "green", 1.7)


def risk_reward(b, x, y, w, h, **kwargs):
    b.rect(x, y, w, h, "panel", "grid", 0.8, 0.05)
    b.text(x + 0.35, y + 0.28, w - 0.70, 0.32, "MECHANICAL RISK FRAME • EXAMPLE ONLY", 13, "muted", "bold", min_size=11)
    entry_y = y + h * 0.53
    stop_y = y + h * 0.78
    target_y = y + h * 0.23
    b.rect(x + 0.75, entry_y, w - 1.5, stop_y - entry_y, "red_deep", "red", 0.9)
    b.rect(x + 0.75, target_y, w - 1.5, entry_y - target_y, "green_deep", "green", 0.9)
    b.line(x + 0.55, entry_y, x + w - 0.55, entry_y, "white", 1.4)
    b.text(x + 1.0, entry_y - 0.38, 2.4, 0.28, "ENTRY", 14, "white", "bold", min_size=12)
    b.text(x + 1.0, stop_y + 0.15, 3.6, 0.30, "STOP = 1R RISK", 15, "red", "bold", min_size=13)
    b.text(x + 1.0, target_y - 0.42, 4.2, 0.30, "TARGET = 2R (EXAMPLE)", 15, "green", "bold", min_size=13)
    b.text(x + w - 3.25, (entry_y + stop_y) / 2 - 0.15, 2.1, 0.32, "1R DOWN", 15, "red", "bold", "right", min_size=13)
    b.text(x + w - 3.25, (entry_y + target_y) / 2 - 0.15, 2.1, 0.32, "2R UP", 15, "green", "bold", "right", min_size=13)
    b.text(x + 0.75, y + h - 0.60, w - 1.5, 0.30, "A 2R TARGET DOES NOT GUARANTEE A WIN OR POSITIVE EXPECTANCY.", 12.5, "muted", "bold", "center", min_size=11)


DIAGRAMS = {
    "economics": economics,
    "momentum_compare": momentum_compare,
    "zone_method": zone_method,
    "consolidation": consolidation,
    "wick_rejection": wick_rejection,
    "confirmation": confirmation,
    "trade_plan": trade_plan,
    "short_trade_plan": short_trade_plan,
    "fakeout": fakeout,
    "fib_demand": fib_demand,
    "structure": structure,
    "trend_filter": trend_filter,
    "imbalance": imbalance,
    "first_tap": first_tap,
    "extreme": extreme,
    "confirmation_short": confirmation_short,
    "confirmation_long": confirmation_long,
    "fractal": fractal,
    "top_down": top_down,
    "range_targets": range_targets,
    "structure_impulse": structure_impulse,
    "premium_discount": premium_discount,
    "liquidity_types": liquidity_types,
    "liquidity_sweep": liquidity_sweep,
    "order_flow": order_flow,
    "zone_refine": zone_refine,
    "multi_timeframe": multi_timeframe,
    "risk_reward": risk_reward,
}
