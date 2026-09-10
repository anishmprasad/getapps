#!/usr/bin/env node
/**
 * Tests for the lab-report parser (sites/gethealth/assets/js/atlas/parse.mjs)
 * against the committed test inventory.
 *
 *   node tools/gethealth/test-parse.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReport, evaluate, SAMPLE } from "../../sites/gethealth/assets/js/atlas/parse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { markers } = JSON.parse(readFileSync(join(root, "sites/gethealth/data/biomarkers.json"), "utf8"));

let fails = 0;
const run = (text, sex = "m") => {
  const { results, unmatched } = parseReport(text, markers);
  return { map: new Map(results.map((r) => [r.marker.id, evaluate(r, sex)])), unmatched };
};
const expect = (label, got, want) => {
  const ok = typeof want === "function" ? want(got) : got === want;
  if (!ok) { fails++; console.log(`✗ ${label}: got ${JSON.stringify(got)}`); } else console.log(`✓ ${label}`);
};
const near = (x, y, tol = 0.02) => (g) => Math.abs(g - y) <= Math.abs(y) * tol;

/* ---- the built-in sample report ---- */
{
  const { map } = run(SAMPLE);
  expect("sample: recognises 45+ tests", map.size, (n) => n >= 45);
  expect("sample: no stray 'iron' from the section header", map.has("iron"), false);
  expect("sample: WBC 7,800 /cumm → 7.8", map.get("wbc").value, near(0, 7.8));
  expect("sample: platelets 2.1 lakhs → 210", map.get("platelets").value, near(0, 210));
  expect("sample: T3 1.1 ng/mL → 110 ng/dL", map.get("t3").value, near(0, 110));
  expect("sample: haemoglobin low", map.get("hemoglobin").status, "low");
  expect("sample: ALT high against '< 45'", map.get("alt").status, "high");
  expect("sample: HDL low against '> 40'", map.get("hdl").status, "low");
  expect("sample: HbA1c prediabetes band", map.get("hba1c").label, "Prediabetes range");
  expect("sample: vitamin D deficient band", map.get("vitamin-d").label, "Deficient");
  expect("sample: urine protein nil = normal", map.get("urine-protein").status, "normal");
  expect("sample: urine glucose parsed as qualitative", map.get("urine-glucose")?.status, "normal");
  expect("sample: fasting glucose not mistaken for random", map.has("glucose-random"), false);
}

/* ---- edge cases ---- */
{
  const { map } = run("Creatinine 88\nGlucose (F) 5.4 mmol/L\nHemoglobin 138 g/L");
  expect("SI creatinine without unit → mg/dL", map.get("creatinine").value, near(0, 0.994, 0.03));
  expect("glucose mmol/L → mg/dL", map.get("glucose-random").value, near(0, 97.3));
  expect("haemoglobin g/L → g/dL", map.get("hemoglobin").value, near(0, 13.8));
}
{
  const { map } = run("Blood Group : B Positive\nHBsAg : Non Reactive\nKetones : Trace");
  expect("blood group line is not a urine-blood result", map.has("urine-blood"), false);
  expect("'Non Reactive' is negative", map.get("hbsag").status, "normal");
  expect("'Trace' ketones is flagged", map.get("urine-ketones").status, "high");
}
{
  const { map } = run("TSH\n2.1   uIU/mL   0.4 - 4.5\nPlatelet Count  250000 /uL  150000-450000");
  expect("value on the next line (split PDF column)", map.get("tsh").value, near(0, 2.1));
  expect("platelets 250000 /uL → 250", map.get("platelets").value, near(0, 250));
  expect("platelets range converted too", map.get("platelets").status, "normal");
}
{
  const { map } = run("Vitamin D (25-OH)  42.0 ng/mL\nVitamin B12: 350 pg/mL\nHbA1c 48 mmol/mol", "f");
  expect("parenthetical after the name is skipped", map.get("vitamin-d").value, near(0, 42));
  expect("B12 with a colon", map.get("vitamin-b12").value, near(0, 350));
  expect("HbA1c IFCC 48 mmol/mol → 6.5 %", map.get("hba1c").value, near(0, 6.54));
}
{
  const { map } = run("Ferritin  22 ng/mL", "f");
  const m = run("Ferritin  22 ng/mL", "m").map;
  expect("sex-specific range: ferritin 22 normal for women", map.get("ferritin").status, "normal");
  expect("sex-specific range: ferritin 22 low for men", m.get("ferritin").status, "low");
}
{
  const { map } = run("Hb 11.2\nNa 132\nK 5.8");
  expect("short codes at the start of a line", [map.get("hemoglobin")?.status, map.get("sodium")?.status, map.get("potassium")?.status].join(), "low,low,high");
  const { map: m2 } = run("Glucose 110 mg/dL (method: GOD-POD, 12 mg to ...)");
  expect("'mg' in trailing text is not magnesium", m2.has("magnesium"), false);
}

console.log(fails ? `\n${fails} failing` : "\nall passing");
process.exit(fails ? 1 : 0);
