# LUMIC — AI Smart Glasses landing page

Scroll-driven one-page site for the LUMIC AI smart glasses. The hero is the
product video played frame-by-frame as you scroll; feature captions run over the
clip, then the About and Order sections reveal one-by-one. Hebrew (RTL, default),
English and Russian, with a localized WhatsApp order CTA.

## Run locally
```
python -m http.server 8155 --directory .
# open http://localhost:8155/
```

## Structure
- `index.html` — markup, three-language `data-i18n` hooks
- `style.css` — warm-cream / copper design tokens + layout
- `script.js` — scroll→frame scrub, captions, reveal, language switch, WhatsApp pre-fill
- `i18n.js` — he / en / ru strings (incl. localized `wa_msg`)
- `frames/` — 200-frame JPEG sequence extracted from the source clip
- `assets/` — `logo.svg`, `favicon.svg`

## Brand
Matte-black product on warm cream (matches the video wall so the contain-fit
letterbox bars blend), copper accent echoing the box and the temple emblem.
Display: Space Grotesk · Body: Inter / Heebo / Noto Sans.

## Order CTA
WhatsApp `972535422650`, message pre-filled and localized per language. Price ₪499.

## Regenerate frames
```
node ../tools/extract_frames.mjs --video "<clip>.mp4" --out ./frames
```
(uses signed Microsoft Edge — works under Smart App Control; no ffmpeg needed)
