# App icons — drop files here

Expected files (PNG, square, mascot centered with padding):

- `icon-puff.png` — the main Puff cloud (any size ≥1024px; used as-is)
- `icon-192.png` — 192×192 (PWA manifest)
- `icon-512.png` — 512×512 (PWA manifest + maskable)
- `icon-180.png` — 180×180 (iOS touch icon; falls back to icon-puff)
- `icon-midnight.png`, `icon-matcha.png`, `icon-sunset.png`, `icon-ocean.png`,
  `icon-void.png`, `icon-espresso.png`, `icon-indigo.png`, `icon-forest.png`,
  `icon-zine.png` — per-theme mascots (any square size; in-app + tab icon
  follow the active theme, missing files fall back to icon-puff.png)

Generate with e.g. ImageMagick:
  magick icon-puff.png -resize 512x512 icon-512.png
  magick icon-puff.png -resize 192x192 icon-192.png
  magick icon-puff.png -resize 180x180 icon-180.png
