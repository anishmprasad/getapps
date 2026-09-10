/**
 * Shared helpers for the GetHealth data build: small vector maths plus
 * constructors for the primitive specs understood by
 * sites/gethealth/assets/js/atlas/geo.mjs.
 *
 * Space: metres, +x = the subject's left, +y up, +z anterior.
 */

/* ---------------------------------------------------------------- vectors */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mid = (a, b) => lerp(a, b, 0.5);
/** Reflect across the sagittal plane. */
export const mx = (a) => [-a[0], a[1], a[2]];
export const deg = (d) => (d * Math.PI) / 180;

/**
 * A local coordinate frame. `at([u, v, w])` maps local coordinates to world
 * space along the three (not necessarily orthogonal) axes.
 */
export function frame(o, ux, uy, uz) {
  return {
    o, ux, uy, uz,
    at: (p) => add(o, add(mul(ux, p[0]), add(mul(uy, p[1]), mul(uz, p[2])))),
  };
}
/** Orthonormal frame with +y along `dir`, +z leaning towards `hint`. */
export function alongFrame(o, dir, hint = [0, 0, 1]) {
  const y = norm(dir);
  let z = sub(hint, mul(y, dot(hint, y)));
  if (len(z) < 1e-6) z = sub([1, 0, 0], mul(y, y[0]));
  z = norm(z);
  const x = cross(y, z);
  return frame(o, x, y, z);
}

/* ---------------------------------------------------------------- mesh primitives */
export const ell = (c, r, o = {}) => ({ t: "ell", c, r, ...o });
export const bone = (a, b, r, o = {}) => ({ t: "bone", a, b, r, ...o });
export const spin = (a, b, r, o = {}) => ({ t: "spin", a, b, r, ...o });
export const tube = (p, r, o = {}) => ({ t: "tube", p, r, ...o });
export const cyl = (a, b, r, o = {}) => ({ t: "cyl", a, b, r, ...o });
export const lathe = (c, prof, o = {}) => ({ t: "lathe", c, prof, ...o });
export const sdf = (prims, o = {}) => ({ t: "sdf", prims, ...o });
export const sheet = (pts, th, o = {}) => ({ t: "sheet", pts, th, ...o });

/* ---------------------------------------------------------------- SDF primitives */
export const S = {
  sph: (c, r, o = {}) => ({ t: "sph", c, r, ...o }),
  ell: (c, r, o = {}) => ({ t: "ell", c, r, ...o }),
  cap: (a, b, r, rb, o = {}) => ({ t: "cap", a, b, r, ...(rb != null && rb !== r ? { rb } : {}), ...o }),
  box: (c, s, o = {}) => ({ t: "box", c, s, ...o }),
  rcyl: (a, b, r, o = {}) => ({ t: "rcyl", a, b, r, ...o }),
  tor: (c, R, r, o = {}) => ({ t: "tor", c, R, r, ...o }),
  pl: (c, n, o = {}) => ({ t: "pl", c, n, ...o }),
  /** Polyline of round-cone capsules through `pts` with radii `rs`. */
  chain: (pts, rs, o = {}) => pts.slice(1).map((p, i) => ({
    t: "cap", a: pts[i], b: p,
    r: Array.isArray(rs) ? rs[i] : rs, ...(Array.isArray(rs) ? { rb: rs[i + 1] } : {}), ...o,
  })),
};

/* ---------------------------------------------------------------- mirroring */
const MIRROR_KEYS = new Set(["c", "a", "b"]);
/** Mirror a primitive spec (mesh or SDF) across x = 0. */
export function mirrorPrim(p) {
  const q = { ...p };
  for (const k of Object.keys(q)) {
    if (MIRROR_KEYS.has(k) && Array.isArray(q[k]) && q[k].length === 3) q[k] = mx(q[k]);
  }
  if (q.p) q.p = q.p.map(mx);
  if (q.n && Array.isArray(q.n)) q.n = mx(q.n);
  if (q.nz) q.nz = mx(q.nz);
  if (q.up) q.up = mx(q.up);
  // Sheets: reflect the in-plane x axis *and* the outline so uz = ux × uy
  // still points the same way after mirroring (a plain reflection would
  // flip the thickness direction).
  if (q.t === "sheet" && !q.wr) {
    q.ux = mul(mx(q.ux || [1, 0, 0]), -1);
    q.uy = mx(q.uy || [0, 1, 0]);
    q.pts = q.pts.map(([x, y]) => [-x, y]);
  }
  if (q.wr) {
    q.wr = { ...q.wr, a0: -(q.wr.a0 || 0), tab: q.wr.tab.map((r) => (r.length > 4 ? [r[0], r[1], r[2], r[3], -r[4]] : r)) };
    q.pts = q.pts.map(([x, y]) => [-x, y]);
  }
  if (q.e) q.e = [q.e[0], -q.e[1], -q.e[2]];
  if (q.prims) q.prims = q.prims.map(mirrorPrim);
  return q;
}
/** Both sides of a set of SDF primitives, for midline parts built from paired features. */
export const both = (prims) => [...prims, ...prims.map(mirrorPrim)];

/* ---------------------------------------------------------------- parts */
const REQUIRED = ["id", "name", "sys", "g"];
export function makePart(p) {
  for (const k of REQUIRED) if (p[k] == null) throw new Error(`part ${p.id || "?"} missing ${k}`);
  if (!Array.isArray(p.g) || !p.g.length) throw new Error(`part ${p.id} has no geometry`);
  return p;
}

/** JSON replacer: round every number to 0.1 mm and drop empty values. */
export function replacer(_k, v) {
  if (typeof v === "number") return Math.round(v * 1e4) / 1e4;
  if (v === undefined || v === null || v === "") return undefined;
  return v;
}
