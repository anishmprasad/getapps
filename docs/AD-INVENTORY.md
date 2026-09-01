# Ad inventory

Ad space is **reserved but not wired**. Every slot renders a neutral placeholder
at exactly the height the real creative will occupy, so switching advertising on
causes **zero cumulative layout shift** — the reserved box is already the right
size before anything fills it.

Slot geometry lives in one place: `sites/_shared/js/ads.js`. Adding a slot to a
page is one attribute.

```html
<div class="wrap">
  <span class="ad__label">Advertisement</span>
  <div class="ad" data-slot="results-native"></div>
</div>
```

## The inventory

| Slot id | Format | Desktop | Mobile | Where it sits |
| --- | --- | --- | --- | --- |
| `top-leaderboard` | leaderboard | 970×90 / 728×90 | 320×100 | Directly under the hero, above the tool |
| `results-native` | native | 970×132 | 300×250 | Immediately after a result appears — the highest-intent moment on the page |
| `inline-rect` | rectangle | 336×280 | 300×250 | Inside long-form content |
| `sidebar-sticky` | sidebar | 300×600 | *hidden* | Sticky rail, `/banks` only. Desktop-only by design |
| `content-mid` | native | 728×132 | 300×250 | Between two content sections |
| `footer-banner` | footer | 728×90 | 320×100 | Above the footer |

`sidebar-sticky` carries `desktopOnly`, so it is removed below 1180px rather
than being squeezed — a 300×600 has nowhere sensible to go on a phone.

## Current placement

| Page | Slots |
| --- | --- |
| getinterest `/` | top-leaderboard, results-native*, content-mid, footer-banner |
| getinterest `/emi-calculator`, `/fd-calculator`, `/sip-calculator` | top-leaderboard, results-native*, content-mid, footer-banner |
| getinterest `/banks` | top-leaderboard, **sidebar-sticky**, content-mid, footer-banner |
| getpdf `/` | results-native, content-mid, footer-banner |
| getpdf `/how-to-remove-pdf-password` | top-leaderboard, content-mid, footer-banner |
| getjson `/` | results-native, content-mid, footer-banner |
| getjson `/docs` | top-leaderboard, content-mid, footer-banner |
| getjson `/dashboard` | footer-banner |

\* injected into the results panel by the app when a calculation completes, then
registered with `GAds.refresh()`.

Privacy pages carry no advertising at all — they exist to be read and trusted.

## Turning it on

`ads.js` is network-agnostic on purpose. One adapter function is the whole
integration:

```js
GAds.setAdapter(function (slot) {
  // slot.id    → "results-native"
  // slot.def   → { fmt, sizes, desktopOnly }
  // slot.mount → the empty div to fill; already at the reserved height
  var ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.cssText = "display:block;width:100%;height:100%";
  ins.dataset.adClient = "ca-pub-XXXXXXXXXXXXXXXX";
  ins.dataset.adSlot = SLOT_IDS[slot.id];
  ins.dataset.fullWidthResponsive = "true";
  slot.mount.appendChild(ins);
  (window.adsbygoogle = window.adsbygoogle || []).push({});
});
GAds.enable();
```

Slots fill lazily — a slot is only handed to the adapter when it comes within
`lazyMargin` (320px) of the viewport, so nothing below the fold costs a request
until it is nearly seen.

## Before going live

- **A privacy policy is mandatory** for most ad networks. Each subdomain already
  has one at `/privacy`, describing what advertising does and does not see.
- **Consent.** Ad networks set identifiers; in the EU/UK a CMP is required. The
  adapter is the right place to gate `GAds.enable()` on consent.
- **Ads.txt.** If you use a network that requires it, place `ads.txt` at the root
  of each subdomain — they are separate hosts and each needs its own.
- **Verify each subdomain separately** in Search Console and in the ad network.
  `getinterest.getapps.tech` and `getpdf.getapps.tech` are distinct properties.

## Deliberate limits

- Nothing is placed inside a calculator's inputs, the PDF drop area or the JSON
  editor. Ads sit around the tool, never inside it.
- No interstitials, no auto-playing video, no anchored overlays. Those earn more
  per impression and cost more in returning visitors, which for tools like these
  is the wrong trade.
- Ad markup never renders above the `<h1>`, so the first thing a visitor sees is
  the thing they came for.
