# Social, Open Graph & icon assets

Every share image, favicon, app icon and web manifest across the four sites is
**generated**, not hand-drawn. The source of truth is
[`tools/og/brand.json`](../tools/og/brand.json); everything else is output.

## Rebuilding

```bash
python3 tools/og/generate.py        # render every image + manifest
python3 tools/og/inject-meta.py     # write the <head> tags into every page
```

Scope either command to one site by name, e.g. `python3 tools/og/generate.py getpdf`.
`generate.py` also takes `--social` / `--icons` to do only half the work.
`inject-meta.py --check` exits non-zero if any page's tags are out of date —
useful as a pre-deploy gate.

Requirements: `playwright` with Chromium (`pip install playwright && playwright
install chromium`). Fonts are vendored under `tools/og/fonts/`, so a rebuild
needs no network; refresh them with `python3 tools/og/fetch-fonts.py`.

## What gets produced, per site

Written to `<site>/assets/social/`:

| File | Size | Where it is used |
| --- | --- | --- |
| `og.png` | 1200×630 | `og:image` / `twitter:image` — Facebook, LinkedIn, Slack, Discord, iMessage |
| `og-square.jpg` | 1200×1200 | WhatsApp previews, Instagram feed, LinkedIn square posts |
| `og-portrait.jpg` | 1080×1350 | Instagram / Facebook portrait feed (4:5) |
| `og-story.jpg` | 1080×1920 | Instagram, Facebook and LinkedIn stories (9:16) |
| `og-<page>.png` | 1200×630 | Per-page share card for every non-landing page |
| `og-<page>-square.jpg` | 1200×1200 | Square variant of the same |
| `x-header.jpg` | 1500×500 | X / Twitter profile header |
| `linkedin-banner.jpg` | 1584×396 | LinkedIn profile or company banner |
| `youtube-banner.jpg` | 2560×1440 | YouTube channel art |
| `avatar.png` | 1024×1024 | Profile picture, any platform |
| `avatar-400.png` | 400×400 | Profile picture where a small upload is required |

Brand logo lockups, written to `<site>/assets/`:

| File | Size | Where it is used |
| --- | --- | --- |
| `logo.png` | 1200×400 | `og:logo`; the horizontal mark-plus-wordmark lockup |
| `logo-square.png` | 512×512 | schema.org `Organization.logo` — the logo Google shows in search |

Icons, written to `<site>/assets/icons/` and the site root:

| File | Size | Purpose |
| --- | --- | --- |
| `assets/favicon.svg` | vector | Primary favicon (hand-authored, not generated) |
| `assets/icons/favicon-16/32/48.png` | 16–48 | Raster favicon fallbacks |
| `favicon.ico` | 16+32+48 | Legacy browsers and the bare `/favicon.ico` probe |
| `apple-touch-icon.png` | 180×180 | iOS home screen (square — iOS applies its own mask) |
| `assets/icons/icon-192.png`, `icon-512.png` | PWA | Android install prompt, manifest |
| `assets/icons/icon-maskable-512.png` | 512×512 | Android adaptive icon, 80% safe zone |
| `assets/icons/mstile-150.png` | 150×150 | Windows tile |
| `assets/icons/safari-pinned-tab.svg` | vector | Safari pinned-tab mask |
| `site.webmanifest`, `browserconfig.xml` | — | PWA and Windows tile metadata |

## How the logo actually reaches a consumer

There is no `og:logo` in the Open Graph spec, so it is emitted alongside the
mechanisms that are really read:

- **`og:image`** — the share card. This is what every unfurl renders.
- **schema.org `Organization.logo`** — what Google uses for the search result
  and knowledge-panel logo. Injected on all 29 pages; the four `index.html`
  files keep their richer hand-written `Organization` instead, and those point
  at the same asset.
- **`<link rel="image_src">`** — legacy, still read by some embed services.
- **`og:logo`** — non-standard, ignored by the major platforms, honoured by a
  few aggregators. Cheap to include, so it is included.

A nested `publisher` Organization inside an article's JSON-LD is *not* treated
as an existing Organization node — those pages still get one of their own,
because a bare `publisher` carries no logo.

## Archived pages

`v1/`, `v2/` and `v3/` are earlier design iterations that are still published
under `getapps.tech/v1/…`. They already canonicalise to the live pages, so they
reuse the main landing card (`reuse: true` in `brand.json`) rather than
rendering — and competing with — cards of their own.

## Brand colours

Each site gets its own gradient; the mark and layout stay identical so the four
read as one family.

| Site | Accent | Domain |
| --- | --- | --- |
| GetApps | `#6D5EF8` → `#22D3EE` | getapps.tech |
| GetPDF | `#FF7A59` → `#FFB86B` | getpdf.getapps.tech |
| GetJSON | `#22D3EE` → `#6D5EF8` | getjson.getapps.tech |
| GetInterest | `#3DDC97` → `#22D3EE` | getinterest.getapps.tech |

## Editing copy

Headlines, sub-copy, eyebrows and chips all live in `brand.json`, one entry per
page. Change the text there and re-run both scripts — never edit the generated
images or the `<!-- social:begin … social:end -->` block in a page's `<head>`.

To add a page, append an entry to that site's `pages` array with `key`, `file`,
`path`, `eyebrow`, `headline` (a `\n` forces a line break), `sub` and `chips`.
