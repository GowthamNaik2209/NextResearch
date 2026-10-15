# NextResearch media engine

Turns the live platform into a fortnight of Instagram, LinkedIn and Substack content. The pipeline captures screenshots and screen recordings of the site, composes them into branded post graphics, and builds a review calendar.

```
content/inventory.mjs   <- the plan: every post, caption, slide spec and source (edit this)
content/substack/       <- newsletter drafts (markdown)
scripts/capture.mjs     -> out/raw/*.png        platform screenshots (desktop, phone, decks, stock cards)
scripts/record.mjs      -> out/video/*.mp4      3D-explorer flythroughs, 9:16 Reels + 4:5 feed
scripts/compose.mjs     -> out/posts/<id>/      upload-ready PNGs (1080x1350), LinkedIn PDFs, Reel + cover, caption.txt
scripts/build-calendar.mjs -> calendar/         review page data + content/exports/<platform>.md
```

## Run it

Everything runs in this folder. It uses your installed Google Chrome, so there's no browser download.

```bash
cd media && npm install
```

Capture from production for clean shots. Localhost works too, but production has no dev badge and is faster.

```bash
BASE_URL=https://<your-domain> npm run capture
```

```bash
BASE_URL=https://<your-domain> npm run record
```

```bash
SITE_URL=https://<your-domain> IG_HANDLE=@<handle> npm run compose
```

```bash
SITE_URL=https://<your-domain> npm run calendar
```

To work on a single post or sector, pass a filter: `npm run compose -- ig03`, `npm run capture -- naval`, `npm run record -- railways`.

## Each fortnight

1. Copy `content/inventory.mjs` to a new fortnight file (or edit in place). Keep each post's `sources`.
2. Re-run `capture` so the screenshots match the current site. New company pages and sectors show up automatically.
3. Run `compose`, review the graphics in `out/posts/`, then run `calendar` and republish the review page.
4. Before posting, re-check every company figure against the live stock card. Seed financials have an "as of" date.

## Rules for every post

- Education and data only. No buy, sell or hold language, targets, return claims, or "multibagger" (SEBI finfluencer rules).
- Screens state their rule and say "not recommendations".
- Every post and email carries the disclaimer, and every link carries UTM tags (`utm_content` = post id).
