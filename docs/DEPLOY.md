# Deploying the product subdomains

Four product sites live alongside the existing `getapps.tech` marketing site in the
same Firebase project (`getapps-tech`), using Firebase Hosting's multi-site
support. The root site is untouched apart from the `ignore` list.

| Target | Directory | Domain |
| --- | --- | --- |
| `main` | `.` | getapps.tech |
| `getinterest` | `sites/getinterest` | getinterest.getapps.tech |
| `getpdf` | `sites/getpdf` | getpdf.getapps.tech |
| `getjson` | `sites/getjson` | getjson.getapps.tech |
| `getea` | `sites/getea` | getea.getapps.tech |

## 1. Create the hosting sites

Site IDs must be globally unique across Firebase, which is why they are prefixed:

```bash
firebase hosting:sites:create getapps-getinterest
firebase hosting:sites:create getapps-getpdf
firebase hosting:sites:create getapps-getjson
firebase hosting:sites:create getapps-getea
```

`.firebaserc` already maps deploy targets to those IDs. If you choose different
IDs, update the `targets` block there to match.

## 2. Attach the custom domains

In the Firebase console, under *Hosting → (site) → Add custom domain*, add
`getinterest.getapps.tech`, `getpdf.getapps.tech`, `getjson.getapps.tech` and
`getea.getapps.tech` to
their respective sites. Firebase will give you the DNS records to create at your
registrar — normally two A records per subdomain, or a CNAME if your DNS
provider supports flattening. Certificates are issued automatically once the
records propagate; allow up to 24 hours.

Subdomains are case-insensitive: `getInterest.getapps.tech` and
`getinterest.getapps.tech` are the same host. Every canonical URL, sitemap entry
and internal link in this repo uses lowercase, which is what you want for SEO —
one host, one canonical form.

## 3. Deploy

```bash
firebase deploy --only hosting
```

Or one at a time:

```bash
firebase deploy --only hosting:getinterest
```

## Local development

```bash
node tools/serve.mjs              # all four, ports 4320–4323
node tools/serve.mjs getinterest  # just one
```

The dev server reproduces Firebase's `cleanUrls` behaviour, so `/emi-calculator`
resolves to `emi-calculator.html` locally exactly as it will in production.

## Shared assets

`sites/_shared/` is the source of truth for `base.css`, `core.js`, `ads.js`, and
the footer and product-switcher markup. Per-site copies are generated:

```bash
node tools/sync-shared.mjs          # write
node tools/sync-shared.mjs --check  # verify only; non-zero exit if drifted
```

Edit the files under `sites/_shared/` and run the sync. **Never edit a per-site
copy** — it will be overwritten. In page HTML the shared regions are delimited by
`<!-- GA:FOOTER start -->` / `<!-- GA:FOOTER end -->` markers; everything between
them is replaced wholesale.

Worth adding `node tools/sync-shared.mjs --check` to CI so a hand-edited copy
cannot reach production.

## Per-product setup

- **GetInterest** — no backend. Rates live in
  `sites/getinterest/assets/data/banks.js`; edit the numbers and bump `updated`.
  Nothing else in the app hard-codes a rate.
- **GetPDF** — no backend. `assets/vendor/qpdf.{js,wasm}` is qpdf compiled to
  WebAssembly (Apache-2.0, licence bundled alongside it), served with a
  one-year immutable cache header.
- **GetJSON** — needs Supabase. See `supabase/README.md`. Until it is configured
  the site runs in a clearly-labelled demo mode rather than breaking.

## After launch

1. Verify each subdomain separately in Google Search Console — they are distinct
   properties — and submit each `sitemap.xml`.
2. Consider a separate GA4 property or stream per subdomain. All three currently
   report into the main site's `G-YRJQE0EMSY`, which is fine to start with but
   mixes tool traffic into marketing-site numbers.
3. Advertising is **off**: every position is commented out until an ad account
   exists. `node tools/ads.mjs --on` brings all 32 back, then one adapter
   function wires a network. See `docs/AD-INVENTORY.md`.
