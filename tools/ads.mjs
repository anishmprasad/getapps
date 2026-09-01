#!/usr/bin/env node
/**
 * Turn every ad position on or off across all three product sites.
 *
 *   node tools/ads.mjs --status   what is currently on/off
 *   node tools/ads.mjs --off      comment every slot out (no ad markup ships)
 *   node tools/ads.mjs --on       uncomment them all again
 *
 * Disabled slots are wrapped in GA:AD:OFF markers, so the round trip is exact:
 * running --off then --on restores the files byte for byte.
 *
 * This covers the markup in the HTML pages and the slot the GetInterest
 * calculator injects into its results panel. It does not touch the
 * <script src="/assets/js/ads.js"> tags — that file is the mechanism that
 * fills slots and is inert when no slot markup exists, so leaving it in
 * place means re-enabling is nothing more than this command.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--on") ? "on"
           : process.argv.includes("--off") ? "off"
           : "status";

/* ---- what an ENABLED slot looks like ---- */
const ENABLED = [
  // <div class="wrap"><span class="ad__label">…</span><div class="ad" data-slot="…"></div></div>
  /^([ \t]*)(<div class="wrap"><span class="ad__label">Advertisement<\/span><div class="ad" data-slot="[a-z-]+"><\/div><\/div>)$/gm,
  // the sticky rail <aside> on /banks
  /^([ \t]*)(<aside>\n[ \t]*<span class="ad__label">Advertisement<\/span>\n[ \t]*<div class="ad ad-rail" data-slot="[a-z-]+"><\/div>\n[ \t]*<\/aside>)$/gm,
];
const ENABLED_JS = /^([ \t]*)(out \+= '<div class="ad" data-slot="[a-z-]+"><\/div>';)$/gm;

/* ---- what a DISABLED slot looks like ---- */
const DISABLED = /^([ \t]*)<!-- GA:AD:OFF\n([\s\S]*?)\n[ \t]*GA:AD:OFF -->$/gm;
const DISABLED_JS = /^([ \t]*)\/\/ GA:AD:OFF (out \+= '<div class="ad" data-slot="[a-z-]+"><\/div>';)$/gm;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|js)$/.test(name) && !/assets\/js\/(ads|core)\.js$/.test(p.replace(/\\/g, "/"))) out.push(p);
  }
  return out;
}

let onCount = 0, offCount = 0, touched = 0;

for (const file of walk(join(root, "sites"))) {
  const orig = readFileSync(file, "utf8");
  let next = orig;
  const isJs = file.endsWith(".js");

  // Count current state. Disabled blocks still contain the markup, so they
  // have to come out before the "enabled" patterns are counted.
  offCount += (orig.match(DISABLED) || []).length + (orig.match(DISABLED_JS) || []).length;
  const live = orig.replace(DISABLED, "").replace(DISABLED_JS, "");
  for (const re of ENABLED) onCount += (live.match(re) || []).length;
  onCount += isJs ? (live.match(ENABLED_JS) || []).length : 0;

  if (mode === "off") {
    for (const re of ENABLED) {
      next = next.replace(re, (_m, indent, block) =>
        `${indent}<!-- GA:AD:OFF\n${indent}${block}\n${indent}GA:AD:OFF -->`);
    }
    if (isJs) next = next.replace(ENABLED_JS, (_m, indent, stmt) => `${indent}// GA:AD:OFF ${stmt}`);
  } else if (mode === "on") {
    next = next.replace(DISABLED, (_m, _indent, block) => block);
    if (isJs) next = next.replace(DISABLED_JS, (_m, indent, stmt) => `${indent}${stmt}`);
  }

  if (next !== orig) {
    writeFileSync(file, next);
    touched++;
    console.log(`${mode === "off" ? "disabled" : "enabled "}  ${relative(root, file)}`);
  }
}

if (mode === "status") {
  console.log(`Ad slots currently enabled: ${onCount}`);
  console.log(`Ad slots currently disabled: ${offCount}`);
  console.log(onCount === 0 && offCount > 0
    ? "\nAll ad positions are commented out. Run `node tools/ads.mjs --on` when your ad account is live."
    : "\nRun `node tools/ads.mjs --off` to comment every position out.");
} else {
  console.log(`\n${touched} file(s) updated.`);
}
