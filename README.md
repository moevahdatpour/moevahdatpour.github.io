# moevahdatpour.github.io

Personal site for **Moe Vahdatpour** — AI/ML Engineer, Atlanta GA.
One page, no build step, no dependencies. Push to `main` and GitHub Pages serves it.

```
index.html        every word on the site
css/styles.css    all styling
js/main.js        behaviour only — never contains copy
images/           photos and project stills
resume.html       the resume page (linked from the Resume buttons)
fonts/            self-hosted display fonts (see fonts/README.md)
tools/            placeholder generator + prep_logos.py (logo background
                  remover); delete once every real asset is in
```

## Editing content

Everything is in **`index.html`** as ordinary HTML. There is no data file — find
the words on the page, change them, save.

A few things worth knowing before you edit:

**Pop-ups.** Each Experience row and Project card carries `data-modal="some-id"`,
and further down the file there is a `<template data-detail="some-id">` holding
what its pop-up shows. The template's `data-eyebrow` and `data-title` become the
pop-up heading. To reword a pop-up, edit its template. To add a card, copy an
existing card *and* its template, then give both a new matching id.

**Project filters.** A card's `data-groups` lists the filters it belongs to,
space separated, and those tokens must match a filter button's `data-filter`.
The number beside each filter is counted from the cards, so leave `<em></em>`
empty and it fills itself in.

**Publications.** Each row is a plain link. Swap the Scholar `href` for the real
DOI or publisher page when you have one. The "7 papers" count comes from the
number of rows.

**Scroll animations.** Anything with `class="reveal"` fades up as it enters the
viewport; a `data-stagger` wrapper makes its children arrive one after another.
Remove the class and the element simply appears. With JavaScript off the whole
page still renders — nothing is hidden behind script.

## Images

Drop real files over the placeholders — same names, same aspect ratios:

```
images/hero.jpg                 portrait, 4:5
images/about-1.jpg              3:4
images/about-2.jpg              4:3
images/about-3.jpg              4:3
images/projects/<slug>.jpg      16:10
images/creds/<slug>.jpg         square, shown at 46px — a certificate scan
                                or issuer mark; crops to fill
images/logos/<slug>.png         square org logo for resume.html, shown at
                                42px (34px in Certifications). Contained, not
                                cropped, on a light chip so dark logos read
images/story/story-1..5.jpg     16:10, inside the About pop-up
images/story/end-1..4.jpg       square, the closing strip in the About pop-up
```

A missing image degrades to a labelled frame rather than a broken icon.
`python tools/make_placeholders.py` regenerates the stand-ins.

## Organisation logos

`resume.html` shows a small logo chip beside every Education, Work Experience,
Teaching and Certification entry. The files are placeholders — replace them and
they appear, nothing else to change:

```
gsu  tehran  isfahan  tressed  sequence
acm  uw  google  iccompv  deeplearning-ai  coursera  jhu
```

Two slugs are reused: `gsu` and `tehran` each appear in more than one section.

**The page loads `images/logos/<slug>.png` — that exact name and extension.**
A `.jpg` sitting in the folder is ignored, which is the easiest way to end up
with empty slots.

If your logo is a JPEG (or a PNG with white behind it), drop it in as
`<slug>.jpg` and run:

```bash
python tools/prep_logos.py
```

That knocks out the white, trims to the artwork, and writes the `<slug>.png`
the page actually uses. Your original file is left alone. The white is removed
by flooding inward from the edges, so white *inside* a logo survives; a file
whose edges are not white is reported and skipped rather than mangled.

The slot has no fill and no frame, so the logo sits directly on the charcoal.
Dark logos will disappear — use white or reversed marks where the organisation
publishes them. Logos are contained rather than cropped, so any aspect ratio is
safe.

## Typefaces

Three faces, all free to use commercially:

- **Syncopate** — the hero name and section titles. Wide, geometric, monoline.
- **Outfit** — card, publication and pop-up titles, where things need to stay
  readable at small sizes.
- **Satoshi** (Fontshare) — body text. **IBM Plex Mono** — labels and figures.

Syncopate stands in for the look in the Adobe Stock specimen (asset 761608599).
It gets the proportions but not the angular cutouts, which no freely licensed
font has. Azonix and Anurati are personal-use-only; Ethnocentric and Neptune are
paid. To install one you have licensed, see `fonts/README.md` — it is a two-file
change through the `--font-hero` and `--hero-track` variables.

Each Fontshare family needs its own `<link>`; the API returns only one family
per request even if you pass several `f[]` parameters.

The hero name is sized to fill about 86% of its column at every width. "Vahdatpour"
measures 8.5em in Syncopate, so if you swap the face or lengthen the name, check
it still fits — the reveal animation clips overflow.

## Navigation

Navigation is split in two: a top bar with the name plus the Resume and LinkedIn
buttons, and a small dock fixed to the bottom of the viewport holding the section
links. The dock stays stowed over the hero and rises into place once you scroll
past it — or on the first Tab press, so it is never an invisible tab stop.

## After you edit the CSS

The stylesheet is linked as `css/styles.css?v=2`. Browsers cache CSS hard, so if
you change the styling and the page looks unchanged, bump that number to `?v=3`
in both `index.html` and `resume.html`. Ctrl+Shift+R also works for a one-off.

## Running locally

```bash
python -m http.server 5173 -d .
```

## Deploying

Create a repo named `moevahdatpour.github.io` under the `moevahdatpour` account,
push this folder to `main`, then Settings → Pages → Source: `main` / root. The
site appears at https://moevahdatpour.github.io within a minute or two.

## Notes

- Dark-only by design; `color-scheme: dark` is declared so form controls follow.
- Motion is fully disabled under `prefers-reduced-motion`.
- `.nojekyll` stops GitHub Pages running Jekyll over the folder.
