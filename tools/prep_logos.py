"""
Turn logo files that have a solid white background into transparent PNGs.

Drop a logo into images/logos/ as <slug>.jpg (or .jpeg / .src.png), run:

    python tools/prep_logos.py

and it writes images/logos/<slug>.png with the white knocked out, trimmed to
the artwork, with a little breathing room. Your original file is never touched.

The white is removed by flooding inward from the edges, so white *inside* the
logo (a letter counter, a knocked-out shape) survives. A file whose edges are
not near-white is reported and skipped rather than mangled.
"""

import glob
import os

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(ROOT, "images", "logos")

SENTINEL = (255, 0, 255)
TOLERANCE = 36      # how far from the corner colour still counts as background
MARGIN = 0.06       # transparent breathing room, as a fraction of the long edge


def edges_are_light(im, limit=232):
    w, h = im.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2),
           (w // 2, 1), (w // 2, h - 2), (1, h // 2), (w - 2, h // 2)]
    return all(min(im.getpixel(p)) > limit for p in pts)


def strip_background(im):
    """Flood from the border inward; everything reached becomes transparent."""
    w, h = im.size
    pad = Image.new("RGB", (w + 2, h + 2), im.getpixel((1, 1)))
    pad.paste(im, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), SENTINEL, thresh=TOLERANCE)
    pad = pad.crop((1, 1, w + 1, h + 1))

    flooded = ImageChops.difference(pad, Image.new("RGB", pad.size, SENTINEL))
    alpha = flooded.convert("L").point(lambda v: 0 if v == 0 else 255)

    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def trim_and_pad(im):
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    pad = int(max(w, h) * MARGIN)
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (255, 255, 255, 0))
    canvas.paste(im, (pad, pad))
    return canvas


def main():
    sources = []
    for pattern in ("*.jpg", "*.jpeg", "*.src.png"):
        sources.extend(glob.glob(os.path.join(LOGO_DIR, pattern)))

    if not sources:
        print("No source logos found in images/logos/ (looking for .jpg/.jpeg/.src.png)")
        return

    done, skipped = 0, []
    for src in sorted(sources):
        slug = os.path.basename(src).split(".")[0]
        im = Image.open(src).convert("RGB")

        if not edges_are_light(im):
            skipped.append((slug, "edges are not white — not a logo on a plain background"))
            continue

        out = trim_and_pad(strip_background(im))
        dest = os.path.join(LOGO_DIR, slug + ".png")
        out.save(dest, "PNG", optimize=True)
        print("   %-22s %s -> %dx%d transparent" % (slug + ".png", im.size, out.size[0], out.size[1]))
        done += 1

    print("\n%d converted." % done)
    for slug, why in skipped:
        print("   skipped %-16s %s" % (slug, why))


if __name__ == "__main__":
    main()
