/* =====================================================================
   GetHealth — lab report scanner
   Everything happens in the browser: PDFs are read with pdf.js, photos
   and scanned PDFs with Tesseract OCR, and the text is matched against
   the in-house test inventory (data/biomarkers.json). Nothing about the
   report is uploaded anywhere.
   ===================================================================== */
import { ICON } from "./app.mjs";
import { parseReport, evaluate, fmt, toNum, SAMPLE } from "./parse.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r) => r.querySelector(s);
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/";
const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
export const STATUS_COLOR = { high: "#FF4D5E", low: "#4D8BFF", normal: "#34C77B" };

/* ---------------------------------------------------------------- text extraction */
async function pdfText(file, onStatus) {
  const pdfjs = await import(`${PDFJS}pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
  let doc;
  try { doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch (e) {
    if (e?.name === "PasswordException") throw new Error("PASSWORD");
    throw e;
  }
  const lines = [];
  for (let n = 1; n <= doc.numPages; n++) {
    onStatus?.(`Reading page ${n} of ${doc.numPages}…`);
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    // Rebuild visual rows: group text items by baseline, then order left to right.
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) rows.push((row = { y, items: [] }));
      row.items.push({ x, s: it.str, w: it.width || 0 });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let line = "", end = null;
      for (const it of r.items) { line += (end !== null && it.x - end > 2 ? "   " : "") + it.s; end = it.x + it.w; }
      lines.push(line);
    }
  }
  const text = lines.join("\n");
  if (text.replace(/\s/g, "").length > 40) return { text, ocr: false };
  // No text layer — it's a scan. Render each page and OCR it.
  const canvases = [];
  for (let n = 1; n <= Math.min(doc.numPages, 6); n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 3 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    canvases.push(c);
  }
  return { text: await ocr(canvases, onStatus), ocr: true };
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("Couldn't load the text-recognition library"));
    document.head.appendChild(s);
  });
}
/** Text recognition misses decimal points in small print, so enlarge images to ~2400 px wide first. */
async function upscale(img) {
  const bmp = img instanceof HTMLCanvasElement ? img : await createImageBitmap(img);
  const k = Math.min(3, Math.max(1, 2400 / bmp.width));
  if (k <= 1.05 && img instanceof HTMLCanvasElement) return img;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.filter = "grayscale(1) contrast(1.15)";
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
async function ocr(images, onStatus) {
  onStatus?.("Loading text recognition…");
  await loadScript(TESSERACT);
  images = await Promise.all(images.map(upscale));
  const worker = await window.Tesseract.createWorker("eng", 1, {
    logger: (m) => { if (m.status === "recognizing text") onStatus?.(`Recognising text… ${Math.round(m.progress * 100)}%`); },
  });
  let out = "";
  try { for (const img of images) { const { data } = await worker.recognize(img); out += data.text + "\n"; } }
  finally { await worker.terminate(); }
  return out;
}

/* ---------------------------------------------------------------- the sheet */
export class ReportSheet {
  constructor(app, host) {
    this.app = app;
    this.host = host;
    this.tab = "scan";
    this.results = null;
    this.showOnBody = true;
    this.age = "";
    host.addEventListener("click", (e) => this.onClick(e));
    host.addEventListener("input", (e) => this.onInput(e));
    host.addEventListener("change", (e) => this.onChange(e));
    app.root.addEventListener("atlas:sex", () => { if (this.results) { this.evaluateAll(); this.render(); } });
  }

  get sex() { return this.app.viewer.state.sex; }

  async open({ tab, marker } = {}) {
    this.bm = await this.app.biomarkers();
    this.byId = new Map(this.bm.markers.map((m) => [m.id, m]));
    if (marker) { this.tab = "library"; this.openMarker = marker; this.libQuery = ""; this.highlightMarker(marker); }
    else if (tab) this.tab = tab;
    else if (this.results) this.tab = "results";
    this.render();
    if (this.tab === "results") this.applyBody();
  }
  onClose() { this.app.showStatus(null); }

  /* ---- analysis ---- */
  async analyseFile(file) {
    this.busy = "Reading your report…";
    this.error = null;
    this.render();
    try {
      let got;
      if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) got = await pdfText(file, (s) => this.setBusy(s));
      else if (/^image\//.test(file.type)) got = { text: await ocr([file], (s) => this.setBusy(s)), ocr: true };
      else got = { text: await file.text(), ocr: false };
      this.analyseText(got.text, file.name, got.ocr);
    } catch (e) {
      console.error(e);
      this.busy = null;
      this.error = e.message === "PASSWORD"
        ? `This PDF is password-protected. Remove the password first — <a href="https://getpdf.getapps.tech/" target="_blank" rel="noopener">GetPDF</a> does it privately in your browser — then drop the unlocked file here.`
        : "We couldn't read that file. Try a PDF with selectable text, a clear photo, or paste the text below.";
      this.render();
    }
  }
  setBusy(s) { this.busy = s; const el = $("[data-busy]", this.host); if (el) el.textContent = s; else this.render(); }

  analyseText(text, source = "Pasted text", ocr = false) {
    const { results, unmatched } = parseReport(text, this.bm.markers, { ocr });
    this.raw = results;
    this.unmatched = unmatched;
    this.source = source;
    this.busy = null;
    if (!results.length) {
      this.error = "No recognisable test results were found. Check that the text includes test names with values, or enter them manually.";
      this.results = null;
      this.render();
      return;
    }
    this.evaluateAll();
    this.tab = "results";
    this.render();
    this.applyBody();
  }
  evaluateAll() {
    const order = { high: 0, low: 1, normal: 2, na: 3 };
    this.results = this.raw.filter((r) => !r.marker.sex || r.marker.sex === this.sex).map((r) => evaluate(r, this.sex)).sort((a, b) => order[a.status] - order[b.status]);
  }

  /** Colour the organs linked to each result — worst status wins. */
  applyBody() {
    if (!this.results || !this.showOnBody) { this.app.showStatus(null); return; }
    const rank = { high: 3, low: 2, normal: 1 };
    const worst = new Map();
    for (const r of this.results) for (const o of r.marker.organs) for (const id of this.app.instancesOf(o)) {
      if (!worst.has(id) || rank[r.status] > rank[worst.get(id)]) worst.set(id, r.status);
    }
    const map = new Map([...worst].map(([id, s]) => [id, STATUS_COLOR[s]]));
    this.app.showStatus(map);
  }
  highlightMarker(id) {
    const m = this.byId.get(id);
    if (!m) return;
    const map = new Map();
    for (const o of m.organs) for (const inst of this.app.instancesOf(o)) map.set(inst, "#F2B84B");
    this.app.showStatus(map.size ? map : null, { pulse: true });
  }

  /* ---- rendering ---- */
  render() {
    const tabs = [["scan", "Scan report"], ["manual", "Enter values"], ["library", "Test library"]];
    if (this.results) tabs.splice(1, 0, ["results", `Results (${this.results.length})`]);
    this.host.innerHTML = `
      <div class="rp-head">
        <div class="rp-head__top">
          <div><h2>Lab report scanner</h2><p>${ICON.lock} Private — your report never leaves this browser.</p></div>
          <button type="button" class="at-x" data-rp="close" aria-label="Close">${ICON.x}</button>
        </div>
        <div class="rp-tabs" role="tablist">${tabs.map(([id, n]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${this.tab === id}">${n}</button>`).join("")}</div>
      </div>
      <div class="rp-body">${this[`view_${this.tab}`]()}</div>
      <p class="rp-disclaimer"><b>For education only.</b> This tool explains what tests measure and which organs they relate to. It does not diagnose conditions — reference ranges vary between labs, and your doctor should interpret your results.</p>`;
    this.bindDrop();
  }

  profileRow() {
    return `<div class="rp-profile"><span>Ranges for</span>
      <div class="at-mini-seg" data-rpsex><button type="button" data-v="m" aria-pressed="${this.sex === "m"}">Male</button><button type="button" data-v="f" aria-pressed="${this.sex === "f"}">Female</button></div>
      <span>Age</span><input type="number" min="1" max="120" placeholder="—" value="${esc(this.age)}" data-age aria-label="Age"></div>`;
  }

  view_scan() {
    return `${this.profileRow()}
      <label class="rp-drop" data-drop>
        <input type="file" accept=".pdf,image/*,.txt,text/plain" data-file hidden>
        <span class="rp-drop__ico">${ICON.report}</span>
        <b>Drop a lab report here</b>
        <span>PDF, photo or screenshot · or click to choose</span>
      </label>
      ${this.busy ? `<div class="rp-status"><span class="spin"></span><span data-busy>${esc(this.busy)}</span></div>` : ""}
      ${this.error ? `<div class="rp-status" style="color:var(--bad)">${this.error}</div>` : ""}
      <div class="rp-or">or paste the text</div>
      <textarea data-paste placeholder="Haemoglobin   12.1  g/dL   13.0 - 17.0&#10;TSH           6.2   uIU/mL  0.27 - 4.2&#10;…">${esc(this.pasted || "")}</textarea>
      <div class="rp-row">
        <button type="button" class="rp-btn rp-btn--primary" data-rp="analyse">Analyse text</button>
        <button type="button" class="rp-btn" data-rp="sample">Try a sample report</button>
      </div>
      <p class="rp-note">Works best with typed (not handwritten) reports in English. Scanned pages are read with on-device text recognition, which downloads about 10 MB the first time.</p>`;
  }

  view_results() {
    const R = this.results || [];
    const n = (s) => R.filter((r) => r.status === s).length;
    const item = (r) => {
      const m = r.marker, open = this.openResult === m.id;
      const span = isFinite(r.hi) ? r.hi - r.lo : r.lo || 1;
      let pos = r.status === "normal" ? 50 : r.status === "high" ? 92 : 8;
      if (!m.qual && isFinite(r.hi) && span > 0) pos = r.lo > 0 ? 20 + ((r.value - r.lo) / span) * 60 : (r.value / r.hi) * 80;
      pos = Math.max(3, Math.min(97, pos));
      const cls = { high: "hi", low: "lo", normal: "ok" }[r.status] || "na";
      const organs = [...new Set(m.organs)].map((o) => { const it = this.app.itemById.get(this.app.instancesOf(o)[0]); return it ? `<button type="button" class="at-chip" data-organ="${o}">${esc(it.part.name)}</button>` : ""; }).join("");
      const rangeText = m.qual ? "Expected: not detected" : `${r.src === "report" ? "Your lab's range" : r.src === "guideline" ? "Guideline" : "Typical range"}: ${isFinite(r.hi) ? `${fmt(r.lo)}–${fmt(r.hi)}` : `above ${fmt(r.lo)}`} ${m.unit || ""}`;
      return `<div class="rp-item">
        <button type="button" data-res="${m.id}" aria-expanded="${open}">
          <span class="rp-item__name">${esc(m.name)}</span><span class="rp-item__val">${esc(r.display)}</span>
          <span class="rp-item__sub">${esc(rangeText)}${r.note ? ` · <b style="color:var(--warn)">check value</b>` : ""}</span><span class="rp-pill ${cls}">${esc(r.label)}</span>
          ${m.qual ? "" : `<span class="rp-range" aria-hidden="true"><i style="left:${pos}%"></i></span>`}
        </button>
        ${open ? `<div class="rp-detail">
          <p><b>What it measures.</b> ${esc(m.purpose)}</p>
          ${r.status === "high" ? `<p><b>Higher than expected can mean:</b> ${esc(m.high)}</p>` : r.status === "low" ? `<p><b>Lower than expected can mean:</b> ${esc(m.low)}</p>` : `<p><b>In range.</b> ${m.qual ? "" : `High values can point to: ${esc(m.high)}`}</p>`}
          ${organs ? `<div><b>Related organs</b><div class="at-chips">${organs}</div></div>` : ""}
          ${r.note ? `<p style="color:var(--warn)">${esc(r.note)}</p>` : ""}
          <p style="font-size:.7rem;color:var(--faint)">Read from: “${esc(r.line.slice(0, 80))}”</p>
        </div>` : ""}
      </div>`;
    };
    const flagged = R.filter((r) => r.status === "high" || r.status === "low"), ok = R.filter((r) => r.status === "normal");
    return `${this.profileRow()}
      <div class="rp-sum"><div class="hi"><b>${n("high")}</b><span>High</span></div><div class="lo"><b>${n("low")}</b><span>Low</span></div><div class="ok"><b>${n("normal")}</b><span>In range</span></div></div>
      <div class="rp-bar">
        <label class="switch"><input type="checkbox" data-onbody ${this.showOnBody ? "checked" : ""}><span class="switch__track"></span><span>Show on body</span></label>
        <span style="font-size:.72rem;color:var(--faint)">${esc(this.source || "")}</span>
      </div>
      ${flagged.length ? `<div class="rp-group">Outside the range (${flagged.length})</div><div class="rp-list">${flagged.map(item).join("")}</div>` : `<p class="rp-note" style="color:var(--ok)">Every recognised result is within its range.</p>`}
      ${ok.length ? `<div class="rp-group">Within the range (${ok.length})</div><div class="rp-list">${ok.map(item).join("")}</div>` : ""}
      ${this.unmatched?.length ? `<details style="margin-top:14px"><summary class="rp-group" style="cursor:pointer">Lines we couldn't match (${this.unmatched.length})</summary><ul class="rp-note">${this.unmatched.slice(0, 40).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></details>` : ""}
      <div class="rp-row"><button type="button" class="rp-btn" data-rp="new">Scan another</button><button type="button" class="rp-btn" data-rp="print">Print summary</button><button type="button" class="rp-btn" data-rp="clear">Clear</button></div>`;
  }

  view_manual() {
    this.manual ??= ["hemoglobin", "glucose-fasting", "hba1c", "cholesterol-total", "ldl", "hdl", "triglycerides", "creatinine", "tsh", "vitamin-d", "vitamin-b12", "alt"].map((id) => ({ id, v: "" }));
    const row = (r, i) => {
      const m = this.byId.get(r.id);
      const units = [m.unit, ...(m.alt || []).map((a) => a.u)].filter(Boolean);
      return `<div class="rp-manual__row">
        <span>${esc(m.name)}</span>
        <input inputmode="decimal" placeholder="value" value="${esc(r.v)}" data-mv="${i}" aria-label="${esc(m.name)} value">
        <button type="button" class="at-x" data-mrm="${i}" aria-label="Remove">${ICON.x}</button>
        ${units.length > 1 ? `<em><select data-mu="${i}" aria-label="Unit">${units.map((u) => `<option ${u === (r.u || m.unit) ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></em>` : `<em>${esc(m.unit || (m.qual ? "negative / positive" : ""))}</em>`}
      </div>`;
    };
    const q = (this.mq || "").trim().toLowerCase();
    const opts = q ? this.bm.markers.filter((m) => !m.qual && (m.name.toLowerCase().includes(q) || m.aka.some((a) => a.includes(q)))).slice(0, 8) : [];
    return `${this.profileRow()}
      <input class="rp-search" placeholder="Add a test — e.g. ferritin, potassium, PSA" value="${esc(this.mq || "")}" data-mq>
      ${opts.length ? `<div class="at-chips" style="margin-bottom:10px">${opts.map((m) => `<button type="button" class="at-chip" data-madd="${m.id}">+ ${esc(m.name)}</button>`).join("")}</div>` : ""}
      <div class="rp-manual">${this.manual.map(row).join("")}</div>
      <div class="rp-row"><button type="button" class="rp-btn rp-btn--primary" data-rp="manual">Check these values</button></div>`;
  }

  view_library() {
    const q = (this.libQuery || "").trim().toLowerCase();
    const match = (m) => !q || m.name.toLowerCase().includes(q) || m.short?.toLowerCase().includes(q) || m.aka.some((a) => a.includes(q)) || m.purpose.toLowerCase().includes(q);
    const sexed = (m) => m.ref ? m.ref : this.sex === "f" ? m.refF : m.refM;
    const body = this.bm.panels.map((p) => {
      const list = this.bm.markers.filter((m) => m.panel === p.id && match(m));
      if (!list.length) return "";
      return `<div class="rp-group">${esc(p.name)} · ${list.length}</div><div class="rp-list">${list.map((m) => {
        const open = this.openMarker === m.id, ref = sexed(m);
        const organs = [...new Set(m.organs)].map((o) => { const it = this.app.itemById.get(this.app.instancesOf(o)[0]); return it ? `<button type="button" class="at-chip" data-organ="${o}">${esc(it.part.name)}</button>` : ""; }).join("");
        const refText = m.qual ? "Negative / not detected" : ref ? `${fmt(ref[0])}–${fmt(ref[1] >= 1e8 ? Infinity : ref[1])} ${m.unit}`.replace("–Infinity", "+") : "";
        return `<div class="rp-item"><button type="button" data-lib="${m.id}" aria-expanded="${open}">
            <span class="rp-item__name">${esc(m.name)}</span><span class="rp-item__val">${esc(refText)}</span>
            <span class="rp-item__sub">${esc(m.purpose.split(". ")[0])}.</span>
          </button>
          ${open ? `<div class="rp-detail">
            <p>${esc(m.purpose)}</p>
            ${m.bands ? `<p><b>Guideline bands:</b> ${m.bands.map(([a, z, l]) => `${esc(l)} ${z >= 1e8 ? `≥ ${fmt(a)}` : a <= 0 ? `< ${fmt(z)}` : `${fmt(a)}–${fmt(z)}`}`).join(" · ")} ${esc(m.unit)}</p>` : ""}
            ${m.refM && m.refF ? `<p><b>Typical range:</b> men ${fmt(m.refM[0])}–${fmt(m.refM[1])}, women ${fmt(m.refF[0])}–${fmt(m.refF[1])} ${esc(m.unit)}</p>` : ""}
            ${!m.qual ? `<p><b>Low:</b> ${esc(m.low)}</p>` : ""}
            <p><b>High${m.qual ? " / detected" : ""}:</b> ${esc(m.high)}</p>
            ${m.alt?.length ? `<p style="font-size:.72rem;color:var(--faint)">Also reported in ${m.alt.map((a) => esc(a.u)).join(", ")} — converted automatically.</p>` : ""}
            ${organs ? `<div><b>Related organs</b> <span style="color:var(--faint)">(lit up on the body)</span><div class="at-chips">${organs}</div></div>` : ""}
          </div>` : ""}
        </div>`;
      }).join("")}</div>`;
    }).join("");
    return `<input class="rp-search" placeholder="Search ${this.bm.markers.length} tests — name, abbreviation or purpose" value="${esc(this.libQuery || "")}" data-libq>
      ${body || `<p class="rp-note">No test matches “${esc(q)}”.</p>`}
      <p class="rp-note">${esc(this.bm.note)}</p>`;
  }

  /* ---- events ---- */
  onClick(e) {
    const t = e.target;
    const tab = t.closest("[data-tab]");
    if (tab) {
      this.tab = tab.dataset.tab;
      if (this.tab === "results") this.applyBody(); else if (this.tab !== "library") this.app.showStatus(null);
      this.render(); return;
    }
    const sx = t.closest("[data-rpsex] [data-v]");
    if (sx) { this.app.setSex(sx.dataset.v); if (!this.results) this.render(); return; }
    const res = t.closest("[data-res]");
    if (res) {
      const id = res.dataset.res;
      this.openResult = this.openResult === id ? null : id;
      this.render();
      const r = this.results.find((x) => x.marker.id === id);
      if (r && this.openResult) { const first = this.app.instancesOf(r.marker.organs[0] || "")[0]; if (first) this.app.viewer.focus(first); }
      return;
    }
    const lib = t.closest("[data-lib]");
    if (lib) { const id = lib.dataset.lib; this.openMarker = this.openMarker === id ? null : id; this.render(); if (this.openMarker) this.highlightMarker(id); else this.app.showStatus(null); return; }
    const organ = t.closest("[data-organ]");
    if (organ) { const id = this.app.instancesOf(organ.dataset.organ)[0]; if (id) this.app.viewer.focus(id); return; }
    const madd = t.closest("[data-madd]");
    if (madd) { if (!this.manual.some((r) => r.id === madd.dataset.madd)) this.manual.push({ id: madd.dataset.madd, v: "" }); this.mq = ""; this.render(); return; }
    const mrm = t.closest("[data-mrm]");
    if (mrm) { this.manual.splice(+mrm.dataset.mrm, 1); this.render(); return; }
    const act = t.closest("[data-rp]")?.dataset.rp;
    if (act === "close") this.app.closeSheet();
    else if (act === "sample") { this.pasted = SAMPLE; this.analyseText(SAMPLE, "Sample report (demo data)"); }
    else if (act === "analyse") { const text = $("[data-paste]", this.host)?.value || ""; this.pasted = text; if (text.trim()) this.analyseText(text); }
    else if (act === "manual") this.runManual();
    else if (act === "new") { this.tab = "scan"; this.app.showStatus(null); this.render(); }
    else if (act === "clear") { this.results = null; this.raw = null; this.pasted = ""; this.tab = "scan"; this.app.showStatus(null); this.render(); }
    else if (act === "print") this.print();
  }
  onInput(e) {
    const t = e.target;
    if (t.matches("[data-libq]")) { this.libQuery = t.value; const pos = t.selectionStart; this.render(); const n = $("[data-libq]", this.host); n.focus(); n.setSelectionRange(pos, pos); }
    else if (t.matches("[data-mq]")) { this.mq = t.value; const pos = t.selectionStart; this.render(); const n = $("[data-mq]", this.host); n.focus(); n.setSelectionRange(pos, pos); }
    else if (t.matches("[data-mv]")) this.manual[+t.dataset.mv].v = t.value;
    else if (t.matches("[data-age]")) this.age = t.value;
    else if (t.matches("[data-paste]")) this.pasted = t.value;
  }
  onChange(e) {
    const t = e.target;
    if (t.matches("[data-file]") && t.files[0]) this.analyseFile(t.files[0]);
    else if (t.matches("[data-onbody]")) { this.showOnBody = t.checked; this.applyBody(); }
    else if (t.matches("[data-mu]")) this.manual[+t.dataset.mu].u = t.value;
  }
  bindDrop() {
    const drop = $("[data-drop]", this.host);
    if (!drop || drop.dataset.bound) return;
    drop.dataset.bound = 1;
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) this.analyseFile(f); });
  }

  runManual() {
    const raw = [];
    for (const r of this.manual) {
      const m = this.byId.get(r.id), v = toNum(r.v);
      if (!m || !isFinite(v)) continue;
      raw.push({ marker: m, value: v, cmp: "", unit: r.u && r.u !== m.unit ? r.u : null, range: null, line: `${m.name}: ${r.v} ${r.u || m.unit}` });
    }
    if (!raw.length) return;
    this.raw = raw; this.unmatched = []; this.source = "Entered by hand";
    this.evaluateAll(); this.tab = "results"; this.render(); this.applyBody();
  }

  print() {
    const rows = this.results.map((r) => `<tr><td>${esc(r.marker.name)}</td><td>${esc(r.display)}</td><td>${r.marker.qual ? "Not detected" : isFinite(r.hi) ? `${fmt(r.lo)}–${fmt(r.hi)}` : `≥ ${fmt(r.lo)}`}</td><td class="${r.status}">${esc(r.label)}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><title>GetHealth report summary</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}.high{color:#c2253a;font-weight:600}.low{color:#1f5fd1;font-weight:600}.normal{color:#1d8a52}p{color:#555;font-size:12px}</style>
      <h1>Lab report summary</h1><p>${esc(this.source || "")} · ranges for ${this.sex === "f" ? "women" : "men"}${this.age ? ` · age ${esc(this.age)}` : ""} · made with GetHealth on ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>Test</th><th>Result</th><th>Range</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <p>For education only — not a diagnosis. Please discuss your results with a doctor.</p><script>print()<\/script>`);
    w.document.close();
  }
}
