/* =====================================================================
   GetHealth — anatomy atlas app
   UI shell around the viewer: species switch, systems panel, search,
   structure card, explode slider, labels, quiz and the report sheet.
   Data comes from /data/*.json (override with <meta name="gethealth-data">
   to serve it from a CDN).
   ===================================================================== */
import { Viewer } from "./viewer.mjs";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GA = () => window.GA || {};
export const DATA = (document.querySelector('meta[name="gethealth-data"]')?.content || "/data/").replace(/\/?$/, "/");
const SPECIES_PATH = { human: "/", frog: "/frog", cockroach: "/cockroach" };
const PATH_SPECIES = { "/": "human", "/index": "human", "/index.html": "human", "/frog": "frog", "/frog.html": "frog", "/cockroach": "cockroach", "/cockroach.html": "cockroach" };

const svg = (d, w = 18) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 16),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 16),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  rotate: svg('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>'),
  xray: svg('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.5"/>'),
  labels: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  full: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  layers: svg('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>', 16),
  report: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', 16),
  quiz: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.8M12 17h.01"/>', 16),
  focus: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', 16),
  eyeOff: svg('<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a8.7 8.7 0 0 1-2.2 3.2M6.3 6.3C4.2 7.7 3 10 3 12c0 2 4 7 9 7a9 9 0 0 0 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', 16),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', 16),
  isolate: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>', 16),
  chevron: svg('<path d="m9 6 6 6-6 6"/>', 14),
};

const TPL = `
<div class="at-stage" data-stage></div>
<div class="at-labels" data-labels aria-hidden="true"></div>
<div class="at-tip" data-tip hidden></div>
<div class="at-loading" data-loading>
  <div class="at-loading__in"><div class="at-loading__bar"><i data-bar></i></div><span data-loadtext>Loading anatomy…</span></div>
</div>

<div class="at-head">
  <span class="at-eyebrow">Interactive anatomy</span>
  <h1 class="at-title" data-title>Human Atlas</h1>
  <p class="at-sub" data-sub></p>
  <div class="at-species" role="tablist" aria-label="Choose an organism" data-species-tabs></div>
</div>

<aside class="at-panel at-systems" data-systems aria-label="Body systems">
  <div class="at-panel__head"><b>Systems</b><button class="at-x at-only-mobile" data-close-systems aria-label="Close systems">${ICON.x}</button></div>
  <div class="at-presets" data-presets role="group" aria-label="Quick views"></div>
  <ul class="at-syslist" data-syslist></ul>
  <div class="at-opts">
    <div class="at-opt" data-sexrow><span>Body</span><div class="at-mini-seg" data-sex role="group" aria-label="Body type"><button type="button" data-v="m">Male</button><button type="button" data-v="f">Female</button></div></div>
    <label class="at-opt"><span>Kids mode</span><span class="switch"><input type="checkbox" data-kids><span class="switch__track"></span></span></label>
  </div>
  <div class="at-panel__foot"><span data-count></span><button type="button" class="at-link" data-showall>Show all</button></div>
</aside>

<div class="at-top">
  <div class="at-search" data-searchbox>
    ${ICON.search}
    <input type="search" placeholder="Find a structure" aria-label="Find a structure" autocomplete="off" spellcheck="false" data-search role="combobox" aria-expanded="false" aria-controls="at-results">
    <kbd>/</kbd>
    <ul class="at-results" id="at-results" data-results role="listbox" hidden></ul>
  </div>
  <button type="button" class="at-pill at-pill--accent" data-act="report" data-human-only>${ICON.report}<span>Analyse report</span></button>
  <button type="button" class="at-pill" data-act="quiz">${ICON.quiz}<span>Quiz</span></button>
  <button type="button" class="at-pill at-only-mobile" data-act="systems" aria-label="Systems">${ICON.layers}</button>
</div>

<div class="at-tools" role="toolbar" aria-label="View controls">
  <button type="button" data-tool="zoomin" title="Zoom in" aria-label="Zoom in">${ICON.plus}</button>
  <button type="button" data-tool="zoomout" title="Zoom out" aria-label="Zoom out">${ICON.minus}</button>
  <button type="button" data-tool="reset" title="Reset view (R)" aria-label="Reset view">${ICON.reset}</button>
  <i class="at-tools__sep"></i>
  <button type="button" data-tool="rotate" aria-pressed="false" title="Auto-rotate" aria-label="Auto-rotate">${ICON.rotate}</button>
  <button type="button" data-tool="xray" aria-pressed="false" title="X-ray (X)" aria-label="X-ray">${ICON.xray}</button>
  <button type="button" data-tool="labels" aria-pressed="false" title="Labels (L)" aria-label="Labels">${ICON.labels}</button>
  <i class="at-tools__sep"></i>
  <button type="button" data-tool="shot" title="Save image" aria-label="Save image">${ICON.camera}</button>
  <button type="button" data-tool="full" title="Full screen" aria-label="Full screen">${ICON.full}</button>
</div>

<aside class="at-card" data-card hidden aria-live="polite"></aside>
<aside class="at-sheet" data-sheet hidden></aside>

<div class="at-explode">
  <div class="at-explode__row"><label for="at-explode">Explode anatomy</label><output data-exout>0%</output></div>
  <input type="range" id="at-explode" class="range" min="0" max="100" value="0" data-explode>
  <div class="at-explode__row at-explode__ticks"><span>Assembled</span><span>Every part</span></div>
</div>

<div class="at-quiz" data-quiz hidden></div>
`;

export class App {
  constructor(root) {
    this.root = root;
    this.cache = new Map();
    this.kids = false;
    this.labelsOn = false;
    root.innerHTML = TPL;
    this.el = Object.fromEntries($$("[data-stage],[data-labels],[data-tip],[data-loading],[data-bar],[data-loadtext],[data-title],[data-sub],[data-species-tabs],[data-systems],[data-presets],[data-syslist],[data-sexrow],[data-sex],[data-kids],[data-count],[data-search],[data-results],[data-card],[data-sheet],[data-explode],[data-exout],[data-quiz]", root)
      .map((n) => [Object.keys(n.dataset)[0].replace(/-(\w)/g, (_, c) => c.toUpperCase()), n]));
    this.viewer = new Viewer(this.el.stage);
    const mq = matchMedia("(max-width: 760px)");
    const pad = () => this.viewer.setPad(mq.matches ? { t: 96, r: 44, b: 64, l: 0 } : { t: 60, r: 64, b: 92, l: 276 });
    mq.addEventListener("change", pad);
    pad();
    this.bind();
    try { this.kids = localStorage.getItem("gh-kids") === "1"; } catch {}
    this.el.kids.checked = this.kids;
    root.classList.toggle("is-kids", this.kids);
    GA().initRanges?.(root);
  }

  /* ------------------------------------------------------------ data */
  async fetchJSON(file) {
    if (!this.cache.has(file)) this.cache.set(file, fetch(DATA + file).then((r) => { if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); return r.json(); }));
    return this.cache.get(file);
  }
  biomarkers() { return this.fetchJSON("biomarkers.json"); }

  async start(speciesId, opts = {}) {
    const [index] = await Promise.all([this.fetchJSON("index.json")]);
    this.index = index;
    this.renderSpeciesTabs();
    await this.loadSpecies(speciesId, opts);
  }

  async loadSpecies(id, { select, push } = {}) {
    if (this.loading) return;
    this.loading = true;
    this.closeSheet(); this.endQuiz(); this.closeCard();
    this.el.loading.hidden = false;
    this.el.loadtext.textContent = `Loading ${id} anatomy…`;
    this.el.bar.style.width = "4%";
    let sp;
    try { sp = await this.fetchJSON(`${id}.json`); }
    catch (e) {
      this.el.loadtext.textContent = "Couldn't load the anatomy data. Check your connection and reload.";
      this.loading = false; console.error(e); return;
    }
    this.sp = sp;
    this.sysById = Object.fromEntries(sp.systems.map((s) => [s.id, s]));
    this.items = [];
    for (const p of sp.parts) {
      if (p.bi) for (const side of ["l", "r"]) this.items.push({ id: `${p.id}.${side}`, part: p, side, name: `${side === "l" ? "Left" : "Right"} ${p.name}` });
      else this.items.push({ id: p.id, part: p, side: null, name: p.name });
    }
    this.itemById = new Map(this.items.map((i) => [i.id, i]));
    this.root.dataset.species = id;
    this.el.title.textContent = sp.title;
    this.renderSpeciesTabs();
    $$("[data-human-only]", this.root).forEach((n) => (n.hidden = id !== "human"));
    this.el.sexrow.hidden = !sp.sexes;
    const sexLabels = sp.sexLabels || ["Male", "Female"];
    $$("button", this.el.sex).forEach((b, i) => (b.textContent = sexLabels[i]));

    this.el.loadtext.textContent = `Building ${sp.structures.toLocaleString()} structures…`;
    const vs = this.viewer.state;
    vs.systems = new Set(sp.systems.filter((s) => !s.off).map((s) => s.id));
    vs.hidden = new Set(); vs.isolated = null; vs.selected = null; vs.status = null; vs.dim = null; vs.explode = 0;
    this.el.explode.value = 0; this.el.exout.textContent = "0%"; GA().paintRange?.(this.el.explode);
    await this.viewer.load(sp, (done, total) => { this.el.bar.style.width = `${Math.round(4 + (done / total) * 96)}%`; });
    this.renderSystems();
    this.updateCount();
    this.el.loading.hidden = true;
    this.loading = false;
    // Keep the page's own <title> on first load; retitle only when switching species.
    if (this.pageTitle === undefined) this.pageTitle = document.title;
    else document.title = `${sp.title} — 3D ${sp.name.toLowerCase()} anatomy | GetHealth`;
    if (push) history.pushState({ species: id }, "", SPECIES_PATH[id] || "/");
    if (select && this.itemById.has(select)) this.select(select, { focus: true });
    if (id === "human") this.biomarkers().catch(() => {});
    this.dispatch("species", { id });
  }

  dispatch(name, detail) { this.root.dispatchEvent(new CustomEvent(`atlas:${name}`, { detail })); }

  /* ------------------------------------------------------------ rendering: panels */
  renderSpeciesTabs() {
    if (!this.index) return;
    const cur = this.sp?.id;
    this.el.speciesTabs.innerHTML = this.index.species.map((s) =>
      `<a href="${SPECIES_PATH[s.id] || "/"}" role="tab" aria-selected="${s.id === cur}" data-sp="${s.id}"><b>${esc(s.name)}</b><span>${s.structures.toLocaleString()}</span></a>`).join("");
    const cs = this.index.species.find((s) => s.id === cur);
    if (cs) this.el.sub.textContent = `${cs.structures.toLocaleString()} structures · ${cs.systems} systems`;
  }

  renderSystems() {
    const sp = this.sp, vs = this.viewer.state;
    const counts = {};
    for (const it of this.items) if (!it.part.sex || it.part.sex === vs.sex) counts[it.part.sys] = (counts[it.part.sys] || 0) + 1;
    this.el.presets.innerHTML = (sp.presets || []).map((p) => `<button type="button" data-preset="${p.id}">${esc(p.name)}</button>`).join("");
    this.el.syslist.innerHTML = sp.systems.filter((s) => counts[s.id]).map((s) => `
      <li><button type="button" class="at-sys" data-sys="${s.id}" aria-pressed="${vs.systems.has(s.id)}">
        <i class="at-sys__dot" style="--c:${s.color}"></i><span class="at-sys__name">${esc(s.name)}</span>
        <em class="tnum">${counts[s.id] || 0}</em><span class="at-sys__sw" aria-hidden="true"></span>
      </button><button type="button" class="at-sys__only" data-only="${s.id}" title="Show only ${esc(s.name)}">Only</button></li>`).join("");
    $$("button", this.el.sex).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === vs.sex)));
    this.syncPresets();
  }

  syncPresets() {
    const vs = this.viewer.state;
    const cur = [...vs.systems].sort().join();
    $$("[data-preset]", this.el.presets).forEach((b) => {
      const p = this.sp.presets.find((x) => x.id === b.dataset.preset);
      b.setAttribute("aria-pressed", String([...p.sys].sort().join() === cur));
    });
    $$("[data-sys]", this.el.syslist).forEach((b) => b.setAttribute("aria-pressed", String(vs.systems.has(b.dataset.sys))));
  }

  updateCount() {
    const shown = this.viewer.meshes.filter((m) => m.visible).length;
    const vs = this.viewer.state;
    const extra = vs.isolated ? " · isolated" : vs.hidden.size ? ` · ${vs.hidden.size} hidden` : "";
    this.el.count.textContent = `${shown.toLocaleString()} visible${extra}`;
  }

  setSystems(set) {
    this.viewer.setState({ systems: set });
    this.syncPresets();
    this.updateCount();
    if (this.viewer.state.selected && !this.viewer.byId.get(this.viewer.state.selected)?.visible) this.closeCard();
    this.refreshLabels();
  }

  /* ------------------------------------------------------------ selection & card */
  select(id, { focus = false } = {}) {
    const it = this.itemById.get(id);
    if (!it) return;
    const vs = this.viewer.state;
    if (it.part.sex && it.part.sex !== vs.sex) this.setSex(it.part.sex);
    if (!vs.isolated && !vs.systems.has(it.part.sys)) this.setSystems(new Set([...vs.systems, it.part.sys]));
    if (vs.hidden.has(id)) { vs.hidden.delete(id); }
    if (vs.isolated && !vs.isolated.has(id)) vs.isolated = null;
    this.viewer.setState({ selected: id, dim: null });
    this.renderCard(it);
    if (focus) {
      this.viewer.focus(id);
      clearTimeout(this.revealT);
      this.revealT = setTimeout(() => this.revealIfHidden(id), 720);
    }
    const u = new URL(location.href); u.searchParams.set("p", id); history.replaceState(history.state, "", u);
    this.updateCount();
  }

  /** A part found by search may be buried under muscle: if so, fade everything else. */
  revealIfHidden(id) {
    const v = this.viewer, p = v.screenPoint(id);
    if (v.state.selected !== id || !p) return;
    const r = v.renderer.domElement.getBoundingClientRect();
    if (v.pick(r.left + p.x, r.top + p.y) !== id) v.setState({ dim: new Set([id]) });
  }

  closeCard() {
    this.el.card.hidden = true;
    this.root.classList.remove("has-card");
    clearTimeout(this.revealT);
    if (this.viewer.state.selected || this.viewer.state.dim) this.viewer.setState({ selected: null, dim: null });
    const u = new URL(location.href);
    if (u.searchParams.has("p")) { u.searchParams.delete("p"); history.replaceState(history.state, "", u); }
  }

  async renderCard(it) {
    const p = it.part, sys = this.sysById[p.sys], vs = this.viewer.state;
    const meta = p.meta ? Object.entries(p.meta).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("") : "";
    const facts = (p.facts || []).map((f) => `<li>${esc(f)}</li>`).join("");
    const isolated = vs.isolated && vs.isolated.has(it.id) && vs.isolated.size === 1;
    this.el.card.innerHTML = `
      <div class="at-card__head">
        <span class="at-card__sys"><i style="--c:${sys.color}"></i>${esc(sys.name)}${p.grp ? `<span> · ${esc(p.grp)}</span>` : ""}</span>
        <button type="button" class="at-x" data-card="close" aria-label="Close">${ICON.x}</button>
      </div>
      <h2>${esc(it.name)}</h2>
      ${p.org && p.org !== p.name ? `<p class="at-card__org">Part of the <b>${esc(p.org)}</b></p>` : ""}
      ${this.kids && p.kid ? `<p class="at-kid">${esc(p.kid)}</p>` : ""}
      <div class="at-card__body">
        <p>${esc(p.d)}</p>
        <h3>What it does</h3>
        <p>${esc(p.fn)}</p>
        ${!this.kids && p.kid ? `<p class="at-fact"><b>Did you know?</b> ${esc(p.kid)}</p>` : ""}
        ${facts ? `<ul class="at-facts">${facts}</ul>` : ""}
        ${meta ? `<dl class="at-meta">${meta}</dl>` : ""}
        <div data-labs></div>
      </div>
      <div class="at-card__acts">
        <button type="button" class="at-btn-dark" data-card="isolate">${ICON.isolate}<span>${isolated ? "Show everything" : "Isolate structure"}</span>${ICON.chevron}</button>
        <div class="at-card__row">
          <button type="button" data-card="focus">${ICON.focus}Focus</button>
          <button type="button" data-card="hide">${ICON.eyeOff}Hide</button>
          <button type="button" data-card="share">${ICON.link}Link</button>
        </div>
      </div>`;
    this.el.card.hidden = false;
    this.root.classList.add("has-card");
    this.el.card.scrollTop = 0;
    if (this.sp.id === "human") {
      try {
        const bm = await this.biomarkers();
        if (this.viewer.state.selected !== it.id) return;
        const labs = bm.markers.filter((m) => m.organs.includes(p.id));
        const box = $("[data-labs]", this.el.card);
        if (labs.length && box) box.innerHTML = `<h3>Related lab tests</h3><div class="at-chips">${labs.slice(0, 14).map((m) => `<button type="button" class="at-chip" data-lab="${m.id}">${esc(m.short || m.name)}</button>`).join("")}</div>`;
      } catch {}
    }
  }

  isolate(id) {
    const vs = this.viewer.state;
    if (vs.isolated && vs.isolated.has(id) && vs.isolated.size === 1) this.viewer.setState({ isolated: null });
    else { this.viewer.setState({ isolated: new Set([id]) }); this.viewer.focus(id); }
    const it = this.itemById.get(id); if (it) this.renderCard(it);
    this.updateCount(); this.refreshLabels();
  }

  hide(id) {
    const vs = this.viewer.state;
    vs.hidden.add(id);
    if (vs.isolated) { vs.isolated.delete(id); if (!vs.isolated.size) vs.isolated = null; }
    this.closeCard();
    this.viewer.setState({ hidden: vs.hidden });
    this.updateCount(); this.refreshLabels();
    GA().toast?.(`${this.itemById.get(id)?.name || "Structure"} hidden — “Show all” brings it back.`);
  }

  showAll() {
    const vs = this.viewer.state;
    this.viewer.setState({ hidden: new Set(), isolated: null, systems: new Set(this.sp.systems.filter((s) => !s.off || vs.systems.has(s.id)).map((s) => s.id)) });
    this.syncPresets(); this.updateCount(); this.refreshLabels();
    const sel = vs.selected && this.itemById.get(vs.selected);
    if (sel) this.renderCard(sel);
  }

  setSex(v) {
    this.viewer.setState({ sex: v });
    this.renderSystems();
    this.updateCount();
    this.dispatch("sex", { sex: v });
  }

  /* ------------------------------------------------------------ search */
  search(q) {
    q = q.trim().toLowerCase();
    const box = this.el.results;
    if (!q) { box.hidden = true; this.el.search.setAttribute("aria-expanded", "false"); return; }
    const words = q.split(/\s+/);
    const vs = this.viewer.state;
    const scored = [];
    const seen = new Set();
    for (const it of this.items) {
      if (it.part.sex && it.part.sex !== vs.sex) continue;
      const name = it.name.toLowerCase(), base = it.part.name.toLowerCase();
      const hay = `${name} ${it.part.grp || ""} ${it.part.org || ""} ${this.sysById[it.part.sys].name} ${it.part.aka || ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) continue;
      let s = 0;
      if (base === q || name === q) s += 100;
      if (base.startsWith(q)) s += 40;
      if (name.includes(q)) s += 20;
      if (words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name))) s += 10;
      s -= name.length * 0.05;
      if (it.side === "r" && !q.includes("right")) s -= 1; // list left before right
      scored.push([s, it]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const top = [];
    for (const [, it] of scored) { if (top.length >= 12) break; if (seen.has(it.id)) continue; seen.add(it.id); top.push(it); }
    this.results = top;
    this.resultIdx = 0;
    box.innerHTML = top.length ? top.map((it, i) => `<li role="option" data-res="${it.id}" aria-selected="${i === 0}"><i style="--c:${this.sysById[it.part.sys].color}"></i><span>${esc(it.name)}</span><em>${esc(this.sysById[it.part.sys].name)}</em></li>`).join("")
      : `<li class="at-results__empty">No structure matches “${esc(q)}”</li>`;
    box.hidden = false;
    this.el.search.setAttribute("aria-expanded", "true");
  }
  pickResult(id) {
    this.el.results.hidden = true;
    this.el.search.value = "";
    this.el.search.blur();
    if (this.quiz) return;
    this.select(id, { focus: true });
  }

  /* ------------------------------------------------------------ labels */
  refreshLabels() {
    const host = this.el.labels;
    if (!this.labelsOn || !this.sp) { host.innerHTML = ""; this.labelSet = null; return; }
    const vs = this.viewer.state;
    const want = this.items.filter((it) => (it.part.lbl || (this.kids && it.part.q === 1)) && (!it.side || it.side === "l" || it.part.lbl === 2) && this.viewer.byId.get(it.id)?.visible);
    host.innerHTML = want.map((it) => `<span data-l="${it.id}">${esc(it.side ? it.part.name : it.name)}</span>`).join("");
    this.labelSet = want.map((it) => [it.id, $(`[data-l="${CSS.escape(it.id)}"]`, host)]);
    this.positionLabels();
  }
  positionLabels() {
    if (!this.labelSet) return;
    const placed = [];
    for (const [id, el] of this.labelSet) {
      const p = this.viewer.screenPoint(id);
      if (!p) { el.style.opacity = 0; continue; }
      const clash = el.dataset.occ === "1" || placed.some((q) => Math.abs(q.x - p.x) < 70 && Math.abs(q.y - p.y) < 18);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
      el.style.opacity = clash ? 0 : 1;
      if (!clash) placed.push(p);
    }
    clearTimeout(this.occT);
    this.occT = setTimeout(() => this.checkOcclusion(), 180);
  }
  /** Once the camera settles, hide labels whose structure is buried under others. */
  checkOcclusion() {
    if (!this.labelSet) return;
    const v = this.viewer, r = v.renderer.domElement.getBoundingClientRect();
    let changed = false;
    for (const [id, el] of this.labelSet) {
      const p = v.screenPoint(id);
      if (!p) continue;
      const hit = v.pick(r.left + p.x, r.top + p.y);
      const same = hit === id || (hit && this.itemById.get(hit)?.part.org && this.itemById.get(hit).part.org === this.itemById.get(id)?.part.org);
      const occ = same ? "0" : "1";
      if (el.dataset.occ !== occ) { el.dataset.occ = occ; changed = true; }
    }
    if (changed) { clearTimeout(this.occT); this.positionLabels(); clearTimeout(this.occT); }
  }

  /* ------------------------------------------------------------ quiz */
  startQuiz() {
    this.closeSheet(); this.closeCard();
    const vs = this.viewer.state;
    const maxQ = this.kids ? 1 : 2;
    let pool = this.items.filter((it) => (it.part.q || 3) <= maxQ && (!it.part.sex || it.part.sex === vs.sex));
    if (this.kids) {
      // kids are asked for whole organs ("Find the Heart"), not individual chambers
      const seen = new Set();
      pool = this.items.filter((it) => (it.part.q === 1 || it.part.org) && (!it.part.sex || it.part.sex === vs.sex)).filter((it) => {
        const key = it.part.org || it.part.id;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    if (pool.length < 4) pool = this.items.filter((it) => !it.part.sex || it.part.sex === vs.sex);
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    this.quiz = { pool, i: 0, score: 0, tries: 0 };
    // make sure every question is answerable
    const need = new Set(pool.map((it) => it.part.sys));
    this.viewer.setState({ systems: new Set([...vs.systems, ...need]), isolated: null, hidden: new Set() });
    this.syncPresets(); this.updateCount();
    this.root.classList.add("is-quiz");
    this.renderQuiz();
  }
  quizTarget() { const q = this.quiz; return q && q.pool[q.i]; }
  quizMatches(id, target) {
    if (id === target.id) return true;
    const p = this.itemById.get(id)?.part;
    if (!this.kids || !p) return false;
    return p === target.part || (target.part.org && p.org === target.part.org); // kids: either side / any part of the organ
  }
  renderQuiz(msg = "", tone = "") {
    const q = this.quiz, t = this.quizTarget();
    if (!q) return;
    const el = this.el.quiz;
    el.hidden = false;
    if (!t) {
      el.innerHTML = `<div class="at-quiz__in"><b>Quiz complete!</b><span>You scored ${q.score} out of ${q.pool.length}.</span>
        <button type="button" data-quiz="again">Play again</button><button type="button" data-quiz="end">Done</button></div>`;
      return;
    }
    const label = this.kids ? (t.part.org || t.part.name) : t.name;
    el.innerHTML = `<div class="at-quiz__in">
      <span class="at-quiz__n">${q.i + 1}/${q.pool.length}</span>
      <span>Find the <b>${esc(label)}</b></span>
      <span class="at-quiz__score">★ ${q.score}</span>
      ${msg ? `<span class="at-quiz__msg ${tone}">${esc(msg)}</span>` : ""}
      <button type="button" data-quiz="skip">${q.tries >= 2 ? "Next" : "Skip"}</button><button type="button" data-quiz="end" aria-label="End quiz">${ICON.x}</button></div>`;
  }
  quizAnswer(id) {
    const q = this.quiz, t = this.quizTarget();
    if (!q || !t) return;
    const flash = (map, ms) => { this.viewer.setState({ status: map }); clearTimeout(this.quizT); this.quizT = setTimeout(() => this.viewer.setState({ status: null }), ms); };
    if (!id) return;
    if (this.quizMatches(id, t)) {
      if (q.tries < 2) q.score++;
      flash(new Map([[id, "#34C77B"]]), 900);
      q.i++; q.tries = 0;
      this.renderQuiz("Correct!", "ok");
      setTimeout(() => this.quiz && this.renderQuiz(), 900);
    } else {
      q.tries++;
      const name = this.itemById.get(id)?.name || "something else";
      if (q.tries >= 2) {
        flash(new Map([[t.id, "#34C77B"], [id, "#E5484D"]]), 2200);
        this.viewer.focus(t.id);
        this.renderQuiz(`That's the ${name}. Here's the answer.`, "bad");
      } else {
        flash(new Map([[id, "#E5484D"]]), 900);
        this.renderQuiz(`That's the ${name} — try again.`, "bad");
      }
    }
  }
  endQuiz() {
    if (!this.quiz) return;
    this.quiz = null;
    clearTimeout(this.quizT);
    this.el.quiz.hidden = true;
    this.root.classList.remove("is-quiz");
    this.viewer.setState({ status: null });
  }

  /* ------------------------------------------------------------ report sheet */
  async openSheet(opts = {}) {
    if (this.sp?.id !== "human") { await this.loadSpecies("human", { push: true }); }
    this.endQuiz();
    if (!this.report) {
      const { ReportSheet } = await import("./report.mjs");
      this.report = new ReportSheet(this, this.el.sheet);
    }
    this.closeCard();
    this.el.sheet.hidden = false;
    this.root.classList.add("has-sheet");
    this.report.open(opts);
  }
  closeSheet() {
    if (this.el.sheet.hidden) return;
    this.el.sheet.hidden = true;
    this.root.classList.remove("has-sheet");
    this.report?.onClose();
  }

  /** Colour structures by lab status (Map id→css colour) or clear with null. */
  showStatus(map, { pulse = true } = {}) {
    this.viewer.setState({ status: map && map.size ? map : null, explode: 0 });
    this.el.explode.value = 0; this.el.exout.textContent = "0%"; GA().paintRange?.(this.el.explode);
    this.viewer.setPulse(!!(map && map.size && pulse));
  }
  /** Expand base part ids (e.g. "kidney") into instance ids ("kidney.l", "kidney.r"). */
  instancesOf(baseId) {
    return this.items.filter((it) => it.part.id === baseId).map((it) => it.id);
  }

  /* ------------------------------------------------------------ events */
  bind() {
    const r = this.root, v = this.viewer, el = this.el;

    el.speciesTabs.addEventListener("click", (e) => {
      const a = e.target.closest("[data-sp]");
      if (!a) return;
      e.preventDefault();
      if (a.dataset.sp !== this.sp?.id) this.loadSpecies(a.dataset.sp, { push: true });
    });
    window.addEventListener("popstate", () => {
      const id = PATH_SPECIES[location.pathname.replace(/\/$/, "") || "/"] || "human";
      if (id !== this.sp?.id) this.loadSpecies(id);
    });

    el.presets.addEventListener("click", (e) => {
      const b = e.target.closest("[data-preset]");
      if (!b) return;
      const p = this.sp.presets.find((x) => x.id === b.dataset.preset);
      this.viewer.state.isolated = null;
      this.setSystems(new Set(p.sys));
    });
    el.syslist.addEventListener("click", (e) => {
      const only = e.target.closest("[data-only]");
      const b = e.target.closest("[data-sys]");
      const vs = v.state;
      if (only) { vs.isolated = null; this.setSystems(new Set([only.dataset.only])); return; }
      if (!b) return;
      const s = new Set(vs.systems), id = b.dataset.sys;
      s.has(id) ? s.delete(id) : s.add(id);
      vs.isolated = null;
      this.setSystems(s);
    });
    el.sex.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) this.setSex(b.dataset.v); });
    el.kids.addEventListener("change", () => {
      this.kids = el.kids.checked;
      try { localStorage.setItem("gh-kids", this.kids ? "1" : "0"); } catch {}
      r.classList.toggle("is-kids", this.kids);
      if (this.kids && !this.labelsOn) this.toggleLabels(true);
      const sel = v.state.selected && this.itemById.get(v.state.selected);
      if (sel) this.renderCard(sel);
      this.refreshLabels();
    });
    $("[data-showall]", r).addEventListener("click", () => this.showAll());
    $("[data-close-systems]", r).addEventListener("click", () => r.classList.remove("show-systems"));

    // search
    el.search.addEventListener("input", () => this.search(el.search.value));
    el.search.addEventListener("keydown", (e) => {
      const list = this.results || [];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.resultIdx = (this.resultIdx + (e.key === "ArrowDown" ? 1 : -1) + list.length) % Math.max(list.length, 1);
        $$("[data-res]", el.results).forEach((n, i) => n.setAttribute("aria-selected", String(i === this.resultIdx)));
      } else if ((e.key === "Enter" || e.keyCode === 13) && list[this.resultIdx]) { e.preventDefault(); this.pickResult(list[this.resultIdx].id); }
      else if (e.key === "Escape") { el.search.value = ""; this.search(""); el.search.blur(); }
    });
    el.results.addEventListener("mousedown", (e) => { const li = e.target.closest("[data-res]"); if (li) { e.preventDefault(); this.pickResult(li.dataset.res); } });
    el.search.addEventListener("blur", () => setTimeout(() => (el.results.hidden = true), 120));
    el.search.addEventListener("focus", () => el.search.value && this.search(el.search.value));

    // top actions
    r.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "report") this.openSheet();
      else if (act === "quiz") this.quiz ? this.endQuiz() : this.startQuiz();
      else if (act === "systems") r.classList.toggle("show-systems");
    });

    // toolbar
    $(".at-tools", r).addEventListener("click", (e) => {
      const b = e.target.closest("[data-tool]");
      if (!b) return;
      const t = b.dataset.tool;
      if (t === "zoomin") v.zoom(0.72);
      else if (t === "zoomout") v.zoom(1.38);
      else if (t === "reset") v.resetView();
      else if (t === "rotate") { v.autoRotate = !v.autoRotate; b.setAttribute("aria-pressed", String(v.autoRotate)); }
      else if (t === "xray") { v.setState({ xray: !v.state.xray }); b.setAttribute("aria-pressed", String(v.state.xray)); }
      else if (t === "labels") this.toggleLabels();
      else if (t === "shot") this.snapshot();
      else if (t === "full") this.fullscreen();
    });

    // structure card
    el.card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-card]");
      const lab = e.target.closest("[data-lab]");
      const id = v.state.selected;
      if (lab) { this.openSheet({ marker: lab.dataset.lab }); return; }
      if (!b || !id) { if (b?.dataset.card === "close") this.closeCard(); return; }
      const a = b.dataset.card;
      if (a === "close") this.closeCard();
      else if (a === "isolate") this.isolate(id);
      else if (a === "focus") v.focus(id);
      else if (a === "hide") this.hide(id);
      else if (a === "share") { GA().copy?.(location.href); GA().toast?.("Link to this structure copied"); }
    });

    // explode
    el.explode.addEventListener("pointerdown", () => { v.userMoved = false; });
    el.explode.addEventListener("input", () => {
      const t = el.explode.value / 100;
      el.exout.textContent = `${el.explode.value}%`;
      v.setState({ explode: t });
      if (!v.userMoved) v.frame(v.meshes.filter((m) => m.visible), false, 1.08);
      this.positionLabels();
    });

    // quiz
    el.quiz.addEventListener("click", (e) => {
      const a = e.target.closest("[data-quiz]")?.dataset.quiz;
      if (a === "end") this.endQuiz();
      else if (a === "again") this.startQuiz();
      else if (a === "skip" && this.quiz) { this.quiz.i++; this.quiz.tries = 0; this.viewer.setState({ status: null }); this.renderQuiz(); }
    });

    // canvas pointer: hover, click, double-click
    const canvas = v.renderer.domElement;
    let down = null, raf = 0, lastMove = null;
    canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      lastMove = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (e.buttons) { this.hover(null); return; }
        this.hover(v.pick(lastMove.clientX, lastMove.clientY), lastMove);
      });
    });
    canvas.addEventListener("pointerleave", () => this.hover(null));
    canvas.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const id = v.pick(e.clientX, e.clientY);
      if (this.quiz) { this.quizAnswer(id); return; }
      if (id) this.select(id); else if (!this.el.card.hidden) this.closeCard();
      r.classList.remove("show-systems");
    });
    canvas.addEventListener("dblclick", (e) => { const id = v.pick(e.clientX, e.clientY); if (id && !this.quiz) { this.select(id); v.focus(id); } });
    v.addEventListener("render", () => this.positionLabels());

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const id = v.state.selected;
      if (e.key === "/") { e.preventDefault(); el.search.focus(); }
      else if (e.key === "Escape") { if (this.quiz) this.endQuiz(); else if (!el.sheet.hidden) this.closeSheet(); else if (v.state.isolated) this.isolate([...v.state.isolated][0]); else this.closeCard(); }
      else if (e.key === "r" || e.key === "R") v.resetView();
      else if (e.key === "x" || e.key === "X") $('[data-tool="xray"]', r).click();
      else if (e.key === "l" || e.key === "L") this.toggleLabels();
      else if ((e.key === "f" || e.key === "F") && id) v.focus(id);
      else if ((e.key === "h" || e.key === "H") && id) this.hide(id);
      else if ((e.key === "i" || e.key === "I") && id) this.isolate(id);
    });
  }

  hover(id, e) {
    const v = this.viewer, tip = this.el.tip;
    if (v.state.hovered !== id) v.setState({ hovered: id });
    if (!id || this.quiz) { tip.hidden = true; this.el.stage.style.cursor = ""; return; }
    const it = this.itemById.get(id);
    const r = this.root.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(it.name)}</b><span>${esc(this.sysById[it.part.sys].name)}</span>`;
    tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 12}px)`;
    tip.hidden = false;
    this.el.stage.style.cursor = "pointer";
  }

  toggleLabels(on = !this.labelsOn) {
    this.labelsOn = on;
    $('[data-tool="labels"]', this.root).setAttribute("aria-pressed", String(on));
    this.refreshLabels();
  }

  snapshot() {
    const url = this.viewer.snapshot();
    const a = document.createElement("a");
    a.href = url;
    a.download = `gethealth-${this.sp.id}${this.viewer.state.selected ? `-${this.viewer.state.selected}` : ""}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.root.requestFullscreen?.().catch(() => GA().toast?.("Full screen isn't available here"));
  }
}

/* ---------------------------------------------------------------- boot */
export function boot() {
  const root = document.querySelector("[data-atlas]");
  if (!root) return;
  const app = new App(root);
  window.GetHealth = app;
  const params = new URLSearchParams(location.search);
  const species = root.dataset.atlas || PATH_SPECIES[location.pathname.replace(/\/$/, "") || "/"] || "human";
  app.start(species, { select: params.get("p") }).then(() => {
    if (root.dataset.openReport != null || params.get("report") != null) app.openSheet({ tab: params.get("report") || undefined });
  });
}
