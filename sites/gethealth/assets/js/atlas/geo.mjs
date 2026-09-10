/* =====================================================================
   GetHealth — geometry engine
   Turns the compact primitive specs in data/*.json into BufferGeometry.
   Space: metres, +x = the subject's left, +y up, +z anterior (towards
   the viewer). Every builder returns an indexed geometry carrying
   position, normal and uv so parts can be merged freely.

   Primitive types
     ell    ellipsoid                     { c, r:[x,y,z], e?, n?, nf? }
     bone   long bone with epiphyses      { a, b, r, ha?, hb?, f?, fl? }
     spin   fusiform muscle belly         { a, b, r, f?, bias?, p?, nz?, bow?, tr? }
     tube   swept tube (vessels, nerves)  { p:[...], r | r:[...], fa?, up?, cl? }
     lathe  revolved profile              { c, prof:[[r,y]...], e?, s? }
     cyl    straight cylinder / cone      { a, b, r, rb? }
     sheet  pillowed 2D outline           { pts, th, fall?, sm?, (c,ux,uy,bend?) | wr }
     sdf    smooth CSG of SDF primitives  { prims:[...], k?, cell?, n?, nf? }
   ===================================================================== */
// Imported by full URL (not the "three" import-map alias) so the same module
// also loads inside geo-worker.mjs, where import maps don't apply. Keep the
// version in step with the import map in the HTML pages.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";

const V3 = THREE.Vector3;
const DEG = Math.PI / 180;
const v = (a) => new V3(a[0], a[1], a[2]);

/* ---------------------------------------------------------------- noise */
function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf), t = zf * zf * (3 - 2 * zf);
  const l = (a, b, s) => a + (b - a) * s;
  const c000 = hash3(xi, yi, zi), c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1), c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
  return l(l(l(c000, c100, u), l(c010, c110, u), w), l(l(c001, c101, u), l(c011, c111, u), w), t) * 2 - 1;
}
/** Ridged fbm in [-1,1] — reads as gyri when used as a displacement. */
function fbm(x, y, z) {
  const a = 1 - Math.abs(vnoise(x, y, z));
  const b = 1 - Math.abs(vnoise(x * 2.03 + 11, y * 2.03 + 7, z * 2.03 + 3));
  return (a * 0.7 + b * 0.3) * 2 - 1.2;
}

/* ---------------------------------------------------------------- helpers */
/** Matrix whose local +Y runs a→b and local +Z leans towards `hint`. */
function frame(a, b, hint) {
  const y = b.clone().sub(a);
  const L = y.length() || 1e-6;
  y.divideScalar(L);
  let z = hint ? hint.clone() : new V3(0, 0, 1);
  z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-8) { z = new V3(1, 0, 0); z.addScaledVector(y, -z.dot(y)); }
  z.normalize();
  const x = new V3().crossVectors(y, z);
  return { m: new THREE.Matrix4().makeBasis(x, y, z).setPosition(a), L };
}

function place(geo, s) {
  if (s.s) geo.scale(s.s[0], s.s[1], s.s[2]);
  if (s.e) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(s.e[0] * DEG, s.e[1] * DEG, s.e[2] * DEG)));
  if (s.c) geo.translate(s.c[0], s.c[1], s.c[2]);
  return geo;
}

function ensureUV(geo) {
  if (!geo.getAttribute("uv")) geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute("position").count * 2), 2));
  return geo;
}

const h2 = (a, b) => Math.sqrt(a * a + b * b);
const h3 = (a, b, c) => Math.sqrt(a * a + b * b + c * c);
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

/* ---------------------------------------------------------------- ellipsoid */
function ellGeo(s) {
  const R = Math.max(s.r[0], s.r[1], s.r[2]);
  const ws = s.seg || Math.min(56, Math.max(14, Math.round(R * 420)));
  const geo = new THREE.SphereGeometry(1, ws, Math.max(10, Math.round(ws * 0.7)));
  geo.scale(s.r[0], s.r[1], s.r[2]);
  if (s.n) {
    const p = geo.getAttribute("position"), n = geo.getAttribute("normal"), f = s.nf || 60;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = s.n * fbm(x * f, y * f, z * f);
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    geo.computeVertexNormals();
  }
  return place(geo, { e: s.e, c: s.c });
}

/* ---------------------------------------------------------------- long bone */
function boneGeo(s) {
  const a = v(s.a), b = v(s.b);
  const { m, L } = frame(a, b, s.nz && v(s.nz));
  const r = s.r, ha = s.ha ?? r * 1.7, hb = s.hb ?? r * 1.7, fl = s.fl ?? 0.45;
  const y0 = -ha * 0.92, y1 = L + hb * 0.92, N = 44, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    const u = Math.min(Math.max(y / L, 0), 1);
    const shaft = r * (1 + fl * Math.pow(Math.abs(2 * u - 1), 4));
    const hA = ha * ha - y * y > 0 ? Math.sqrt(ha * ha - y * y) : 0;
    const hB = hb * hb - (y - L) * (y - L) > 0 ? Math.sqrt(hb * hb - (y - L) * (y - L)) : 0;
    let rad = smax(y >= 0 && y <= L ? shaft : 0, Math.max(hA, hB), r * 0.8);
    if (i === 0 || i === N) rad = 0;
    pts.push(new THREE.Vector2(rad, y));
  }
  const geo = new THREE.LatheGeometry(pts, s.rs || 18);
  if (s.f) geo.scale(1, 1, s.f);
  return geo.applyMatrix4(m);
}

/* ---------------------------------------------------------------- muscle belly */
function spinGeo(s) {
  const a = v(s.a), b = v(s.b);
  const { m, L } = frame(a, b, s.nz && v(s.nz));
  const r = s.r, bias = s.bias ?? 0.5, p = s.p ?? 0.85, tr = s.tr ?? 0.14, N = 30, pts = [];
  const k = Math.log(0.5) / Math.log(bias);
  for (let i = 0; i <= N; i++) {
    const t = i / N, tb = Math.pow(t, k);
    let rad = r * (tr + (1 - tr) * Math.pow(Math.sin(Math.PI * tb), p));
    if (i === 0 || i === N) rad = 0;
    pts.push(new THREE.Vector2(rad, t * L));
  }
  const geo = new THREE.LatheGeometry(pts, s.rs || 18);
  geo.scale(1, 1, s.f ?? 0.6);
  if (s.bow) {
    const P = geo.getAttribute("position");
    for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) + s.bow * L * Math.sin(Math.PI * P.getY(i) / L));
    geo.computeVertexNormals();
  }
  return geo.applyMatrix4(m);
}

/* ---------------------------------------------------------------- tube */
function tubeGeo(s) {
  const pts = s.p.map(v);
  if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5));
  const closed = !!s.cl;
  const curve = new THREE.CatmullRomCurve3(pts, closed, "centripetal");
  const len = curve.getLength();
  const seg = Math.min(700, Math.max(6, Math.round(len / (s.sl || 0.005))));
  const radii = Array.isArray(s.r) ? s.r : [s.r];
  const rs = s.rs || (Math.max(...radii) < 0.004 ? 8 : 14);
  const radAt = (u) => {
    if (radii.length === 1) return radii[0];
    const f = u * (radii.length - 1), i = Math.min(Math.floor(f), radii.length - 2), t = f - i;
    const tt = t * t * (3 - 2 * t);
    return radii[i] + (radii[i + 1] - radii[i]) * tt;
  };
  const fa = s.fa || 1;

  // Parallel-transport frames, seeded from an optional "up" hint so that
  // flattened sections (ribs) keep a stable orientation.
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg; P.push(curve.getPointAt(u)); T.push(curve.getTangentAt(u).normalize()); }
  let n0 = s.up ? v(s.up) : new V3(0, 1, 0);
  n0.addScaledVector(T[0], -n0.dot(T[0]));
  if (n0.lengthSq() < 1e-6) { n0 = new V3(1, 0, 0); n0.addScaledVector(T[0], -n0.dot(T[0])); }
  N.push(n0.normalize()); B.push(new V3().crossVectors(T[0], N[0]));
  for (let i = 1; i <= seg; i++) {
    const n = N[i - 1].clone().addScaledVector(T[i], -N[i - 1].dot(T[i]));
    if (n.lengthSq() < 1e-8) n.copy(N[i - 1]);
    if (s.up) { // keep leaning towards the hint so long ribs don't drift
      const h = v(s.up).addScaledVector(T[i], -v(s.up).dot(T[i]));
      if (h.lengthSq() > 1e-6) n.lerp(h.normalize(), 0.25);
    }
    N.push(n.normalize()); B.push(new V3().crossVectors(T[i], N[i]).normalize());
  }

  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const r = radAt(i / seg);
    for (let j = 0; j <= rs; j++) {
      const a = (j / rs) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const d = N[i].clone().multiplyScalar(c * fa).addScaledVector(B[i], sn);
      const nn = N[i].clone().multiplyScalar(c / fa).addScaledVector(B[i], sn).normalize();
      pos.push(P[i].x + d.x * r, P[i].y + d.y * r, P[i].z + d.z * r);
      nor.push(nn.x, nn.y, nn.z);
      uv.push(j / rs, i / seg);
    }
  }
  const row = rs + 1;
  for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) {
    const a = i * row + j, b = (i + 1) * row + j, c = b + 1, d = a + 1;
    idx.push(a, b, d, b, c, d);
  }
  if (!closed && s.cap !== 0) {
    for (const end of [0, seg]) {
      const sign = end === 0 ? -1 : 1, t = T[end], r = radAt(end / seg);
      const center = pos.length / 3;
      // domed cap: pushes the centre out a little so ends read as rounded
      const tip = P[end].clone().addScaledVector(t, sign * r * 0.6);
      pos.push(tip.x, tip.y, tip.z); nor.push(t.x * sign, t.y * sign, t.z * sign); uv.push(0.5, end / seg);
      const ring = pos.length / 3;
      for (let j = 0; j <= rs; j++) {
        const a = (j / rs) * Math.PI * 2;
        const d = N[end].clone().multiplyScalar(Math.cos(a) * fa).addScaledVector(B[end], Math.sin(a));
        pos.push(P[end].x + d.x * r, P[end].y + d.y * r, P[end].z + d.z * r);
        const nn = d.clone().normalize().multiplyScalar(0.5).addScaledVector(t, sign).normalize();
        nor.push(nn.x, nn.y, nn.z); uv.push(j / rs, end / seg);
      }
      for (let j = 0; j < rs; j++) {
        if (sign < 0) idx.push(center, ring + j + 1, ring + j); else idx.push(center, ring + j, ring + j + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/* ---------------------------------------------------------------- lathe / cyl */
function latheGeo(s) {
  const geo = new THREE.LatheGeometry(s.prof.map(([r, y]) => new THREE.Vector2(r, y)), s.rs || 24);
  return place(geo, s);
}
function cylGeo(s) {
  const a = v(s.a), b = v(s.b);
  const { m, L } = frame(a, b);
  const geo = new THREE.CylinderGeometry(s.rb ?? s.r, s.r, L, s.rs || 12, 1, false);
  geo.translate(0, L / 2, 0);
  return geo.applyMatrix4(m);
}

/* ---------------------------------------------------------------- SDF primitives */
function makeRot(e) {
  if (!e) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(e[0] * DEG, e[1] * DEG, e[2] * DEG));
  const t = m.clone().invert().elements; // world → local
  return [t[0], t[4], t[8], t[1], t[5], t[9], t[2], t[6], t[10]];
}

function sdfPrim(p) {
  switch (p.t) {
    case "sph": {
      const [cx, cy, cz] = p.c, r = p.r;
      return { f: (x, y, z) => h3(x - cx, y - cy, z - cz) - r, bb: [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r] };
    }
    case "ell": {
      const [cx, cy, cz] = p.c, [rx, ry, rz] = p.r, R = makeRot(p.e), M = Math.max(rx, ry, rz);
      return {
        f: (x, y, z) => {
          let lx = x - cx, ly = y - cy, lz = z - cz;
          if (R) { const a = lx, b = ly, c = lz; lx = R[0] * a + R[1] * b + R[2] * c; ly = R[3] * a + R[4] * b + R[5] * c; lz = R[6] * a + R[7] * b + R[8] * c; }
          const k0 = h3(lx / rx, ly / ry, lz / rz);
          const k1 = h3(lx / (rx * rx), ly / (ry * ry), lz / (rz * rz));
          return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
        },
        bb: [cx - M, cy - M, cz - M, cx + M, cy + M, cz + M],
      };
    }
    case "cap": { // round cone between a (radius r) and b (radius rb)
      const [ax, ay, az] = p.a, [bx, by, bz] = p.b, r1 = p.r, r2 = p.rb ?? p.r;
      const bax = bx - ax, bay = by - ay, baz = bz - az;
      const l2 = bax * bax + bay * bay + baz * baz || 1e-12, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
      const M = Math.max(r1, r2);
      return {
        f: (x, y, z) => {
          const pax = x - ax, pay = y - ay, paz = z - az;
          const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
          const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
          const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
          const k = Math.sign(rr) * rr * rr * x2;
          if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
          if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
          return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
        },
        bb: [Math.min(ax, bx) - M, Math.min(ay, by) - M, Math.min(az, bz) - M, Math.max(ax, bx) + M, Math.max(ay, by) + M, Math.max(az, bz) + M],
      };
    }
    case "box": { // rounded box, s = half extents
      const [cx, cy, cz] = p.c, [sx, sy, sz] = p.s, rr = p.rr || 0, R = makeRot(p.e), M = h3(sx, sy, sz);
      return {
        f: (x, y, z) => {
          let lx = x - cx, ly = y - cy, lz = z - cz;
          if (R) { const a = lx, b = ly, c = lz; lx = R[0] * a + R[1] * b + R[2] * c; ly = R[3] * a + R[4] * b + R[5] * c; lz = R[6] * a + R[7] * b + R[8] * c; }
          const qx = Math.abs(lx) - sx + rr, qy = Math.abs(ly) - sy + rr, qz = Math.abs(lz) - sz + rr;
          return h3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr;
        },
        bb: [cx - M, cy - M, cz - M, cx + M, cy + M, cz + M],
      };
    }
    case "rcyl": { // capped cylinder a→b, radius r, edges rounded by rr
      const rr = p.rr ?? Math.min(p.r, 0.5 * h3(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2])) * 0.35;
      const A = v(p.a), Bv = v(p.b), d = Bv.clone().sub(A).normalize();
      A.addScaledVector(d, rr); Bv.addScaledVector(d, -rr);
      const [ax, ay, az] = [A.x, A.y, A.z], bax = Bv.x - ax, bay = Bv.y - ay, baz = Bv.z - az;
      const baba = bax * bax + bay * bay + baz * baz || 1e-12, r = p.r - rr, M = p.r + rr;
      return {
        f: (x, y, z) => {
          const pax = x - ax, pay = y - ay, paz = z - az, paba = pax * bax + pay * bay + paz * baz;
          const qx = pax * baba - bax * paba, qy = pay * baba - bay * paba, qz = paz * baba - baz * paba;
          const X = h3(qx, qy, qz) - r * baba, Y = Math.abs(paba - baba * 0.5) - baba * 0.5;
          const x2 = X * X, y2 = Y * Y * baba;
          const d = Math.max(X, Y) < 0 ? -Math.min(x2, y2 * 1) : (X > 0 ? x2 : 0) + (Y > 0 ? y2 : 0);
          return (Math.sign(d) * Math.sqrt(Math.abs(d))) / baba - rr;
        },
        bb: [Math.min(p.a[0], p.b[0]) - M, Math.min(p.a[1], p.b[1]) - M, Math.min(p.a[2], p.b[2]) - M,
             Math.max(p.a[0], p.b[0]) + M, Math.max(p.a[1], p.b[1]) + M, Math.max(p.a[2], p.b[2]) + M],
      };
    }
    case "tor": {
      const [cx, cy, cz] = p.c, R0 = p.R, r = p.r, Rm = makeRot(p.e), M = R0 + r;
      return {
        f: (x, y, z) => {
          let lx = x - cx, ly = y - cy, lz = z - cz;
          if (Rm) { const a = lx, b = ly, c = lz; lx = Rm[0] * a + Rm[1] * b + Rm[2] * c; ly = Rm[3] * a + Rm[4] * b + Rm[5] * c; lz = Rm[6] * a + Rm[7] * b + Rm[8] * c; }
          return h2(h2(lx, lz) - R0, ly) - r;
        },
        bb: [cx - M, cy - M, cz - M, cx + M, cy + M, cz + M],
      };
    }
    case "pl": { // half-space: negative on the side opposite the normal
      const [cx, cy, cz] = p.c; const n = v(p.n).normalize();
      return { f: (x, y, z) => (x - cx) * n.x + (y - cy) * n.y + (z - cz) * n.z, bb: null };
    }
    default: throw new Error("unknown sdf prim " + p.t);
  }
}

/* ---------------------------------------------------------------- surface nets */
const CORNER = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

/**
 * Mesh the zero level of a sampled scalar field (negative = inside).
 * `F` is laid out x-fastest over an nx*ny*nz lattice starting at `o`.
 */
function surfaceNets(F, nx, ny, nz, o, cell) {
  const sy = nx, sz = nx * ny;
  const co = CORNER.map(([a, b, c]) => a + b * sy + c * sz);
  const V = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [], grad = [], val = new Float32Array(8);
  for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    const base = x + y * sy + z * sz;
    let mask = 0;
    for (let k = 0; k < 8; k++) { val[k] = F[base + co[k]]; if (val[k] < 0) mask |= 1 << k; }
    if (mask === 0 || mask === 255) continue;
    let cx = 0, cy = 0, cz = 0, n = 0;
    for (const [e0, e1] of EDGES) {
      if (((mask >> e0) & 1) === ((mask >> e1) & 1)) continue;
      const t = val[e0] / (val[e0] - val[e1]), A = CORNER[e0], Bc = CORNER[e1];
      cx += A[0] + t * (Bc[0] - A[0]); cy += A[1] + t * (Bc[1] - A[1]); cz += A[2] + t * (Bc[2] - A[2]); n++;
    }
    V[base] = pos.length / 3;
    pos.push(o[0] + (x + cx / n) * cell, o[1] + (y + cy / n) * cell, o[2] + (z + cz / n) * cell);
    grad.push(
      (val[1] - val[0]) + (val[3] - val[2]) + (val[5] - val[4]) + (val[7] - val[6]),
      (val[2] - val[0]) + (val[3] - val[1]) + (val[6] - val[4]) + (val[7] - val[5]),
      (val[4] - val[0]) + (val[5] - val[1]) + (val[6] - val[2]) + (val[7] - val[3]));
  }
  const idx = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // orient against the field gradient so faces always point outwards
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[c * 3] - ax, e1y = pos[c * 3 + 1] - ay, e1z = pos[c * 3 + 2] - az;
    const e2x = pos[d * 3] - pos[b * 3], e2y = pos[d * 3 + 1] - pos[b * 3 + 1], e2z = pos[d * 3 + 2] - pos[b * 3 + 2];
    const nx_ = e1y * e2z - e1z * e2y, ny_ = e1z * e2x - e1x * e2z, nz_ = e1x * e2y - e1y * e2x;
    const gx = grad[a * 3] + grad[c * 3], gy = grad[a * 3 + 1] + grad[c * 3 + 1], gz = grad[a * 3 + 2] + grad[c * 3 + 2];
    if (nx_ * gx + ny_ * gy + nz_ * gz >= 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  };
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const base = x + y * sy + z * sz, s0 = F[base] < 0;
    if (s0 !== (F[base + 1] < 0)) quad(V[base], V[base - sy], V[base - sy - sz], V[base - sz]);
    if (s0 !== (F[base + sy] < 0)) quad(V[base], V[base - sz], V[base - 1 - sz], V[base - 1]);
    if (s0 !== (F[base + sz] < 0)) quad(V[base], V[base - 1], V[base - 1 - sy], V[base - sy]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  relax(geo, 1);
  geo.computeVertexNormals();
  return ensureUV(geo);
}

/** One pass of Laplacian relaxation — takes the stair-step out of surface nets. */
function relax(geo, passes) {
  const P = geo.getAttribute("position").array, I = geo.index.array, n = P.length / 3;
  for (let pass = 0; pass < passes; pass++) {
    const acc = new Float32Array(P.length), cnt = new Uint16Array(n);
    for (let i = 0; i < I.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const a = I[i + k], b = I[i + ((k + 1) % 3)];
        acc[a * 3] += P[b * 3]; acc[a * 3 + 1] += P[b * 3 + 1]; acc[a * 3 + 2] += P[b * 3 + 2]; cnt[a]++;
        acc[b * 3] += P[a * 3]; acc[b * 3 + 1] += P[a * 3 + 1]; acc[b * 3 + 2] += P[a * 3 + 2]; cnt[b]++;
      }
    }
    for (let i = 0; i < n; i++) if (cnt[i]) for (let k = 0; k < 3; k++) P[i * 3 + k] = P[i * 3 + k] * 0.5 + (acc[i * 3 + k] / cnt[i]) * 0.5;
  }
}

function sdfGeo(s) {
  const K = s.k ?? 0.01;
  const prims = s.prims.map((p) => ({ ...sdfPrim(p), op: p.o || "u", k: p.k ?? K }));
  // bounds come from the union primitives only
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of prims) if (p.op === "u" && p.bb) for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], p.bb[i]); bb[i + 3] = Math.max(bb[i + 3], p.bb[i + 3]); }
  const ext = Math.max(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]);
  let cell = s.cell || ext / (s.res || 40);
  const vol = () => ((bb[3] - bb[0]) / cell) * ((bb[4] - bb[1]) / cell) * ((bb[5] - bb[2]) / cell);
  while (vol() > 1.6e6) cell *= 1.12; // hard ceiling on sample count
  const pad = K + (s.n || 0) + cell * 2;
  const o = [bb[0] - pad, bb[1] - pad, bb[2] - pad];
  const nx = Math.ceil((bb[3] - bb[0] + 2 * pad) / cell) + 1;
  const ny = Math.ceil((bb[4] - bb[1] + 2 * pad) / cell) + 1;
  const nz = Math.ceil((bb[5] - bb[2] + 2 * pad) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  const noise = s.n || 0, nf = s.nf || 60;

  const evalAt = (act, px, py, pz) => {
    let d = 1e9;
    for (let j = 0; j < act.length; j++) {
      const p = act[j], q = p.f(px, py, pz);
      if (p.op === "u") d = smin(d, q, p.k);
      else if (p.op === "s") d = smax(d, -q, p.k);
      else d = smax(d, q, p.k);
    }
    return d;
  };

  // Narrow band: work in 4³ blocks. Union primitives that cannot reach a
  // block are culled, and a block whose centre is clearly inside or outside
  // is filled with that one value — surface nets only needs exact values
  // within a couple of cells of the surface.
  const BS = 4, far = pad + cell * BS;
  const band = (Math.sqrt(3) * BS * cell * 0.5 + 2 * cell) * 1.25 + noise;
  for (let bz = 0; bz < nz; bz += BS) for (let by = 0; by < ny; by += BS) for (let bx = 0; bx < nx; bx += BS) {
    const ex = Math.min(bx + BS, nx), ey = Math.min(by + BS, ny), ez = Math.min(bz + BS, nz);
    const lo0 = o[0] + bx * cell, lo1 = o[1] + by * cell, lo2 = o[2] + bz * cell;
    const hi0 = lo0 + BS * cell, hi1 = lo1 + BS * cell, hi2 = lo2 + BS * cell;
    const act = prims.filter((p) => p.op !== "u" || !p.bb || !(
      p.bb[0] - far > hi0 || p.bb[3] + far < lo0 ||
      p.bb[1] - far > hi1 || p.bb[4] + far < lo1 ||
      p.bb[2] - far > hi2 || p.bb[5] + far < lo2));
    let fill = null;
    if (!act.some((p) => p.op === "u")) fill = pad;
    else {
      const dc = evalAt(act, (lo0 + hi0) / 2, (lo1 + hi1) / 2, (lo2 + hi2) / 2);
      if (Math.abs(dc) > band) fill = dc;
    }
    for (let z = bz; z < ez; z++) for (let y = by; y < ey; y++) {
      let i = bx + y * nx + z * nx * ny;
      for (let x = bx; x < ex; x++, i++) {
        if (fill !== null) { F[i] = fill; continue; }
        const px = o[0] + x * cell, py = o[1] + y * cell, pz = o[2] + z * cell;
        let d = evalAt(act, px, py, pz);
        if (noise && d < pad) d += noise * fbm(px * nf, py * nf, pz * nf);
        F[i] = d;
      }
    }
  }
  return surfaceNets(F, nx, ny, nz, o, cell);
}

/* ---------------------------------------------------------------- sheet */
function smoothOutline(pts, n) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], 0)), true, "centripetal");
  return c.getSpacedPoints(n).slice(0, n).map((p) => [p.x, p.y]);
}
function polyDist(px, py, V) {
  let d = Infinity, s = 1;
  for (let i = 0, j = V.length - 1; i < V.length; j = i, i++) {
    const ex = V[j][0] - V[i][0], ey = V[j][1] - V[i][1], wx = px - V[i][0], wy = py - V[i][1];
    const t = Math.min(Math.max((wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12), 0), 1);
    const bx = wx - ex * t, by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = py >= V[i][1], c2 = py < V[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
function lerpTab(tab, y) {
  if (y <= tab[0][0]) return tab[0];
  for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) {
    const a = tab[i - 1], b = tab[i], t = (y - a[0]) / (b[0] - a[0]);
    return a.map((q, k) => q + (b[k] - q) * t);
  }
  return tab[tab.length - 1];
}

function sheetGeo(s) {
  const V = s.sm === 0 ? s.pts : smoothOutline(s.pts, s.np || 72);
  const th = s.th, fall = s.fall ?? th * 3;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of V) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  let cell = s.cell || Math.max(th / 2.2, Math.max(x1 - x0, y1 - y0) / 110);
  const pad = th + cell * 2;
  const o = [x0 - pad, y0 - pad, -th - cell * 2];
  const nx = Math.ceil((x1 - x0 + 2 * pad) / cell) + 1, ny = Math.ceil((y1 - y0 + 2 * pad) / cell) + 1;
  const nz = Math.ceil((2 * th + cell * 4) / cell) + 1;
  const D = new Float32Array(nx * ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) D[x + y * nx] = polyDist(o[0] + x * cell, o[1] + y * cell, V);
  const F = new Float32Array(nx * ny * nz);
  const back = s.back ?? 0.35; // underside is flatter than the belly
  for (let z = 0; z < nz; z++) {
    const pz = o[2] + z * cell;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const d2 = D[x + y * nx];
      const tt = Math.min(Math.max(-d2 / fall, 0), 1), sm = tt * tt * (3 - 2 * tt);
      const half = (th / 2) * (0.28 + 0.72 * sm) * (pz < 0 ? back * 2 : 1);
      const wx = d2, wy = Math.abs(pz) - half;
      F[x + y * nx + z * nx * ny] = Math.min(Math.max(wx, wy), 0) + h2(Math.max(wx, 0), Math.max(wy, 0));
    }
  }
  const geo = surfaceNets(F, nx, ny, nz, o, cell);
  const P = geo.getAttribute("position");
  if (s.wr) {
    const { tab, R0, a0 = 0, off = 0 } = s.wr;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const [, a, b, cz, cx = 0] = lerpTab(tab, y);
      const th_ = a0 * DEG + x / R0;
      P.setXYZ(i, cx + (a + off + z) * Math.sin(th_), y, cz + (b + off + z) * Math.cos(th_));
    }
  } else {
    const ux = v(s.ux || [1, 0, 0]).normalize(), uy0 = v(s.uy || [0, 1, 0]);
    const uy = uy0.addScaledVector(ux, -uy0.dot(ux)).normalize(), uz = new V3().crossVectors(ux, uy);
    const c = v(s.c || [0, 0, 0]);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i);
      let z = P.getZ(i);
      if (s.bend) z -= (x * x) / (2 * s.bend);
      if (s.bendy) z -= (y * y) / (2 * s.bendy);
      P.setXYZ(i, c.x + ux.x * x + uy.x * y + uz.x * z, c.y + ux.y * x + uy.y * y + uz.y * z, c.z + ux.z * x + uy.z * y + uz.z * z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------------------------------------------------------------- merge */
function merge(geos) {
  if (geos.length === 1) return geos[0];
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.getAttribute("position").count; ni += g.index ? g.index.count : g.getAttribute("position").count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    ensureUV(g);
    const p = g.getAttribute("position"), n = g.getAttribute("normal"), u = g.getAttribute("uv");
    pos.set(p.array, ov * 3); nor.set(n.array, ov * 3); uv.set(u.array, ov * 2);
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[oi + i] = I[i] + ov; oi += I.length; }
    else { for (let i = 0; i < p.count; i++) idx[oi + i] = ov + i; oi += p.count; }
    ov += p.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

const BUILDERS = { ell: ellGeo, bone: boneGeo, spin: spinGeo, tube: tubeGeo, lathe: latheGeo, cyl: cylGeo, sdf: sdfGeo, sheet: sheetGeo };

/** Build one part's geometry from its list of primitive specs. */
export function buildGeometry(specs) {
  const geos = [];
  for (const s of specs) {
    const fn = BUILDERS[s.t];
    if (!fn) { console.warn("GetHealth: unknown primitive", s.t); continue; }
    const g = fn(s);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    geos.push(ensureUV(g));
  }
  const geo = merge(geos);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** Reflect across the sagittal plane (x → −x) and fix the winding. */
export function mirrorGeometry(src) {
  const geo = src.clone();
  const P = geo.getAttribute("position"), N = geo.getAttribute("normal");
  for (let i = 0; i < P.count; i++) { P.setX(i, -P.getX(i)); N.setX(i, -N.getX(i)); }
  const I = geo.index.array;
  for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
