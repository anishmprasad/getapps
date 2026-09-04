#!/usr/bin/env python3
"""Generate every social, Open Graph and icon asset for the GetApps sites.

    python3 tools/og/generate.py            # everything
    python3 tools/og/generate.py getpdf     # one site
    python3 tools/og/generate.py --icons    # icons + manifests only
    python3 tools/og/generate.py --social   # share images only

Source of truth is tools/og/brand.json. Nothing here is hand-edited output:
delete the generated folders and re-run to rebuild.
"""

import html
import json
import os
import struct
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
import templates as T  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((Path(__file__).parent / "brand.json").read_text())

# ---------------------------------------------------------------- variants

# Per-page share images. `primary_only` variants are rendered for the site's
# landing page alone — no one shares a story card of a privacy policy.
SHARE = [
    # key                w     h    layout    u     fmt     primary_only
    ("og",             1200,  630, "card",   12.0, "png",  False),
    ("square",         1200, 1200, "square", 12.0, "jpeg", False),
    ("portrait",       1080, 1350, "tall",   11.0, "jpeg", True),
    ("story",          1080, 1920, "story",  11.5, "jpeg", True),
]

# Per-brand profile artwork — one set per site, not per page.
PROFILE = [
    ("x-header",       1500,  500, "banner", 11.0, "jpeg"),
    ("linkedin-banner",1584,  396, "banner",  9.2, "jpeg"),
    ("youtube-banner", 2560, 1440, "banner", 17.0, "jpeg"),
    ("avatar",         1024, 1024, "avatar", 10.0, "png"),
    ("avatar-400",      400,  400, "avatar", 10.0, "png"),
]

# Brand logo lockups. These are the asset behind og:logo and the schema.org
# Organization logo, so they live at assets/ root rather than assets/social/.
LOGOS = [
    # key            w     h   layout       u     fmt
    ("logo",       1200,  400, "logo",     13.0, "png"),
    ("logo-square", 512,  512, "logostack", 7.4, "png"),
]

# name, px, plate background, corner radius (px), glyph size as % of plate
ICONS = [
    ("assets/icons/favicon-16.png",         16, T.INK, 3,   72),
    ("assets/icons/favicon-32.png",         32, T.INK, 7,   72),
    ("assets/icons/favicon-48.png",         48, T.INK, 11,  72),
    ("assets/icons/icon-192.png",          192, T.INK, 42,  70),
    ("assets/icons/icon-512.png",          512, T.INK, 112, 70),
    ("assets/icons/icon-maskable-512.png", 512, T.INK, 0,   54),
    ("assets/icons/mstile-150.png",        150, T.INK, 0,   64),
    ("apple-touch-icon.png",               180, T.INK, 0,   64),
]

ICO_SIZES = [16, 32, 48]

# Layout metrics per card shape, in --u multiples.
METRICS = {
    "card":   dict(pad=6.0, mark=5.4, word=3.15, eyebrow=1.42, head=5.15, sub=2.06,
                   subw=62, chip=1.48, wmark=34),
    "square": dict(pad=6.6, mark=6.6, word=3.90, eyebrow=1.72, head=6.30, sub=2.45,
                   subw=70, chip=1.72, wmark=44),
    "tall":   dict(pad=6.6, mark=6.6, word=3.90, eyebrow=1.72, head=6.30, sub=2.45,
                   subw=70, chip=1.72, wmark=46),
    "story":  dict(pad=6.6, mark=6.6, word=3.90, eyebrow=1.72, head=6.30, sub=2.45,
                   subw=70, chip=1.72, wmark=46),
    "banner": dict(pad=4.0, mark=4.6, word=2.90, eyebrow=1.30, head=3.50, sub=1.90,
                   subw=60, chip=1.35, wmark=0),
    "avatar": dict(pad=0,   mark=0,   word=0,    eyebrow=0,    head=0,    sub=0,
                   subw=0,  chip=0,   wmark=0),
    "logo":   dict(pad=0,   mark=7.4, word=4.60, eyebrow=0,    head=0,    sub=0,
                   subw=0,  chip=0,   wmark=0),
    "logostack": dict(pad=0, mark=17, word=6.20, eyebrow=0,    head=0,    sub=0,
                   subw=0,  chip=0,   wmark=0),
}

# Fraction of the banner width that stays clear of platform chrome
# (X crops the sides on mobile; LinkedIn overlays the avatar bottom-left).
BANNER_SAFE = 0.62


def esc(s):
    return html.escape(s, quote=False)


def chips_html(items):
    return "".join(f'<span class="chip"><span class="dot"></span>{esc(c)}</span>' for c in items)


def build_share_html(site, page, variant, w, h, layout, u):
    c1, c2 = site["accent"]
    m = dict(METRICS[layout])
    css = T.SHARE_CSS.substitute(w=w, h=h, u=u, c1=c1, c2=c2, ink=T.INK,
                                 fontface=T.font_css(),
                                 safew=int(w * BANNER_SAFE), **m)
    # The wordmark splits into a plain half and a gradient half. Most sites
    # are "Get" + the rest; brand.json can override the split.
    word = site.get("word") or ["Get", site["name"][3:]]  # "GetPDF" -> Get|PDF
    mark = site.get("mark", "getapps")
    tile = T.mark_tile(c1, c2, "t", mark)
    watermark = ("" if not m["wmark"] else
                 T.mark_glyph(c1, c2, "wm", mark).replace('class="glyph"', 'class="watermark"'))

    if layout == "avatar":
        body = T.AVATAR_BODY.substitute(glyph=T.mark_glyph(c1, c2, "g", mark))
        cls = "avatar"
    elif layout in ("logo", "logostack"):
        body = T.LOGO_BODY.substitute(tile=tile, worda=esc(word[0]), wordb=esc(word[1]))
        cls = layout
    elif layout == "banner":
        body = T.BANNER_BODY.substitute(
            tile=tile, worda=esc(word[0]), wordb=esc(word[1]),
            headline=esc(page["headline"].replace("\n", " ")),
            chips=chips_html(page.get("chips", [])[:3]),
            domain=esc(site["domain"]))
        cls = "banner"
    else:
        body = T.CARD_BODY.substitute(
            tile=tile, worda=esc(word[0]), wordb=esc(word[1]), eyebrow=esc(page["eyebrow"]),
            headline=esc(page["headline"]), sub=esc(page["sub"]),
            chips=chips_html(page.get("chips", [])), domain=esc(site["domain"]))
        cls = f"card {layout}"

    return T.SHARE_HTML.substitute(css=css, variant=cls, body=body,
                                   watermark=watermark)


def shoot(page_obj, doc, w, h, out: Path, fmt, check_fonts=True):
    out.parent.mkdir(parents=True, exist_ok=True)
    page_obj.set_viewport_size({"width": w, "height": h})
    page_obj.set_content(doc, wait_until="load")
    if check_fonts:
        page_obj.evaluate("""async () => {
            await Promise.all([
                document.fonts.load('700 40px "Space Grotesk"'),
                document.fonts.load('600 40px "Inter"'),
                document.fonts.load('400 40px "Inter"'),
                document.fonts.load('500 40px "JetBrains Mono"'),
            ]);
            await document.fonts.ready;
        }""")
        if not page_obj.evaluate('document.fonts.check(\'700 40px "Space Grotesk"\')'):
            raise SystemExit(f"Fonts failed to load for {out.name} — "
                             "run: python3 tools/og/fetch-fonts.py")
    kwargs = {"path": str(out), "type": fmt}
    if fmt == "jpeg":
        kwargs["quality"] = 90
    page_obj.screenshot(**kwargs)
    return out.stat().st_size


def social_name(page_key, variant, fmt, primary):
    ext = "jpg" if fmt == "jpeg" else fmt
    stem = "og" if primary else f"og-{page_key}"
    return f"{stem}.{ext}" if variant == "og" else f"{stem}-{variant}.{ext}"


def write_ico(png_paths, out: Path):
    """Pack PNGs into a multi-resolution .ico (PNG-compressed entries)."""
    blobs = [(p, p.read_bytes()) for p in png_paths]
    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = len(header) + 16 * len(blobs)
    entries, data = b"", b""
    for path, blob in blobs:
        size = int(path.stem.split("-")[-1])
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32,
                               len(blob), offset)
        data += blob
        offset += len(blob)
    out.write_bytes(header + entries + data)
    return out.stat().st_size


def write_manifest(site, root: Path):
    ub = site["urlBase"]
    man = {
        "name": site["name"],
        "short_name": site["manifest"]["short_name"],
        "description": site["manifest"]["description"],
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": site["themeColor"],
        "theme_color": site["themeColor"],
        "icons": [
            {"src": f"{ub}/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": f"{ub}/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": f"{ub}/icons/icon-maskable-512.png", "sizes": "512x512",
             "type": "image/png", "purpose": "maskable"},
            {"src": f"{ub}/favicon.svg", "sizes": "any", "type": "image/svg+xml"},
        ],
    }
    (root / "site.webmanifest").write_text(json.dumps(man, indent=2) + "\n")

    (root / "browserconfig.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<browserconfig><msapplication><tile>\n"
        f'  <square150x150logo src="{ub}/icons/mstile-150.png"/>\n'
        f"  <TileColor>{site['themeColor']}</TileColor>\n"
        "</tile></msapplication></browserconfig>\n")


def run(only=None, do_social=True, do_icons=True):
    total = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb",
                                           "--font-render-hinting=none"])
        ctx = browser.new_context(device_scale_factor=1)
        pg = ctx.new_page()

        for site in CFG["sites"]:
            if only and site["key"] not in only:
                continue
            root = ROOT / site["root"]
            print(f"\n▸ {site['name']}  ({site['domain']})")

            if do_social:
                for page in site["pages"]:
                    if page.get("reuse"):
                        continue  # archived copy — shares the landing card
                    primary = bool(page.get("primary"))
                    for key, w, h, layout, u, fmt, prim_only in SHARE:
                        if prim_only and not primary:
                            continue
                        doc = build_share_html(site, page, key, w, h, layout, u)
                        name = social_name(page["key"], key, fmt, primary)
                        out = root / site["assetBase"] / "social" / name
                        kb = shoot(pg, doc, w, h, out, fmt) / 1024
                        total += 1
                        print(f"    {name:<34} {w}x{h:<5} {kb:6.0f} KB")

                landing = next(p for p in site["pages"] if p.get("primary"))
                for key, w, h, layout, u, fmt in LOGOS:
                    doc = build_share_html(site, landing, key, w, h, layout, u)
                    out = root / site["assetBase"] / f"{key}.{fmt}"
                    kb = shoot(pg, doc, w, h, out, fmt) / 1024
                    total += 1
                    print(f"    {key + '.' + fmt:<34} {w}x{h:<5} {kb:6.0f} KB")

                for key, w, h, layout, u, fmt in PROFILE:
                    doc = build_share_html(site, landing, key, w, h, layout, u)
                    ext = "jpg" if fmt == "jpeg" else fmt
                    out = root / site["assetBase"] / "social" / f"{key}.{ext}"
                    kb = shoot(pg, doc, w, h, out, fmt) / 1024
                    total += 1
                    print(f"    {key + '.' + ext:<34} {w}x{h:<5} {kb:6.0f} KB")

            if do_icons:
                c1, c2 = site["accent"]
                glyph = T.mark_glyph(c1, c2, "g", site.get("mark", "getapps"))
                for rel, size, plate, radius, inner in ICONS:
                    doc = T.ICON_HTML.substitute(size=size,
                                                 plate=plate, radius=radius,
                                                 inner=inner, glyph=glyph)
                    out = root / rel
                    shoot(pg, doc, size, size, out, "png", check_fonts=False)
                    total += 1
                    print(f"    {rel:<34} {size}x{size}")

                ico = write_ico([root / f"assets/icons/favicon-{s}.png" for s in ICO_SIZES],
                                root / "favicon.ico")
                total += 1
                print(f"    {'favicon.ico':<34} {'+'.join(map(str, ICO_SIZES)):<9} {ico / 1024:6.1f} KB")

                (root / "assets/icons/safari-pinned-tab.svg").write_text(
                    T.pinned_tab_svg(site.get("mark", "getapps")))
                write_manifest(site, root)
                total += 3
                print(f"    {'safari-pinned-tab.svg':<34}")
                print(f"    {'site.webmanifest + browserconfig.xml':<34}")

        ctx.close()
        browser.close()
    print(f"\n✓ {total} files written")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    social = "--icons" not in args
    icons = "--social" not in args
    sites = [a for a in args if not a.startswith("--")] or None
    run(sites, social, icons)
