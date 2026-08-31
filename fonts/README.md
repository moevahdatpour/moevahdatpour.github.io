# fonts/

Empty on purpose. Self-hosted display fonts go here.

The hero name and section titles currently use **Syncopate**, loaded free from
Google Fonts. It is a stand-in for the look in the Adobe Stock specimen
(asset 761608599) — wide, geometric, monoline, circular bowls — but it has no
angular cutouts. No freely licensed font does.

## The fonts on the shortlist, and why none of them are here

| Font | Licence | Can it be self-hosted? |
| --- | --- | --- |
| Azonix | Free for personal use only | Only with the author's written permission |
| Anurati | Free for personal use only | Only with the author's written permission |
| Ethnocentric | Commercial (Typodermic) | Yes, once you buy a webfont licence |
| Neptune | Commercial | Yes, once you buy a webfont licence |

A desktop licence is not a webfont licence. Publishing a font file to a public
repo makes it downloadable by anyone, which most desktop licences prohibit.
Check what you are buying covers `@font-face` web embedding.

## Installing one you have licensed

1. Convert the `.otf`/`.ttf` to `.woff2` — https://transfonter.org
2. Save both here as `hero-display.woff2` and `hero-display.otf`
3. In `css/styles.css`: uncomment the `@font-face` block at the top, set
   `--font-hero: "Hero Display", ...`, and tune `--hero-track`
4. In `index.html`: drop `&family=Syncopate:wght@400;700` from the Google link

Uppercase-only fonts (Azonix and Anurati both are) are fine here — everything
using `--font-hero` is already set in uppercase.
