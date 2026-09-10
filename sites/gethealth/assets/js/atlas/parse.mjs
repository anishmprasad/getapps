/* =====================================================================
   GetHealth — lab report parsing & evaluation
   Pure functions with no browser or three.js dependencies, so they can
   be unit-tested in Node (tools/gethealth/test-parse.mjs).
   ===================================================================== */
const STATUS_LABEL = { high: "High", low: "Low", normal: "In range", na: "Unclear" };

/* ---------------------------------------------------------------- parsing */
export const normU = (u) => String(u || "").toLowerCase().replace(/\s+/g, "").replace(/[µμ]/g, "u").replace(/mcg/g, "ug").replace(/mcl/g, "ul")
  .replace(/cu\.?mm|cmm|mm3|mm³/g, "cumm").replace(/x10|10\*|10³/g, (m) => (m === "10³" ? "10^3" : m === "x10" ? "10" : "10^")).replace(/thou\/ul|k\/ul/, "10^3/ul")
  .replace(/millions?\/cumm|mill\/cumm|10\^6\/cumm/, "10^6/ul").replace(/gm\/dl|gms\/dl|gm%|g%/, "g/dl").replace(/iu\/ml/, "iu/ml").replace(/²/g, "2");
const NUM = /([<>≤≥]=?)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?)/;
export const toNum = (s) => parseFloat(String(s).replace(/,/g, ""));
const NEG = /\b(negative|nil|absent|not\s+detected|non[-\s]?reactive|none\s+seen|normal)\b/i;
const POS = /\b(trace|positive|present|reactive|detected)\b|\+{1,4}|\b[1-4]\+/i;

export function buildIndex(markers) {
  const idx = [];
  for (const m of markers) for (const a of m.aka || []) {
    const al = a.toLowerCase();
    idx.push({ m, alias: al, re: new RegExp(`(^|[^a-z0-9])${al.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^a-z0-9]|$)`) });
  }
  idx.sort((a, b) => b.alias.length - a.alias.length);
  return idx;
}

/** Pull one result out of the text that follows a test name. */
function readValue(m, rest) {
  rest = rest.replace(/^\s*[:\-–—=]?\s*/, "").replace(/^(\([^)]*[a-z][^)]*\)\s*[:\-–]?\s*)+/i, "");
  if (m.qual) {
    const head = rest.slice(0, 40);
    if (NEG.test(head)) return { qual: "neg", raw: head.match(NEG)[0] };
    if (POS.test(head)) return { qual: "pos", raw: head.match(POS)[0] };
    return null;
  }
  const mm = rest.match(NUM);
  if (!mm || mm.index > 24) return null;
  const value = toNum(mm[2]);
  if (!isFinite(value)) return null;
  const after = rest.slice(mm.index + mm[0].length);
  // unit: compare against this marker's known units, longest first
  const au = normU(after.slice(0, 26));
  const units = [m.unit, ...(m.alt || []).map((a) => a.u)].filter(Boolean).map((u) => [u, normU(u)]).sort((a, b) => b[1].length - a[1].length);
  const hit = units.find(([, n]) => n && au.startsWith(n));
  const unit = hit ? hit[0] : null;
  // reference range printed on the report (range patterns never match inside unit strings)
  const tail = after;
  let range = null, r;
  if ((r = tail.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i))) range = [toNum(r[1]), toNum(r[2])];
  else if ((r = tail.match(/(?:<|≤|less than|upto|up to|below)\s*=?\s*(\d+(?:\.\d+)?)/i))) range = [0, toNum(r[1])];
  else if ((r = tail.match(/(?:>|≥|more than|above|greater than)\s*=?\s*(\d+(?:\.\d+)?)/i))) range = [toNum(r[1]), Infinity];
  if (range && !(range[0] < range[1])) range = null;
  return { value, raw: mm[2], cmp: mm[1] || "", unit, range };
}

/** Find every recognised test in free text. */
export function parseReport(text, markers, { ocr = false } = {}) {
  const idx = buildIndex(markers);
  const lines = text.replace(/ /g, " ").replace(/\t/g, "   ").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const found = new Map(), unmatched = [];
  lines.forEach((line, i) => {
    const low = line.toLowerCase();
    const cands = [];
    for (const e of idx) {
      const mt = low.match(e.re);
      if (!mt) continue;
      const at = mt.index + mt[1].length;
      if (e.alias.length <= 3 && at > 2) continue;       // short codes only count at the start of a line
      if (!cands.some((c) => c.e.m === e.m)) cands.push({ e, at });
    }
    // longest alias wins; numeric markers are tried before qualitative ones with the same alias
    cands.sort((a, b) => b.e.alias.length - a.e.alias.length || a.at - b.at || (a.e.m.qual ? 1 : 0) - (b.e.m.qual ? 1 : 0));
    let got = false;
    for (const { e, at } of cands) {
      if (found.has(e.m.id)) continue;
      let rest = line.slice(at + e.alias.length);
      // value printed on the following line (split PDF columns) — only if that line starts with one
      if (!/\d|negative|nil|absent|positive|trace|present|reactive|detected/i.test(rest) && /^([<>≤≥]=?\s*)?\d[\d.,]*(\s|$)|^(negative|nil|absent|positive|trace|present|non[-\s]?reactive|reactive)\b/i.test(lines[i + 1] || "")) rest += "   " + lines[i + 1];
      const v = readValue(e.m, rest);
      if (v) { found.set(e.m.id, { marker: e.m, line, ocr, ...v }); got = true; break; }
    }
    if (!got && !cands.length && /[a-z]{3,}.*\d/i.test(line) && line.length < 90) unmatched.push(line);
  });
  return { results: [...found.values()], unmatched };
}

/* ---------------------------------------------------------------- evaluation */
export const refFor = (m, sex) => m.ref || (sex === "f" ? m.refF : m.refM) || m.refM || m.refF;

export function evaluate(r, sex) {
  const m = r.marker;
  if (m.qual) return { ...r, status: r.qual === "pos" ? "high" : "normal", label: r.qual === "pos" ? `Detected (${r.raw})` : "Not detected", display: r.raw };
  const ref = refFor(m, sex);
  let conv = r.unit && r.unit !== m.unit ? (m.alt || []).find((a) => normU(a.u) === normU(r.unit)) : null;
  // No recognisable unit and an implausible number: try the known conversions.
  if (!r.unit && ref) {
    const [lo, hi] = ref, plausible = (x) => x >= (lo > 0 ? lo / 8 : -Infinity) && x <= hi * 8;
    if (!plausible(r.value)) {
      const tries = [...(m.alt || []), ...(m.mag || []).map((f) => ({ f }))];
      conv = tries.find((a) => { const x = r.value * a.f + (a.o || 0); return x >= (lo > 0 ? lo / 3 : 0) && x <= hi * 3; }) || null;
    }
  }
  const C = (x) => (conv ? x * conv.f + (conv.o || 0) : x);
  let value = C(r.value), note = "";
  // OCR often loses decimal points ("11.4" → "114"): if the number is wildly
  // implausible for this test and /10 or /100 makes it sensible, use that — and say so.
  if (r.ocr && ref && !/[.,]/.test(String(r.raw ?? r.value)) && Number.isInteger(r.value)) {
    const [lo, hi] = ref, ok = (x, k) => x >= (lo > 0 ? lo / k : 0) && x <= hi * k;
    if (!ok(value, 4)) {
      const d = [10, 100].find((f) => ok(value / f, 2));
      if (d) { note = `Read as ${r.value}; the decimal point looked missing, so it's shown as ${fmt(value / d)}. Please check against your report.`; value /= d; }
    }
  }
  let range = r.range ? r.range.map((x) => (isFinite(x) ? C(x) : x)) : null;
  // A printed range far off this test's usual scale is misread (or in another
  // unit): rescale it by a power of ten if that fits, otherwise ignore it.
  if (range && ref && isFinite(range[1]) && ref[1] > 0) {
    const ratio = range[1] / ref[1];
    if (ratio > 4 || ratio < 0.25) {
      const f = [10, 100, 0.1, 0.01].find((k) => { const q = (range[1] / k) / ref[1]; return q > 0.4 && q < 2.5; });
      range = f && r.ocr ? range.map((x) => x / f) : null;
    }
  }
  let lo, hi, src = "inventory", label = "", status;
  if (m.bands) {
    const b = m.bands.find(([a, z]) => value >= a && value < z) || m.bands[m.bands.length - 1];
    [lo, hi] = ref || [b[0], b[1]]; label = b[2]; status = b[3]; src = "guideline";
  } else {
    const usable = range && (isFinite(range[1]) ? value <= range[1] * 20 && value >= range[0] / 20 : value >= range[0] / 20);
    [lo, hi] = usable ? range : ref || [0, Infinity];
    if (usable) src = "report";
    status = "normal";
    if (value < lo && !m.loOk && lo > 0 && r.cmp !== ">") status = "low";
    else if (value > hi && !m.hiOk && r.cmp !== "<") status = "high";
    label = STATUS_LABEL[status];
    const far = status === "high" ? value / hi : status === "low" ? lo / Math.max(value, 1e-9) : 1;
    if (far >= 2) label = status === "high" ? "Markedly high" : "Markedly low";
  }
  return { ...r, value, lo, hi, src, status, label, note, display: `${r.cmp}${fmt(value)} ${m.unit || ""}`.trim() };
}
export const fmt = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : Math.abs(x) >= 10 ? (+x.toFixed(1)).toString() : (+x.toPrecision(3)).toString());

/* ---------------------------------------------------------------- sample */
export const SAMPLE = `SAMPLE HEALTH CHECK - DEMONSTRATION DATA ONLY
Patient: Demo Patient      Age/Sex: 42 Y / Male
COMPLETE BLOOD COUNT
Haemoglobin               12.1    g/dL        13.0 - 17.0
Total RBC Count           4.62    mill/cumm   4.5 - 5.5
PCV                       38.5    %           40 - 50
MCV                       78.4    fL          83 - 101
MCH                       26.2    pg          27 - 32
MCHC                      31.4    g/dL        31.5 - 34.5
RDW-CV                    15.8    %           11.6 - 14.0
Total Leucocyte Count     7,800   /cumm       4000 - 10000
Neutrophils               62      %           40 - 80
Lymphocytes               30      %           20 - 40
Eosinophils               4       %           1 - 6
Monocytes                 4       %           2 - 10
Platelet Count            2.1     lakhs/cumm  1.5 - 4.1
ESR                       18      mm/hr       0 - 15
LIVER FUNCTION TEST
Bilirubin Total           0.8     mg/dL       0.3 - 1.2
SGPT (ALT)                68      U/L         < 45
SGOT (AST)                41      U/L         < 35
Alkaline Phosphatase      96      U/L         40 - 129
GGT                       72      U/L         < 55
Total Protein             7.1     g/dL        6.4 - 8.3
Albumin                   4.3     g/dL        3.5 - 5.2
KIDNEY FUNCTION TEST
Urea                      28      mg/dL       17 - 43
Creatinine                0.94    mg/dL       0.7 - 1.3
Uric Acid                 7.9     mg/dL       3.5 - 7.2
Sodium                    139     mmol/L      136 - 145
Potassium                 4.3     mmol/L      3.5 - 5.1
Calcium                   9.4     mg/dL       8.8 - 10.6
LIPID PROFILE
Total Cholesterol         228     mg/dL       < 200
Triglycerides             212     mg/dL       < 150
HDL Cholesterol           38      mg/dL       > 40
LDL Cholesterol           148     mg/dL       < 100
VLDL Cholesterol          42      mg/dL       < 30
DIABETES
Glucose Fasting           108     mg/dL       70 - 100
HbA1c                     6.1     %           4.0 - 5.6
THYROID PROFILE
T3 Total                  1.1     ng/mL       0.8 - 2.0
T4 Total                  7.8     ug/dL       5.1 - 14.1
TSH                       6.2     uIU/mL      0.27 - 4.2
VITAMINS & IRON
25-OH Vitamin D           17.4    ng/mL       30 - 100
Vitamin B12               182     pg/mL       211 - 911
Ferritin                  18      ng/mL       30 - 400
URINE ROUTINE
pH                        6.0                 5.0 - 8.0
Specific Gravity          1.020               1.005 - 1.030
Protein                   Nil
Glucose                   Nil
Pus Cells                 2-3     /hpf        0 - 5`;

