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
if (check && drift) { console.error(`\n${drift} file(s) out of date — run: node tools/gethealth/build.mjs`); process.exit(1); }
