"""HTML/SVG templates for the GetApps social + icon asset pipeline.

Every template is a self-contained document rendered by Playwright at an exact
pixel size. All spacing is expressed in multiples of `--u`, a per-variant unit,
so one layout scales cleanly from a 1584x396 banner to a 1080x1920 story.

Fonts are vendored under tools/og/fonts and inlined as base64, so a rebuild is
deterministic and needs no network. Refresh them with tools/og/fetch-fonts.py.
"""

import base64
from functools import lru_cache
from pathlib import Path
from string import Template

FONT_DIR = Path(__file__).parent / "fonts"
INK = "#06070B"

# file stem -> (css family, weight)
_FONTS = [
    ("Inter-400", "Inter", 400),
    ("Inter-500", "Inter", 500),
    ("Inter-600", "Inter", 600),
    ("SpaceGrotesk-600", "Space Grotesk", 600),
    ("SpaceGrotesk-700", "Space Grotesk", 700),
    ("JetBrainsMono-500", "JetBrains Mono", 500),
]


@lru_cache(maxsize=1)
def font_css():
    """@font-face rules with the woff2 payloads inlined as data URIs."""
    rules = []
    for stem, family, weight in _FONTS:
        path = FONT_DIR / f"{stem}.woff2"
        if not path.exists():
            raise SystemExit(
                f"Missing font {path}. Run: python3 tools/og/fetch-fonts.py")
        b64 = base64.b64encode(path.read_bytes()).decode()
        rules.append(
            f"@font-face{{font-family:'{family}';font-style:normal;"
            f"font-weight:{weight};font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return "".join(rules)


# ---- product marks -------------------------------------------------------
# Every site draws the GetApps four-tile mark unless brand.json names another
# under "mark". A mark is a function of the gradient id: it renders the artwork
# inside a 0 0 32 32 viewBox and nothing else, so the tile, glyph, icon and
# lockup templates all stay shape-agnostic.

def _mark_getapps(uid, scale=1.0):
    o = (32 - 32 * scale) / 2
    return f"""<g transform="translate({o:.3f} {o:.3f}) scale({scale})">
  <rect x="1.6" y="1.6" width="12.8" height="12.8" rx="4.1" fill="none" stroke="url(#{uid})" stroke-width="2.4"/>
  <rect x="17.6" y="1.6" width="12.8" height="12.8" rx="6.4" fill="url(#{uid})"/>
  <rect x="1.6" y="17.6" width="12.8" height="12.8" rx="6.4" fill="url(#{uid})" opacity=".55"/>
  <rect x="17.6" y="17.6" width="12.8" height="12.8" rx="4.1" fill="none" stroke="url(#{uid})" stroke-width="2.4"/>
</g>"""


def _mark_paraphrase(uid, scale=1.0):
    """Two lines of text inside a rewrite cycle — the Paraphrase app icon.

    The artwork is authored on a 108 grid; the nested viewBox crops it to its
    own ink bounds and rescales, so the caller only ever thinks in 32s.
    """
    w, h = 26 * scale, 32 * scale
    return f"""<svg x="{(32 - w) / 2:.3f}" y="{(32 - h) / 2:.3f}" width="{w:.3f}" height="{h:.3f}"
       viewBox="22.7 32.3 62.6 43.4">
  <g fill="none" stroke="url(#{uid})" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M29.6,45.1 A26,26 0 0 1 78.4,45.1"/>
    <path d="M81.8,35.8 L78.4,45.1 L70.8,38.7"/>
    <path d="M78.4,62.9 A26,26 0 0 1 29.6,62.9"/>
    <path d="M26.2,72.2 L29.6,62.9 L37.2,69.3"/>
    <path d="M40,48 L68,48"/>
    <path d="M40,60 L58,60" stroke-opacity="0.72"/>
  </g>
</svg>"""


MARKS = {"getapps": _mark_getapps, "paraphrase": _mark_paraphrase}


def mark_glyph(c1, c2, uid="g", mark="getapps"):
    """The product mark on a transparent ground, viewBox 0 0 32 32."""
    return f"""<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" class="glyph">
  <defs><linearGradient id="{uid}" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
  {MARKS[mark](uid)}
</svg>"""


def mark_tile(c1, c2, uid="t", mark="getapps"):
    """The mark inside its dark rounded tile — matches the site favicon."""
    return f"""<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" class="tile">
  <defs><linearGradient id="{uid}" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
  <rect width="32" height="32" rx="7.4" fill="{INK}"/>
  <rect x=".5" y=".5" width="31" height="31" rx="7" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
  {MARKS[mark](uid, 0.775)}
</svg>"""


_PINNED = {
    "getapps": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M1 1h6.2v6.2H1V1zm1.8 1.8v2.6h2.6V2.8H2.8z"/>
  <path d="M8.8 1H15v6.2H8.8V1z"/>
  <path d="M1 8.8h6.2V15H1V8.8z"/>
  <path d="M8.8 8.8H15V15H8.8V8.8zm1.8 1.8v2.6h2.6v-2.6h-2.6z"/>
</svg>
""",
    "paraphrase": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="22.7 32.3 62.6 43.4">
  <g fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M29.6,45.1 A26,26 0 0 1 78.4,45.1"/>
    <path d="M81.8,35.8 L78.4,45.1 L70.8,38.7"/>
    <path d="M78.4,62.9 A26,26 0 0 1 29.6,62.9"/>
    <path d="M26.2,72.2 L29.6,62.9 L37.2,69.3"/>
    <path d="M40,48 L68,48"/>
    <path d="M40,60 L58,60"/>
  </g>
</svg>
""",
}


def pinned_tab_svg(mark="getapps"):
    """Monochrome mask icon for Safari pinned tabs — one colour, no fill."""
    return _PINNED[mark]


SHARE_CSS = Template("""
$fontface
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px}
body{
  --u:${u}px;
  --c1:$c1; --c2:$c2;
  background:$ink;
  color:#EEF0F6;
  font-family:"Inter",sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow:hidden;position:relative;
}
.bg{position:absolute;inset:0;overflow:hidden}
.bg::before{
  content:"";position:absolute;inset:0;
  background:
    radial-gradient(115% 125% at 6% -20%, color-mix(in srgb, var(--c1) 40%, transparent) 0%, transparent 56%),
    radial-gradient(95% 105% at 106% 114%, color-mix(in srgb, var(--c2) 26%, transparent) 0%, transparent 52%);
}
.bg::after{
  content:"";position:absolute;inset:0;
  background-image:radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px);
  background-size:calc(var(--u) * 2.6) calc(var(--u) * 2.6);
  mask-image:linear-gradient(140deg, rgba(0,0,0,.9), transparent 66%);
  -webkit-mask-image:linear-gradient(140deg, rgba(0,0,0,.9), transparent 66%);
}
/* clean lens-flare glow: screen blend keeps it luminous instead of muddy */
.orb{
  position:absolute;mix-blend-mode:screen;
  width:calc(var(--u) * 40);height:calc(var(--u) * 40);
  right:calc(var(--u) * -8);bottom:calc(var(--u) * -10);
  border-radius:50%;
  background:radial-gradient(circle at 50% 50%,
    color-mix(in srgb, var(--c2) 78%, white) 0%,
    var(--c1) 38%, transparent 68%);
  filter:blur(calc(var(--u) * 3.4));
  opacity:.42;
}
.rule{position:absolute;top:0;left:0;right:0;height:calc(var(--u) * .34);
  background:linear-gradient(90deg, var(--c1), var(--c2), var(--c1));}
.vignette{position:absolute;inset:0;
  background:radial-gradient(135% 115% at 46% 44%, transparent 46%, rgba(0,0,0,.5) 100%);}
.watermark{position:absolute;opacity:.055;pointer-events:none;
  width:calc(var(--u) * $wmark);height:calc(var(--u) * $wmark);
  right:calc(var(--u) * -6);bottom:calc(var(--u) * -6);}

.stage{
  position:relative;height:100%;width:100%;
  padding:calc(var(--u) * $pad);
  display:flex;flex-direction:column;gap:calc(var(--u) * 3);
}
.top{display:flex;align-items:center;gap:calc(var(--u) * 1.7)}
.tile{width:calc(var(--u) * $mark);height:calc(var(--u) * $mark);flex:none;
  filter:drop-shadow(0 calc(var(--u)*.7) calc(var(--u)*1.6) rgba(0,0,0,.55))}
.word{font-family:"Space Grotesk","Inter",sans-serif;font-weight:700;
  font-size:calc(var(--u) * $word);letter-spacing:-.015em;line-height:1}
.word .a{color:#EEF0F6}
.word .b{background:linear-gradient(100deg, var(--c1), var(--c2));
  -webkit-background-clip:text;background-clip:text;color:transparent}

.mid{flex:1;display:flex;flex-direction:column;justify-content:center;
  gap:calc(var(--u) * 1.5);min-height:0}
.eyebrow{font-size:calc(var(--u) * $eyebrow);font-weight:600;text-transform:uppercase;
  letter-spacing:.16em;color:var(--c2)}
h1{
  font-family:"Space Grotesk","Inter",sans-serif;font-weight:700;
  font-size:calc(var(--u) * $head);line-height:1.06;letter-spacing:-.028em;
  color:#F4F6FB;white-space:pre-line;
  text-shadow:0 calc(var(--u)*.3) calc(var(--u)*2.4) rgba(0,0,0,.45);
}
p.sub{font-size:calc(var(--u) * $sub);line-height:1.42;color:#A6AEBF;font-weight:400;
  max-width:calc(var(--u) * $subw)}

.foot{display:flex;align-items:center;justify-content:space-between;
  gap:calc(var(--u) * 2);flex-wrap:wrap}
.chips{display:flex;gap:calc(var(--u) * 1.05);flex-wrap:wrap}
.chip{
  font-size:calc(var(--u) * $chip);font-weight:500;color:#C9D0DC;
  padding:calc(var(--u) * .78) calc(var(--u) * 1.55);
  border:1px solid rgba(255,255,255,.15);border-radius:999px;
  background:rgba(255,255,255,.045);white-space:nowrap;
}
.chip .dot{display:inline-block;width:calc(var(--u)*.62);height:calc(var(--u)*.62);
  border-radius:50%;background:linear-gradient(120deg,var(--c1),var(--c2));
  margin-right:calc(var(--u)*.72);vertical-align:middle}
.domain{font-family:"JetBrains Mono",monospace;font-weight:500;
  font-size:calc(var(--u) * $chip);color:#7C8698;letter-spacing:-.01em;white-space:nowrap}

/* ---- square + portrait + story: bottom-weighted poster composition ----
   The tall shapes have far more room than the copy needs, so the text block
   is anchored above the footer and the glow moves up to fill the head space. */
body.square .mid,body.tall .mid{justify-content:flex-end;padding-bottom:calc(var(--u)*2.4)}
body.square .orb,body.tall .orb,body.story .orb{
  top:calc(var(--u) * -12);bottom:auto;opacity:.46}
body.square .watermark,body.tall .watermark,body.story .watermark{
  right:calc(var(--u)*-8);bottom:calc(var(--u)*-9)}
body.square .vignette,body.tall .vignette,body.story .vignette{
  background:radial-gradient(120% 90% at 50% 30%, transparent 40%, rgba(0,0,0,.55) 100%)}

/* ---- story (9:16): one centred block, deliberate air above and below ---- */
body.story .stage{justify-content:center;gap:calc(var(--u)*3.2)}
body.story .mid{flex:0 0 auto;justify-content:flex-start}
body.story .foot{flex-direction:column;align-items:flex-start;
  gap:calc(var(--u)*2.2);margin-top:calc(var(--u)*1.6)}

/* ---- banner: one centred stack inside the platform safe area ---- */
body.banner .stage{align-items:center;justify-content:center;text-align:center}
body.banner .safe{display:flex;flex-direction:column;align-items:center;
  gap:calc(var(--u)*1.7);max-width:${safew}px}
body.banner .top{justify-content:center}
body.banner h1{white-space:normal;text-wrap:balance}
body.banner .orb{right:auto;left:50%;transform:translateX(-50%);
  bottom:calc(var(--u) * -22);opacity:.34}
body.banner .watermark{display:none}

/* ---- logo lockups: no card furniture, just the mark and wordmark ----
   These are the brand asset referenced by og:logo and schema.org logo, so
   they stay quiet: flat ink ground, one soft accent wash, nothing else. */
body.logo,body.logostack{display:flex;align-items:center;justify-content:center}
body.logo .rule,body.logostack .rule,
body.logo .vignette,body.logostack .vignette,
body.logo .watermark,body.logostack .watermark,
body.logo .bg::after,body.logostack .bg::after{display:none}
body.logo .bg::before,body.logostack .bg::before{
  background:radial-gradient(90% 120% at 50% 0%,
    color-mix(in srgb, var(--c1) 20%, transparent) 0%, transparent 62%)}
body.logo .orb,body.logostack .orb{
  left:50%;right:auto;top:auto;bottom:calc(var(--u) * -26);
  transform:translateX(-50%);opacity:.24}
body.logo .lockup{position:relative;display:flex;align-items:center;
  gap:calc(var(--u) * 1.9)}
body.logostack .lockup{position:relative;display:flex;flex-direction:column;
  align-items:center;gap:calc(var(--u) * 1.9)}
body.logostack .tile{width:calc(var(--u) * $mark);height:calc(var(--u) * $mark)}

/* ---- avatar: mark only, centred ---- */
body.avatar{display:flex;align-items:center;justify-content:center}
body.avatar .glyph{position:relative;width:56%;height:56%;
  filter:drop-shadow(0 2% 5% rgba(0,0,0,.55))}
body.avatar .watermark,body.avatar .rule{display:none}
""")

SHARE_HTML = Template("""<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>$css</style></head>
<body class="$variant">
  <div class="bg"><div class="orb"></div><div class="vignette"></div></div>
  <div class="rule"></div>$watermark
  $body
</body></html>""")

CARD_BODY = Template("""<div class="stage">
    <div class="top">$tile<div class="word"><span class="a">$worda</span><span class="b">$wordb</span></div></div>
    <div class="mid">
      <div class="eyebrow">$eyebrow</div>
      <h1>$headline</h1>
      <p class="sub">$sub</p>
    </div>
    <div class="foot"><div class="chips">$chips</div><div class="domain">$domain</div></div>
  </div>""")

BANNER_BODY = Template("""<div class="stage"><div class="safe">
    <div class="top">$tile<div class="word"><span class="a">$worda</span><span class="b">$wordb</span></div></div>
    <h1>$headline</h1>
    <div class="chips">$chips</div>
    <div class="domain">$domain</div>
  </div></div>""")

AVATAR_BODY = Template("$glyph")

LOGO_BODY = Template("""<div class="lockup">$tile
    <div class="word"><span class="a">$worda</span><span class="b">$wordb</span></div>
  </div>""")

ICON_HTML = Template("""<!doctype html><html><head><meta charset="utf-8"><style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:${size}px;height:${size}px}
body{background:transparent;display:flex;align-items:center;justify-content:center;overflow:hidden}
.plate{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  background:$plate;border-radius:${radius}px}
svg{width:$inner%;height:$inner%;display:block}
</style></head><body><div class="plate">$glyph</div></body></html>""")
