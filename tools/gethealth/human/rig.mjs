/**
 * Landmark rig for the adult human model: a 1.75 m subject standing in a
 * slightly abducted anatomical position (palms forward). Everything else in
 * human/ — bones, muscles, organs, vessels — is positioned relative to
 * these points so proportions stay consistent when one of them is tuned.
 *
 * Left side only (+x); bilateral parts are mirrored at runtime.
 */
import { add, sub, mul, norm, cross, lerp, frame } from "../lib.mjs";

/* ---------------------------------------------------------------- spine */
// [name, y, z, half-width, half-height, half-depth] of each vertebral body.
const SPINE_RAW = [
  ["C1", 1.592, -0.019, 0.010, 0.005, 0.007],
  ["C2", 1.575, -0.017, 0.009, 0.007, 0.008],
  ["C3", 1.558, -0.014, 0.0095, 0.0055, 0.008],
  ["C4", 1.543, -0.012, 0.010, 0.0055, 0.0082],
  ["C5", 1.528, -0.013, 0.0105, 0.0055, 0.0085],
  ["C6", 1.513, -0.017, 0.011, 0.0058, 0.0088],
  ["C7", 1.497, -0.024, 0.0115, 0.006, 0.009],
  ["T1", 1.474, -0.033, 0.012, 0.0085, 0.0095],
  ["T2", 1.447, -0.041, 0.0122, 0.0088, 0.010],
  ["T3", 1.419, -0.048, 0.0125, 0.009, 0.0105],
  ["T4", 1.391, -0.053, 0.0128, 0.0092, 0.011],
  ["T5", 1.363, -0.057, 0.0132, 0.0095, 0.0115],
  ["T6", 1.335, -0.059, 0.0138, 0.0098, 0.012],
  ["T7", 1.306, -0.060, 0.0144, 0.010, 0.0125],
  ["T8", 1.277, -0.059, 0.015, 0.0102, 0.013],
  ["T9", 1.248, -0.057, 0.0158, 0.0105, 0.0135],
  ["T10", 1.219, -0.054, 0.0166, 0.0108, 0.014],
  ["T11", 1.190, -0.050, 0.0175, 0.011, 0.0145],
  ["T12", 1.160, -0.046, 0.0185, 0.0115, 0.015],
  ["L1", 1.126, -0.040, 0.0205, 0.0125, 0.0158],
  ["L2", 1.090, -0.034, 0.0215, 0.013, 0.0162],
  ["L3", 1.054, -0.029, 0.0225, 0.0135, 0.0166],
  ["L4", 1.018, -0.026, 0.023, 0.0135, 0.0168],
  ["L5", 0.982, -0.027, 0.0235, 0.013, 0.0168],
];
export const SPINE = SPINE_RAW.map(([name, y, z, w, h, d], i, arr) => {
  const prev = arr[Math.max(i - 1, 0)], next = arr[Math.min(i + 1, arr.length - 1)];
  const up = norm([0, prev[1] - next[1], prev[2] - next[2]]);
  return { name, c: [0, y, z], w, h, d, up };
});
export const V = Object.fromEntries(SPINE.map((s) => [s.name, s]));

/** Point on the spinal canal (behind the vertebral bodies) at height y. */
export function canalAt(y) {
  const s = SPINE;
  if (y >= s[0].c[1]) return [0, y, s[0].c[2] - s[0].d - 0.008];
  for (let i = 1; i < s.length; i++) if (y >= s[i].c[1]) {
    const a = s[i - 1], b = s[i], t = (a.c[1] - y) / (a.c[1] - b.c[1]);
    const z = a.c[2] + (b.c[2] - a.c[2]) * t, d = a.d + (b.d - a.d) * t;
    return [0, y, z - d - 0.008];
  }
  const l = s[s.length - 1];
  return [0, y, l.c[2] - l.d - 0.008];
}

/* ---------------------------------------------------------------- skull */
export const SKULL = {
  cavity: { c: [0, 1.668, -0.014], r: [0.0645, 0.0675, 0.0865] }, // inside of the braincase
  orbit: [0.033, 1.613, 0.072],  // left orbit centre
  eye: [0.032, 1.612, 0.066],    // left eyeball centre
  chin: [0, 1.516, 0.078],
  condyle: [0.053, 1.6, -0.005],
  ear: [0.07, 1.605, -0.012],    // external acoustic meatus
  nasion: [0, 1.63, 0.086],
  occlusal: 1.549,               // biting plane of the teeth
};

/* ---------------------------------------------------------------- thorax */
export const STERNUM = { top: [0, 1.432, 0.067], angle: [0, 1.392, 0.08], xs: [0, 1.242, 0.103], tip: [0, 1.205, 0.098] };

/* ---------------------------------------------------------------- limbs (left) */
export const L = {
  acromion: [0.182, 1.447, -0.012],
  shoulder: [0.176, 1.395, -0.026],   // glenohumeral centre
  elbow: [0.236, 1.107, -0.03],
  wrist: [0.293, 0.851, 0.006],
  hip: [0.09, 0.915, 0.022],          // femoral head centre
  asis: [0.118, 0.99, 0.058],
  psis: [0.042, 0.99, -0.072],
  crest: [0.142, 1.036, -0.004],
  ischialTub: [0.058, 0.842, -0.006],
  pubis: [0.012, 0.878, 0.074],
  knee: [0.092, 0.502, 0.0],
  ankle: [0.086, 0.078, -0.014],
};

/* ---------------------------------------------------------------- hand frame (left) */
const handDown = norm(sub(L.wrist, L.elbow));
const handLat = norm(sub([1, 0, 0], mul(handDown, handDown[0])));
const handPalm = norm(cross(handDown, handLat));
/** u = towards the thumb, v = distal, w = palmar. */
export const HAND = frame(L.wrist, handLat, handDown, handPalm);

/* ---------------------------------------------------------------- foot frame (left) */
const toeOut = (10 * Math.PI) / 180;
/** u = lateral, v = up, w = towards the toes. Origin under the talus at ground level. */
export const FOOT = frame([L.ankle[0], 0, L.ankle[2]], [Math.cos(toeOut), 0, -Math.sin(toeOut)], [0, 1, 0], [Math.sin(toeOut), 0, Math.cos(toeOut)]);

/* ---------------------------------------------------------------- torso surface */
/**
 * Torso cross-sections used to wrap flat muscles onto the body:
 * [y, half-width (x), half-depth (z), centre z]. Radii are the outer surface
 * of the rib cage / abdominal wall — muscle layers add an offset on top.
 */
export const TORSO = [
  [0.80, 0.150, 0.080, 0.000],
  [0.88, 0.150, 0.088, 0.004],
  [0.96, 0.140, 0.090, 0.004],
  [1.04, 0.128, 0.090, 0.004],
  [1.12, 0.134, 0.098, 0.002],
  [1.20, 0.142, 0.104, 0.000],
  [1.28, 0.146, 0.108, -0.002],
  [1.36, 0.142, 0.104, -0.006],
  [1.42, 0.130, 0.094, -0.010],
  [1.48, 0.100, 0.078, -0.016],
  [1.54, 0.060, 0.055, -0.010],
];

export { lerp };
