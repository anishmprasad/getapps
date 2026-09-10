/* =====================================================================
   GetHealth — 3D viewer
   Owns the three.js scene. The app layer tells it *what* state to show
   (visible systems, selection, isolation, report colours, explode amount)
   and the viewer works out every material from that state in one place,
   refreshAppearance(), so no two features can fight over a mesh.
   ===================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildGeometry, mirrorGeometry } from "./geo.mjs";

/* ---------------------------------------------------------------- materials */
function stripeTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 8;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, 128, 8);
  for (let x = 0; x < 128; x += 2 + Math.random() * 3) {
    const v = 90 + Math.random() * 90;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1 + Math.random() * 1.5, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
let STRIPES = null;

const PRESETS = {
  bone:      { color: "#E9DEC8", roughness: 0.62, metalness: 0.0 },
  cartilage: { color: "#C9DDE0", roughness: 0.38, clearcoat: 0.4 },
  tooth:     { color: "#F6F2E7", roughness: 0.22, clearcoat: 0.6 },
  muscle:    { color: "#B9434F", roughness: 0.5, clearcoat: 0.25, stripes: true },
  tendon:    { color: "#E7DECC", roughness: 0.4, clearcoat: 0.3, stripes: true },
  artery:    { color: "#C8232F", roughness: 0.35, clearcoat: 0.5 },
  vein:      { color: "#3353B5", roughness: 0.35, clearcoat: 0.5 },
  nerve:     { color: "#F0C24A", roughness: 0.45, clearcoat: 0.2 },
  organ:     { color: "#D98B70", roughness: 0.42, clearcoat: 0.45 },
  brain:     { color: "#E6B2AE", roughness: 0.55, clearcoat: 0.2 },
  gland:     { color: "#C98A58", roughness: 0.45, clearcoat: 0.3 },
  lymph:     { color: "#7DBB63", roughness: 0.45, clearcoat: 0.3 },
  skin:      { color: "#E8BC9A", roughness: 0.55, transparent: true, opacity: 0.22, depthWrite: false },
  cuticle:   { color: "#6E3B1C", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.25 },
  frogskin:  { color: "#6F8F3A", roughness: 0.4, clearcoat: 0.6, transparent: true, opacity: 0.3, depthWrite: false },
  wing:      { color: "#A5703C", roughness: 0.3, clearcoat: 0.7, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide },
  fat:       { color: "#EDD27A", roughness: 0.55, clearcoat: 0.2 },
};
const SYS_MAT = {
  skeletal: "bone", muscular: "muscle", heart: "organ", arteries: "artery", veins: "vein", nervous: "nerve",
  respiratory: "organ", digestive: "organ", sensory: "organ", endocrine: "gland", urinary: "organ",
  reproductive: "organ", lymphatic: "lymph", integumentary: "skin", exoskeleton: "cuticle", appendages: "cuticle",
  circulatory: "artery", excretory: "organ", urogenital: "organ", fatbody: "fat",
};

function makeMaterial(part, sysColor) {
  const key = part.mat || SYS_MAT[part.sys] || "organ";
  const p = PRESETS[key] || PRESETS.organ;
  if (p.stripes && !STRIPES) STRIPES = stripeTexture();
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(part.col || p.color || sysColor),
    roughness: p.roughness ?? 0.5,
    metalness: p.metalness ?? 0,
    clearcoat: p.clearcoat ?? 0,
    clearcoatRoughness: p.clearcoatRoughness ?? 0.4,
    transparent: !!p.transparent,
    opacity: p.opacity ?? 1,
    depthWrite: p.depthWrite ?? true,
    side: p.side ?? THREE.FrontSide,
    bumpMap: p.stripes ? STRIPES : null,
    bumpScale: p.stripes ? 1.2 : 0,
  });
  m.userData.base = { color: m.color.clone(), opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite };
  return m;
}

/* ---------------------------------------------------------------- meshing pool */
let POOL = null, GEN = 0;
function getPool() {
  if (POOL !== null) return POOL;
  try {
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    POOL = Array.from({ length: n }, () => new Worker(new URL("./geo-worker.mjs", import.meta.url), { type: "module" }));
  } catch { POOL = false; }
  return POOL;
}
function toGeometry({ pos, nor, uv, idx }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
// Rough cost so the slowest parts start first and the pool finishes evenly.
const cost = (p) => p.g.reduce((s, q) => s + (q.t === "sdf" ? 20 + q.prims.length : q.t === "sheet" ? 14 : 1), 0);

/** Mesh `parts`, calling add(index, geometry|null) as each one completes. */
async function meshAll(parts, add) {
  const order = parts.map((_, i) => i).sort((a, b) => cost(parts[b]) - cost(parts[a]));
  const done = new Set();
  const finish = (i, geo) => { if (!done.has(i)) { done.add(i); add(i, geo); } };
  const local = async () => {
    let t = performance.now();
    for (const i of order) {
      if (done.has(i)) continue;
      let geo = null;
      try { geo = buildGeometry(parts[i].g); } catch (e) { console.warn("GetHealth: could not mesh", parts[i].id, e); }
      finish(i, geo);
      if (performance.now() - t > 30) { await new Promise((r) => setTimeout(r, 0)); t = performance.now(); }
    }
  };
  const pool = getPool();
  if (!pool) return local();
  const gen = ++GEN;
  const ok = await new Promise((resolve) => {
    let next = 0;
    const feed = (w) => {
      if (next < order.length) { const i = order[next++]; w.postMessage({ gen, i, g: parts[i].g }); }
    };
    for (const w of pool) {
      w.onmessage = ({ data }) => {
        if (data.gen !== gen) return;
        let geo = null;
        if (data.error) console.warn("GetHealth: could not mesh", parts[data.i].id, data.error);
        else geo = toGeometry(data);
        finish(data.i, geo);
        if (done.size === order.length) resolve(true); else feed(w);
      };
      // A module worker that fails to start (old browser, blocked URL) lands
      // here; finish the job on the main thread instead.
      w.onerror = (e) => { e.preventDefault?.(); resolve(false); };
      feed(w);
    }
  });
  if (!ok) { POOL = false; pool.forEach((w) => w.terminate()); await local(); }
}

/* ---------------------------------------------------------------- viewer */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Viewer extends EventTarget {
  constructor(host) {
    super();
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.005, 60);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 0.04;
    this.controls.maxDistance = 14;
    this.controls.addEventListener("change", () => (this.dirty = true));
    this.controls.addEventListener("start", () => { this.userMoved = true; this.stopFlight(); this.dispatchEvent(new Event("interact")); });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8d7f76, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-2, 3, 4);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.9); fill.position.set(3, 1, 2);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, 2, -4);
    this.camLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.scene.add(key, fill, rim, this.camLight, this.camLight.target);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.meshes = [];          // every mesh in load order
    this.byId = new Map();     // instance id → mesh
    this.state = {
      systems: new Set(), hidden: new Set(), isolated: null, selected: null, hovered: null,
      xray: false, status: null, sex: "m", explode: 0, dim: null,
    };
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dirty = true;
    this.autoRotate = false;

    this.outline = null;
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Screen space taken by UI chrome, in px; the model is centred in what's left. */
  setPad(pad) { this.pad = pad; this.resize(); }
  resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, p = this.pad || { t: 0, r: 0, b: 0, l: 0 };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const ox = (p.r - p.l) / 2, oy = (p.b - p.t) / 2;
    if (ox || oy) this.camera.setViewOffset(w, h, ox, oy, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  /** Camera distance that fits a sphere of radius r into the free area. */
  fitDist(r, k = 1.12) {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, p = this.pad || { t: 0, r: 0, b: 0, l: 0 };
    const fh = Math.max(0.3, (h - p.t - p.b) / h), fw = Math.max(0.3, (w - p.l - p.r) / w);
    const vf = (this.camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    const a = Math.min(2 * Math.atan(Math.tan(vf / 2) * fh), 2 * Math.atan(Math.tan(hf / 2) * fw));
    return Math.max((r * k) / Math.sin(a / 2), 0.08);
  }

  loop(t) {
    requestAnimationFrame(this.loop);
    if (this.flight) this.stepFlight(t);
    if (this.autoRotate && !this.flight) { this.controls.autoRotate = true; this.controls.autoRotateSpeed = 1.2; }
    else this.controls.autoRotate = false;
    const moved = this.controls.update();
    if (this.pulse) this.stepPulse(t);
    if (!moved && !this.dirty && !this.autoRotate) return;
    this.camLight.position.copy(this.camera.position);
    this.camLight.target.position.copy(this.controls.target);
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.dispatchEvent(new Event("render"));
  }

  /* ------------------------------------------------------------ loading */
  clear() {
    for (const m of this.meshes) { m.geometry.dispose(); m.material.dispose(); }
    this.root.clear();
    this.meshes = [];
    this.byId.clear();
    this.clearOutline();
    this.dirty = true;
  }

  /**
   * Mesh every part — on a pool of workers when the browser allows it, on
   * the main thread otherwise. `onProgress(done, total)` drives the loading bar.
   */
  async load(species, onProgress) {
    this.clear();
    this.species = species;
    const token = (this.loadToken = {});
    const sysColor = Object.fromEntries(species.systems.map((s) => [s.id, s.color]));
    const parts = species.parts;
    const built = new Array(parts.length);
    let done = 0;
    const add = (i, geo) => {
      if (token !== this.loadToken) return;
      if (!geo) { onProgress?.(++done, parts.length); return; }
      const part = parts[i];
      const sides = part.bi ? [["l", geo], ["r", mirrorGeometry(geo)]] : [[null, geo]];
      if (part.ro && sides[1]) { // per-side offset, e.g. the right kidney sits lower
        sides[1][1].translate(part.ro[0], part.ro[1], part.ro[2]);
        sides[1][1].computeBoundingBox(); sides[1][1].computeBoundingSphere();
      }
      built[i] = sides.map(([side, g]) => {
        const mesh = new THREE.Mesh(g, makeMaterial(part, sysColor[part.sys]));
        const id = side ? `${part.id}.${side}` : part.id;
        mesh.name = id;
        mesh.userData = { id, part, side, center: g.boundingSphere.center.clone(), radius: g.boundingSphere.radius };
        if (part.mat === "skin" || part.sys === "integumentary") mesh.renderOrder = 10;
        return mesh;
      });
      onProgress?.(++done, parts.length);
    };
    await meshAll(parts, add);
    if (token !== this.loadToken) return false;
    for (const list of built) for (const mesh of list || []) {
      this.root.add(mesh);
      this.meshes.push(mesh);
      this.byId.set(mesh.userData.id, mesh);
    }
    this.layout = null;
    this.refreshAppearance();
    this.frameAll(false);
    return true;
  }

  /* ------------------------------------------------------------ visibility & appearance */
  isShown(mesh) {
    const s = this.state, p = mesh.userData.part;
    if (p.sex && p.sex !== s.sex) return false;
    if (s.isolated) return s.isolated.has(mesh.userData.id);
    return s.systems.has(p.sys) && !s.hidden.has(mesh.userData.id);
  }

  refreshAppearance() {
    const s = this.state;
    const sel = s.selected, hov = s.hovered;
    const accent = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#F0506E");
    const grey = new THREE.Color("#9AA0AA");
    for (const m of this.meshes) {
      const mat = m.material, base = mat.userData.base, id = m.userData.id;
      m.visible = this.isShown(m);
      if (!m.visible) continue;
      let color = base.color.clone(), opacity = base.opacity, emissive = 0x000000, ei = 0;
      let transparent = base.transparent, depthWrite = base.depthWrite;
      const statusCol = s.status?.get(id);
      if (s.status) {
        if (statusCol) { color.lerp(new THREE.Color(statusCol), 0.72); emissive = statusCol; ei = 0.28; }
        else { color.lerp(grey, 0.6); opacity = Math.min(opacity, 0.1); transparent = true; depthWrite = false; }
      } else if (s.dim && !s.dim.has(id)) {
        opacity = Math.min(opacity, 0.14); transparent = true; depthWrite = false;
      } else if (s.xray && id !== sel) {
        opacity = Math.min(opacity, 0.2); transparent = true; depthWrite = false;
      }
      if (id === sel) { emissive = accent; ei = 0.32; opacity = Math.max(opacity, base.opacity); if (!base.transparent) { transparent = false; depthWrite = true; } }
      else if (id === hov) { emissive = accent; ei = Math.max(ei, 0.16); }
      mat.color.copy(color);
      mat.emissive.set(emissive);
      mat.emissiveIntensity = ei;
      if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true; }
      mat.opacity = opacity;
      mat.depthWrite = depthWrite;
    }
    this.syncOutline();
    this.dirty = true;
  }

  setState(patch) {
    Object.assign(this.state, patch);
    if ("systems" in patch || "isolated" in patch || "hidden" in patch || "sex" in patch) this.layout = null;
    if ("explode" in patch || this.layout === null) this.applyExplode();
    this.refreshAppearance();
  }

  /* ------------------------------------------------------------ selection outline */
  clearOutline() {
    if (this.outline) { this.outline.parent?.remove(this.outline); this.outline.material.dispose(); this.outline = null; }
  }
  syncOutline() {
    const id = this.state.selected;
    if (this.outline && this.outline.userData.for === id) { this.outline.visible = !!this.byId.get(id)?.visible; return; }
    this.clearOutline();
    const mesh = id && this.byId.get(id);
    if (!mesh) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#F0506E";
    const w = Math.max(0.0007, Math.min(0.004, mesh.userData.radius * 0.035));
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(accent) }, w: { value: w } },
      vertexShader: "uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }",
      fragmentShader: "uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }",
      side: THREE.BackSide,
    });
    const o = new THREE.Mesh(mesh.geometry, mat);
    o.userData.for = id;
    o.raycast = () => {};
    mesh.add(o);
    this.outline = o;
    o.visible = mesh.visible;
  }

  /* ------------------------------------------------------------ explode */
  computeLayout() {
    const shown = this.meshes.filter((m) => this.isShown(m));
    const order = new Map(this.species.systems.map((s, i) => [s.id, i]));
    const items = shown.map((m) => {
      const bb = m.geometry.boundingBox;
      const size = new THREE.Vector3(); bb.getSize(size);
      const c = new THREE.Vector3(); bb.getCenter(c);
      return { m, w: size.x, h: size.y, c, sys: order.get(m.userData.part.sys) ?? 99 };
    });
    items.sort((a, b) => a.sys - b.sys || b.h - a.h || b.w - a.w);
    const gap = (it) => 0.006 + Math.max(it.w, it.h) * 0.12;
    const area = items.reduce((s, it) => s + (it.w + gap(it)) * (it.h + gap(it)), 0);
    const rowW = Math.max(0.3, Math.sqrt(area) * 1.55);
    let x = 0, y = 0, rowH = 0, rows = [], row = [];
    for (const it of items) {
      const w = it.w + gap(it);
      if (x + w > rowW && row.length) { rows.push({ row, rowH }); y += rowH; x = 0; rowH = 0; row = []; }
      it.x = x + w / 2; it.y = y; row.push(it);
      x += w; rowH = Math.max(rowH, it.h + gap(it));
    }
    if (row.length) rows.push({ row, rowH }), (y += rowH);
    // centre each row horizontally, and the block vertically on the model's centre
    const center = new THREE.Vector3(); new THREE.Box3().setFromObject(this.root).getCenter(center);
    const totalH = y;
    this.layout = new Map();
    for (const { row, rowH } of rows) {
      const last = row[row.length - 1], width = last.x + (last.w + gap(last)) / 2;
      for (const it of row) {
        const tx = it.x - width / 2, ty = center.y + totalH / 2 - it.y - rowH / 2;
        this.layout.set(it.m, new THREE.Vector3(tx - it.c.x, ty - it.c.y, -it.c.z));
      }
    }
    this.layoutCenter = center;
  }

  applyExplode() {
    const t = this.state.explode || 0;
    if (t <= 0) { for (const m of this.meshes) m.position.set(0, 0, 0); this.dirty = true; return; }
    if (!this.layout) this.computeLayout();
    const e = ease(t), burst = Math.sin(Math.PI * t) * 0.35;
    for (const m of this.meshes) {
      const target = this.layout.get(m);
      if (!target) { m.position.set(0, 0, 0); continue; }
      const out = m.userData.center.clone().sub(this.layoutCenter).multiplyScalar(burst);
      m.position.copy(target).multiplyScalar(e).add(out);
    }
    this.dirty = true;
  }

  /* ------------------------------------------------------------ picking */
  pick(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const s = this.state;
    const cands = this.meshes.filter((m) => m.visible && m.userData.part.sys !== "integumentary" &&
      !(s.status && !s.status.has(m.userData.id)) && !(s.dim && !s.dim.has(m.userData.id)));
    const hit = this.raycaster.intersectObjects(cands, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  /* ------------------------------------------------------------ camera */
  boundsOf(meshes) {
    const box = new THREE.Box3();
    for (const m of meshes) {
      const b = m.geometry.boundingBox.clone().translate(m.position);
      box.union(b);
    }
    return box;
  }
  frame(meshes, animate = true, pad = 1.25) {
    if (!meshes.length) return;
    const box = this.boundsOf(meshes);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = this.fitDist(sphere.radius, pad);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (!isFinite(dir.x) || dir.lengthSq() < 0.5) dir.set(0, 0.05, 1).normalize();
    this.flyTo(sphere.center, sphere.center.clone().addScaledVector(dir, dist), animate);
  }
  frameAll(animate = true) {
    const shown = this.meshes.filter((m) => m.visible);
    if (!shown.length) return;
    if (!animate) {
      const cam = this.species.camera || {};
      const box = this.boundsOf(shown), c = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const dist = this.fitDist(sphere.radius, 1.0);
      this.controls.target.copy(c);
      const dir = new THREE.Vector3(...(cam.dir || [0, 0.08, 1])).normalize();
      this.camera.position.copy(c).addScaledVector(dir, dist);
      this.controls.update();
      this.dirty = true;
      return;
    }
    this.frame(shown, true, 1.12);
  }
  resetView() {
    const shown = this.meshes.filter((m) => m.visible);
    if (!shown.length) return;
    const cam = this.species.camera || {};
    const box = this.boundsOf(shown), sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = this.fitDist(sphere.radius, 1.0);
    const dir = new THREE.Vector3(...(cam.dir || [0, 0.08, 1])).normalize();
    this.flyTo(sphere.center, sphere.center.clone().addScaledVector(dir, dist), true);
  }
  focus(id) {
    const m = this.byId.get(id);
    if (m) this.frame([m], true, 2.4);
  }
  zoom(f) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance);
    this.flyTo(this.controls.target.clone(), this.controls.target.clone().add(off.setLength(len)), true, 280);
  }
  flyTo(target, pos, animate = true, ms = 650) {
    if (!animate) { this.controls.target.copy(target); this.camera.position.copy(pos); this.dirty = true; return; }
    this.flight = { t0: performance.now(), ms, fromT: this.controls.target.clone(), fromP: this.camera.position.clone(), toT: target.clone(), toP: pos.clone() };
  }
  stepFlight(now) {
    const f = this.flight, t = Math.min((now - f.t0) / f.ms, 1), e = ease(t);
    this.controls.target.lerpVectors(f.fromT, f.toT, e);
    // interpolate the offset in length and direction separately so zooms don't swoop
    const a = f.fromP.clone().sub(f.fromT), b = f.toP.clone().sub(f.toT);
    const len = a.length() + (b.length() - a.length()) * e;
    const dir = a.normalize().lerp(b.normalize(), e).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, len);
    this.dirty = true;
    if (t >= 1) this.flight = null;
  }
  stopFlight() { this.flight = null; }

  /* ------------------------------------------------------------ misc */
  setPulse(on) { this.pulse = on ? { t0: performance.now() } : null; if (!on) this.refreshAppearance(); }
  stepPulse(now) {
    const k = 0.18 + 0.14 * Math.sin((now - this.pulse.t0) / 260);
    for (const m of this.meshes) if (m.visible && this.state.status?.get(m.userData.id)) m.material.emissiveIntensity = k;
    this.dirty = true;
  }

  screenPoint(id) {
    const m = this.byId.get(id);
    if (!m || !m.visible) return null;
    const p = m.userData.center.clone().add(m.position).project(this.camera);
    if (p.z > 1) return null;
    const r = this.renderer.domElement;
    return { x: (p.x * 0.5 + 0.5) * r.clientWidth, y: (-p.y * 0.5 + 0.5) * r.clientHeight };
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }
}
