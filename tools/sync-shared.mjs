#!/usr/bin/env node
/**
 * Sync shared assets + partial regions from sites/_shared into each product site.
 *
 *   node tools/sync-shared.mjs          # write
 *   node tools/sync-shared.mjs --check  # verify only (non-zero exit if drifted)
 *
 * Partial regions in page HTML are delimited by markers:
 *   <!-- GA:FOOTER start -->  ...generated...  <!-- GA:FOOTER end -->
 * Anything between them is replaced wholesale, so never hand-edit inside.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITES = ["getinterest", "getpdf", "getjson", "getea"];
const check = process.argv.includes("--check");
let drift = 0;

/* ---- 1. shared css/js ---- */
const ASSETS = [
  ["css/base.css", "assets/css/base.css"],
  ["js/core.js",   "assets/js/core.js"],
  ["js/ads.js",    "assets/js/ads.js"],
];
for (const site of SITES) {
  for (const [src, dest] of ASSETS) {
    const from = join(root, "sites/_shared", src);
    const to = join(root, "sites", site, dest);
    mkdirSync(dirname(to), { recursive: true });
    const a = readFileSync(from, "utf8");
    let b = null;
    try { b = readFileSync(to, "utf8"); } catch {}
    if (a !== b) {
      drift++;
      if (check) console.log(`DRIFT  sites/${site}/${dest}`);
      else { copyFileSync(from, to); console.log(`copied sites/${site}/${dest}`); }
    }
  }
}

/* ---- 2. partial regions ---- */
const PARTIALS = {
  FOOTER:   readFileSync(join(root, "sites/_shared/partials/footer.html"), "utf8").trimEnd(),
  SWITCHER: readFileSync(join(root, "sites/_shared/partials/switcher.html"), "utf8").trimEnd(),
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

for (const site of SITES) {
  for (const file of walk(join(root, "sites", site))) {
    const orig = readFileSync(file, "utf8");
    let next = orig;
    for (const [name, body] of Object.entries(PARTIALS)) {
      const re = new RegExp(
        `(<!-- GA:${name} start -->)[\\s\\S]*?(<!-- GA:${name} end -->)`, "g"
      );
      next = next.replace(re, (_m, a, b) => `${a}\n${body}\n${b}`);
    }
    if (next !== orig) {
      drift++;
      const rel = file.slice(root.length + 1);
      if (check) console.log(`DRIFT  ${rel}`);
      else { writeFileSync(file, next); console.log(`patched ${rel}`); }
    }
  }
}

if (check && drift) { console.error(`\n${drift} file(s) out of sync — run: node tools/sync-shared.mjs`); process.exit(1); }
console.log(drift ? `\n${drift} file(s) updated.` : "\nEverything already in sync.");
