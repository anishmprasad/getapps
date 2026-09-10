#!/usr/bin/env node
/**
 * Build the GetHealth data files served from sites/gethealth/data/.
 *
 *   node tools/gethealth/build.mjs          # write
 *   node tools/gethealth/build.mjs --check  # verify the committed JSON is current
 *
 * Every species file is self-contained: systems, parts (with geometry specs
 * and educational text) and camera defaults. The client meshes geometry at
 * load time, so the JSON stays small enough for a CDN edge cache.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { replacer } from "./lib.mjs";
import human from "./human/index.mjs";
import frog from "./frog.mjs";
import cockroach from "./cockroach.mjs";
import biomarkers from "./biomarkers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "sites/gethealth/data");
const check = process.argv.includes("--check");
mkdirSync(out, { recursive: true });

function validate(sp) {
  const ids = new Set(), sys = new Set(sp.systems.map((s) => s.id));
  for (const p of sp.parts) {
    if (ids.has(p.id)) throw new Error(`${sp.id}: duplicate part id ${p.id}`);
    ids.add(p.id);
    if (!sys.has(p.sys)) throw new Error(`${sp.id}: part ${p.id} has unknown system ${p.sys}`);
    if (!p.d || !p.fn) throw new Error(`${sp.id}: part ${p.id} is missing description or function text`);
  }
  return ids;
}

const files = {};
const index = { version: 1, species: [] };
const humanIds = new Set();
for (const sp of [human, frog, cockroach]) {
  const ids = validate(sp);
  if (sp.id === "human") ids.forEach((i) => humanIds.add(i));
  const count = sp.parts.reduce((n, p) => n + (p.bi ? 2 : 1), 0);
  index.species.push({ id: sp.id, name: sp.name, title: sp.title, blurb: sp.blurb, file: `${sp.id}.json`, structures: count, systems: sp.systems.length });
  files[`${sp.id}.json`] = { ...sp, structures: count };
}

// Every organ a lab marker points at must exist in the human model.
for (const m of biomarkers.markers) for (const o of m.organs) {
  if (!humanIds.has(o)) throw new Error(`biomarker ${m.id} references unknown part ${o}`);
}
files["biomarkers.json"] = biomarkers;
files["index.json"] = index;

let drift = 0;
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data, replacer) + "\n";
  const path = join(out, name);
  let prev = null;
  try { prev = readFileSync(path, "utf8"); } catch {}
  if (prev !== text) {
    drift++;
    if (check) console.log(`DRIFT  data/${name}`);
    else writeFileSync(path, text);
  }
  const extra = data.parts ? `${String(data.structures).padStart(5)} structures  ${String(data.parts.length).padStart(4)} entries` : "";
  console.log(`${name.padEnd(18)} ${(text.length / 1024).toFixed(1).padStart(7)} KB  ${extra}`);
}
/* ---- generated regions of the guide page ---- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (x) => (x >= 1e8 ? "" : +x.toPrecision(3)).toString();
const range = (m) => m.qual ? "Negative" : m.ref ? `${fmt(m.ref[0])}–${fmt(m.ref[1])}`.replace(/–$/, "+")
  : `M ${fmt(m.refM[0])}–${fmt(m.refM[1])} · F ${fmt(m.refF[0])}–${fmt(m.refF[1])}`;
const humanParts = new Map(human.parts.map((p) => [p.id, p.name]));
const REGIONS = {
  SPECIES: [human, frog, cockroach].map((sp) => {
    const count = (sys) => sp.parts.filter((p) => p.sys === sys.id).reduce((n, p) => n + (p.bi ? 2 : 1), 0);
    return `<h3>${esc(sp.title)} — ${files[`${sp.id}.json`].structures} structures</h3>\n<p>${esc(sp.blurb)} <a href="${sp.id === "human" ? "/" : `/${sp.id}`}">Open it</a>.</p>\n<ul>${sp.systems.map((s) => `<li><strong>${esc(s.name)}</strong> — ${count(s)} structures</li>`).join("")}</ul>`;
  }).join("\n"),
  TESTS: biomarkers.panels.map((p) => {
    const rows = biomarkers.markers.filter((m) => m.panel === p.id).map((m) =>
      `<tr><td>${esc(m.name)}</td><td>${esc(range(m))} ${esc(m.unit || "")}</td><td>${esc(m.purpose)}</td><td>${esc([...new Set(m.organs.map((o) => humanParts.get(o)))].slice(0, 4).join(", "))}</td></tr>`).join("");
    return `<h3 style="margin:34px 0 12px">${esc(p.name)}</h3>\n<div class="table-scroll"><table class="gh-table"><thead><tr><th>Test</th><th>Typical adult range</th><th>What it measures</th><th>Related organs</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join("\n"),
};
{
  const path = join(root, "sites/gethealth/guide.html");
  const orig = readFileSync(path, "utf8");
  let next = orig;
  for (const [name, body] of Object.entries(REGIONS)) {
    next = next.replace(new RegExp(`(<!-- GH:${name} start -->)[\\s\\S]*?(<!-- GH:${name} end -->)`), (_m, a, b) => `${a}\n${body}\n${b}`);
  }
  if (next !== orig) { drift++; if (check) console.log("DRIFT  guide.html"); else writeFileSync(path, next); }
  console.log(`guide.html         regions: ${Object.keys(REGIONS).join(", ")}`);
}

if (check && drift) { console.error(`\n${drift} file(s) out of date — run: node tools/gethealth/build.mjs`); process.exit(1); }
