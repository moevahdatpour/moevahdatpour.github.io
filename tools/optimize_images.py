"""
Convert every image the site references to WebP, update the HTML, delete the
originals.

    python tools/optimize_images.py --dry-run     # report only
    python tools/optimize_images.py               # do it

Logos get extra treatment: any solid white background is flooded away from the
edges, the artwork is trimmed to its own bounding box, and a small transparent
margin is added. That fixes wordmarks sitting on a huge empty canvas (a logo
that filled 14% of its file now fills the slot) and removes white boxes.

Nothing is upscaled. Files that are not referenced by the HTML are left alone.
"""

import argparse
import io
import os
import re
import sys

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ("index.html", "resume.html")

# longest edge, per role. Generous: these are display sizes times ~3.
MAX_EDGE = {
    "logos": 512,
    "hero": 1500,
    "about": 1700,
    "story": 1500,
    "projects": 1900,
    "creds": 600,
}
DEFAULT_EDGE = 1700

QUALITY = 92           # WebP quality for photographs
WHITE_TOLERANCE = 36   # how far from the corner colour still counts as background
LOGO_MARGIN = 0.04

# Slugs in images/logos/ that are scanned documents rather than logo marks.
# Flooding the white paper away leaves only floating text, so these are
# converted verbatim. Add a slug here if a logo comes out hollowed-out.
KEEP_BACKGROUND = {"coursera", "deeplearning-ai", "google", "jhu", "uw"}


def role_of(path):
    parts = path.split("/")
    if len(parts) > 2 and parts[1] in MAX_EDGE:
        return parts[1]
    if "hero" in parts[-1]:
        return "hero"
    if parts[-1].startswith("about"):
        return "about"
    return "default"


def has_alpha(im):
    return im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 250


def strip_white(im):
    """Flood inward from the border; whatever it reaches becomes transparent."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    pad = Image.new("RGB", (w + 2, h + 2), rgb.getpixel((1, 1)))
    pad.paste(rgb, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), (255, 0, 255), thresh=WHITE_TOLERANCE)
    pad = pad.crop((1, 1, w + 1, h + 1))
    mask = (ImageChops.difference(pad, Image.new("RGB", pad.size, (255, 0, 255)))
            .convert("L").point(lambda v: 0 if v == 0 else 255))
    out = rgb.convert("RGBA")
    out.putalpha(mask)
    return out


def edges_are_light(im, limit=234):
    rgb = im.convert("RGB")
    w, h = rgb.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2),
           (w // 2, 1), (w // 2, h - 2), (1, h // 2), (w - 2, h // 2)]
    return all(min(rgb.getpixel(p)) > limit for p in pts)


def prep_logo(im):
    if not has_alpha(im):
        if edges_are_light(im):
            im = strip_white(im)
        else:
            im = im.convert("RGBA")      # e.g. a scan — leave the background be
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    pad = int(max(w, h) * LOGO_MARGIN)
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (255, 255, 255, 0))
    canvas.paste(im, (pad, pad))
    return canvas


def fit(im, longest):
    w, h = im.size
    if max(w, h) <= longest:
        return im
    s = longest / float(max(w, h))
    return im.resize((max(1, int(round(w * s))), max(1, int(round(h * s)))), Image.LANCZOS)


def collect_refs():
    refs = {}
    for page in PAGES:
        s = io.open(os.path.join(ROOT, page), encoding="utf-8").read()
        for m in re.finditer(r'src="(images/[^"]+)"', s):
            refs.setdefault(m.group(1), []).append(page)
    return refs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    refs = collect_refs()
    plan, skipped = {}, []

    for ref in sorted(refs):
        src = os.path.join(ROOT, ref)
        if not os.path.exists(src):
            skipped.append((ref, "file missing"))
            continue
        if ref.lower().endswith(".webp"):
            continue
        dest_rel = re.sub(r"\.(png|jpe?g)$", ".webp", ref, flags=re.I)
        plan.setdefault(dest_rel, []).append(ref)

    # Two sources can want the same .webp name (card image vs pop-up image are
    # different pictures with the same stem). Never merge them — the one with
    # transparency keeps the plain name, the other gets its extension appended.
    chosen, renamed = {}, []
    for dest, sources in sorted(plan.items()):
        if len(sources) == 1:
            chosen[dest] = sources[0]
            continue
        def score(p):
            im = Image.open(os.path.join(ROOT, p))
            return (1 if has_alpha(im) else 0, im.size[0] * im.size[1])
        ordered = sorted(sources, key=score, reverse=True)
        chosen[dest] = ordered[0]
        for other in ordered[1:]:
            ext = other.rsplit(".", 1)[1].lower()
            alt = re.sub(r"\.(png|jpe?g)$", "-%s.webp" % ext, other, flags=re.I)
            chosen[alt] = other
            renamed.append((other, alt))

    print("%-44s %-13s %-13s %s" % ("source", "was", "now", "bytes"))
    total_before = total_after = 0
    written = []

    for dest, src_rel in sorted(chosen.items()):
        src = os.path.join(ROOT, src_rel)
        out = os.path.join(ROOT, dest)
        role = role_of(src_rel)
        im = Image.open(src)
        before_px = "%dx%d" % im.size
        before_bytes = os.path.getsize(src)

        if role == "logos":
            slug = os.path.basename(src_rel).rsplit(".", 1)[0]
            if slug in KEEP_BACKGROUND:
                im = im.convert("RGB")
            else:
                im = prep_logo(im)
            im = fit(im, MAX_EDGE["logos"])
            params = dict(lossless=True, method=6)
        else:
            if has_alpha(im):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            im = fit(im, MAX_EDGE.get(role, DEFAULT_EDGE))
            params = dict(quality=QUALITY, method=6)

        if args.dry_run:
            buf = io.BytesIO(); im.save(buf, "WEBP", **params); after_bytes = buf.tell()
        else:
            im.save(out, "WEBP", **params); after_bytes = os.path.getsize(out)
            written.append(dest)

        total_before += before_bytes; total_after += after_bytes
        print("%-44s %-13s %-13s %7.0fkB -> %6.0fkB" %
              (src_rel, before_px, "%dx%d" % im.size, before_bytes / 1024.0, after_bytes / 1024.0))

    # rewrite the HTML
    if not args.dry_run:
        rewrite = {src_rel: dest for dest, src_rel in chosen.items()}
        for page in PAGES:
            p = os.path.join(ROOT, page)
            s = io.open(p, encoding="utf-8").read()
            for old, new in rewrite.items():
                s = s.replace('src="%s"' % old, 'src="%s"' % new)
            io.open(p, "w", encoding="utf-8").write(s)

        # remove the originals we replaced
        removed = 0
        for dest, src_rel in chosen.items():
            f = os.path.join(ROOT, src_rel)
            if os.path.exists(f) and dest in written:
                os.remove(f); removed += 1
        print("\nremoved %d original files" % removed)

    print("\n%d images  %.0f kB -> %.0f kB  (%.0f%% smaller)" %
          (len(chosen), total_before / 1024.0, total_after / 1024.0,
           100 * (1 - total_after / float(total_before or 1))))
    for other, alt in renamed:
        print("   name clash: %s -> %s (kept as its own file)" % (other, alt))
    for ref, why in skipped:
        print("   skipped %s (%s)" % (ref, why))


if __name__ == "__main__":
    main()
