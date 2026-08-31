"""
Regenerate placeholder images in the site palette.

Run from the repo root:   python tools/make_placeholders.py
Delete this folder once every real asset is in place.
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GROUND = (20, 19, 26)
DEEP = (15, 14, 20)
LINE = (46, 43, 58)
IRIS = (140, 123, 255)
TEXT3 = (123, 117, 137)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\consola.ttf",
    r"C:\Windows\Fonts\seguisb.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
]


def font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                pass
    return ImageFont.load_default()


def lattice(w, h, seed):
    """Charcoal ground + jittered node lattice with one spike wavefront lit."""
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), GROUND)
    d = ImageDraw.Draw(img, "RGBA")

    # soft vignette toward the deep ground
    for i in range(h):
        t = i / max(h - 1, 1)
        band = tuple(round(GROUND[c] + (DEEP[c] - GROUND[c]) * (t ** 1.6)) for c in range(3))
        d.line([(0, i), (w, i)], fill=band)

    gap = max(26, int(min(w, h) / 26))
    sx, sy = w * rnd.uniform(0.3, 0.7), h * rnd.uniform(0.25, 0.65)
    reach = min(w, h) * 0.62

    for gy in range(0, h + gap, gap):
        for gx in range(0, w + gap, gap):
            x = gx + (rnd.random() - 0.5) * gap * 0.5
            y = gy + (rnd.random() - 0.5) * gap * 0.5
            dist = math.hypot(x - sx, y - sy)
            # nodes near the wavefront ring are "firing"
            lit = max(0.0, 1 - abs(dist - reach * 0.55) / (reach * 0.42))
            lit *= max(0.0, 1 - dist / (reach * 1.7))
            if lit > 0.04:
                r = 1.4 + lit * 2.6
                a = int(min(lit * 210, 190))
                d.ellipse([x - r, y - r, x + r, y + r], fill=IRIS + (a,))
            else:
                d.ellipse([x - 1.1, y - 1.1, x + 1.1, y + 1.1], fill=(233, 230, 244, 20))

    d.rectangle([0, 0, w - 1, h - 1], outline=LINE)
    return img, d


def label(d, w, h, name, note):
    f1, f2 = font(max(18, w // 34)), font(max(13, w // 58))
    for text, fnt, dy, col in ((name, f1, -14, (233, 230, 244)), (note, f2, 22, TEXT3)):
        box = d.textbbox((0, 0), text, font=fnt)
        d.text(((w - (box[2] - box[0])) / 2, h / 2 + dy), text, font=fnt, fill=col)


def make(path, w, h, note):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img, d = lattice(w, h, seed=path)
    label(d, w, h, os.path.basename(path), "%d x %d  ·  %s" % (w, h, note))
    img.save(full, "JPEG", quality=86, optimize=True)
    print("  ", path)


def make_logo(slug, name):
    """Transparent square placeholder for an organisation logo (contained, not cropped)."""
    w = h = 120
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(13)
    box = d.textbbox((0, 0), name, font=f)
    d.text(((w - (box[2] - box[0])) / 2, h / 2 - 7), name, font=f, fill=(167, 161, 182, 175))
    path = "images/logos/%s.png" % slug
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, "PNG", optimize=True)
    print("  ", path)


LOGOS = [
    ("gsu", "GSU"), ("tehran", "Tehran"), ("isfahan", "Isfahan"),
    ("tressed", "Tressed"), ("sequence", "Sequence"), ("acm", "ACM"),
    ("uw", "UW"), ("google", "Google"), ("iccompv", "ICCompV"),
    ("deeplearning-ai", "DL.AI"), ("coursera", "Coursera"), ("jhu", "JHU"),
]


if __name__ == "__main__":
    print("Writing placeholders:")
    make("images/hero.jpg", 1000, 1250, "portrait 4:5")
    make("images/about-1.jpg", 900, 1200, "vibe photo 3:4")
    make("images/about-2.jpg", 1200, 900, "vibe photo 4:3")
    make("images/about-3.jpg", 1200, 900, "vibe photo 4:3")
    for slug in ("llm-air-quality", "agentic-sustainable-llms", "snn-motion-detection",
                 "mosquito-alert", "realtime-cx-ml", "breast-cancer-mlp"):
        make("images/projects/%s.jpg" % slug, 1440, 900, "project 16:10")
    for slug, name in LOGOS:
        make_logo(slug, name)
    print("Done.")
