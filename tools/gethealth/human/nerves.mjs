/**
 * Peripheral and cranial nerves (the brain and spinal cord live in head.mjs).
 */
import { add, tube, makePart } from "../lib.mjs";
import { HAND, FOOT, canalAt } from "./rig.mjs";
import { RIB_PATHS } from "./skeleton.mjs";

const parts = [];
const N = (p) => parts.push(makePart({ sys: "nervous", mat: "nerve", ...p }));
const H = (u, v, w) => HAND.at([u, v, w]);
const F = (u, v, w) => FOOT.at([u, v, w]);
const kid = "Nerves are like electrical wires carrying messages between your brain and body.";

/* ---- cranial nerves ---- */
N({
  id: "trigeminal-nerve", name: "Trigeminal Nerve", grp: "Cranial nerves", bi: 1, q: 3,
  g: [tube([[0.012, 1.622, -0.014], [0.024, 1.618, -0.004], [0.03, 1.614, 0.004]], 0.0022),
      tube([[0.03, 1.614, 0.004], [0.034, 1.625, 0.03], [0.036, 1.64, 0.066]], 0.0011, { rs: 6 }),
      tube([[0.03, 1.614, 0.004], [0.034, 1.598, 0.03], [0.03, 1.598, 0.074]], 0.0011, { rs: 6 }),
      tube([[0.03, 1.614, 0.004], [0.038, 1.585, 0.0], [0.042, 1.55, 0.02], [0.03, 1.525, 0.06]], 0.0011, { rs: 6 })],
  d: "Cranial nerve V, the largest cranial nerve, with three divisions: ophthalmic, maxillary and mandibular.",
  fn: "Carries touch, pain and temperature from the face, eyes, teeth and mouth, and controls the chewing muscles.",
  kid: "This nerve feels everything on your face — including toothache!", meta: { Nerve: "Cranial nerve V", Divisions: "V1, V2, V3" },
});
N({
  id: "facial-nerve", name: "Facial Nerve", grp: "Cranial nerves", bi: 1, q: 3,
  g: [tube([[0.016, 1.62, -0.02], [0.042, 1.608, -0.016], [0.055, 1.586, -0.012], [0.058, 1.575, 0.0]], 0.0014),
      ...[[1.62, 0.04], [1.6, 0.05], [1.58, 0.05], [1.555, 0.05], [1.53, 0.04]].map(([y, z]) => tube([[0.058, 1.575, 0.0], [0.062, (1.575 + y) / 2, z * 0.5], [0.056, y, z]], 0.0007, { rs: 5 }))],
  d: "Cranial nerve VII. It leaves the skull just behind the ear and fans out through the parotid gland into five branches across the face.",
  fn: "Moves the muscles of facial expression, carries taste from the front of the tongue and controls tears and saliva. Damage causes Bell's palsy.",
  kid: "This nerve lets you smile, frown, blink and wink.", meta: { Nerve: "Cranial nerve VII" },
});
N({
  id: "vestibulocochlear-nerve", name: "Vestibulocochlear Nerve", grp: "Cranial nerves", bi: 1, q: 3,
  g: [tube([[0.014, 1.618, -0.02], [0.03, 1.608, -0.012], [0.042, 1.605, -0.008]], 0.0014)],
  d: "Cranial nerve VIII, running from the inner ear to the brainstem.",
  fn: "Carries hearing signals from the cochlea and balance signals from the semicircular canals.",
  kid: "Sound and balance messages travel along this nerve.", meta: { Nerve: "Cranial nerve VIII" },
});
N({
  id: "vagus-nerve", name: "Vagus Nerve", grp: "Cranial nerves", bi: 1, q: 2,
  g: [tube([[0.012, 1.595, -0.028], [0.036, 1.575, -0.012], [0.032, 1.52, 0.012], [0.03, 1.46, 0.016], [0.026, 1.4, 0.004], [0.022, 1.33, -0.012], [0.016, 1.25, -0.016], [0.02, 1.19, -0.01], [0.03, 1.16, 0.0], [0.03, 1.11, 0.02]], 0.0014)],
  d: "Cranial nerve X — 'the wanderer' — the longest cranial nerve, running from the brainstem down the neck beside the carotid artery into the chest and abdomen.",
  fn: "The main nerve of the parasympathetic 'rest and digest' system: it slows the heart, stimulates digestion and controls the muscles of the throat and voice box.",
  kid: "This nerve wanders all the way from your brain to your tummy and helps you feel calm.", meta: { Nerve: "Cranial nerve X" },
});
N({
  id: "hypoglossal-nerve", name: "Hypoglossal Nerve", grp: "Cranial nerves", bi: 1, q: 3,
  g: [tube([[0.01, 1.585, -0.026], [0.03, 1.565, -0.01], [0.034, 1.535, 0.012], [0.02, 1.53, 0.035], [0.01, 1.54, 0.045]], 0.0012)],
  d: "Cranial nerve XII, looping under the jaw into the tongue.",
  fn: "Moves the tongue for speaking, chewing and swallowing.",
  kid: "It lets you stick your tongue out!", meta: { Nerve: "Cranial nerve XII" },
});

/* ---- neck, thorax & trunk ---- */
N({
  id: "phrenic-nerve", name: "Phrenic Nerve", grp: "Cervical plexus", bi: 1, q: 3,
  g: [tube([[0.03, 1.52, -0.01], [0.034, 1.47, 0.008], [0.03, 1.42, 0.02], [0.03, 1.36, 0.025], [0.045, 1.3, 0.03], [0.055, 1.24, 0.03], [0.06, 1.2, 0.02]], 0.0012)],
  d: "Arises from spinal nerves C3–C5 in the neck and runs down over the heart to the diaphragm.",
  fn: "The only motor supply to the diaphragm — 'C3, 4, 5 keeps the diaphragm alive'. Irritation makes you hiccup.",
  kid: "This nerve tells your breathing muscle when to move.", meta: { Roots: "C3–C5" },
});
N({
  id: "sympathetic-trunk", name: "Sympathetic Trunk", grp: "Autonomic", bi: 1, q: 3,
  g: [tube(Array.from({ length: 18 }, (_, i) => { const y = 1.56 - i * 0.034; const c = canalAt(y); return [0.024 + (y < 1.2 ? 0.004 : 0), y, c[2] + 0.024]; }), 0.0011),
      ...Array.from({ length: 12 }, (_, i) => { const y = 1.52 - i * 0.05; const c = canalAt(y); return { t: "ell", c: [0.024, y, c[2] + 0.024], r: [0.0022, 0.0035, 0.0022] }; })],
  d: "A chain of nerve ganglia running like a string of beads down each side of the spine from the skull to the coccyx.",
  fn: "Carries 'fight or flight' signals that speed the heart, widen the airways and pupils, and divert blood to the muscles.",
  kid: "When you're excited or scared, these nerves make your heart race.", meta: { Division: "Sympathetic nervous system" },
});
RIB_PATHS.forEach((path, i) => {
  if (i > 10) return;
  const pts = path.slice(1).map((p) => add(p, [0, -0.0065, 0]));
  N({
    id: `intercostal-nerve-${i + 1}`, name: `Intercostal Nerve ${i + 1}`, grp: "Thoracic nerves", bi: 1, q: 3,
    g: [tube(pts, 0.0009, { rs: 5 })],
    d: `The front branch of spinal nerve T${i + 1}, running in the groove on the underside of rib ${i + 1} with the intercostal artery and vein.`,
    fn: `Supplies the intercostal muscles between the ribs and the skin of the chest${i >= 6 ? " and abdominal wall" : ""} at this level — the band of skin affected when shingles strikes.`,
    kid, meta: { Root: `T${i + 1}` },
  });
});

/* ---- upper limb (left; mirrored) ---- */
N({
  id: "brachial-plexus", name: "Brachial Plexus", grp: "Upper limb", bi: 1, q: 2,
  g: [...[1.53, 1.515, 1.5, 1.485, 1.47].map((y, i) => tube([[0.02, y, -0.022], [0.05, y - 0.02, -0.015], [0.09, 1.44 - i * 0.004, -0.012], [0.13, 1.41, -0.012], [0.165, 1.36, -0.02]], 0.0016))],
  d: "A network formed by the front branches of spinal nerves C5–T1. Its roots, trunks, divisions and cords weave together in the neck and armpit.",
  fn: "Gives rise to every nerve of the arm and hand. Stretching the neck away from the shoulder can injure it.",
  kid, meta: { Roots: "C5–T1", Branches: "Musculocutaneous, axillary, radial, median, ulnar" },
});
N({
  id: "musculocutaneous-nerve", name: "Musculocutaneous Nerve", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.165, 1.36, -0.02], [0.19, 1.3, -0.012], [0.21, 1.2, -0.004], [0.23, 1.12, 0.0], [0.26, 1.05, 0.01]], 0.0012)],
  d: "Pierces the coracobrachialis and runs between the biceps and brachialis.",
  fn: "Moves the biceps, brachialis and coracobrachialis (bending the elbow) and supplies the skin of the outer forearm.",
  kid, meta: { Roots: "C5–C7" },
});
N({
  id: "axillary-nerve", name: "Axillary Nerve", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.165, 1.36, -0.022], [0.175, 1.35, -0.04], [0.195, 1.36, -0.04], [0.21, 1.37, -0.02]], 0.0012)],
  d: "Wraps around the back of the neck of the humerus.",
  fn: "Supplies the deltoid and teres minor. It can be damaged when the shoulder dislocates or the humerus neck breaks.",
  kid, meta: { Roots: "C5–C6" },
});
N({
  id: "radial-nerve", name: "Radial Nerve", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.165, 1.36, -0.022], [0.19, 1.3, -0.04], [0.215, 1.22, -0.042], [0.245, 1.16, -0.028], [0.255, 1.11, -0.018], [0.27, 1.02, -0.01], [0.29, 0.92, 0.0], [0.3, 0.87, 0.004], H(0.02, 0.03, -0.006)], 0.0014)],
  d: "The largest branch of the brachial plexus, spiralling around the back of the humerus in the radial groove.",
  fn: "Straightens the elbow, wrist and fingers and supplies the skin on the back of the hand. Injury causes 'wrist drop'.",
  kid, meta: { Roots: "C5–T1" },
});
N({
  id: "median-nerve", name: "Median Nerve", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.165, 1.36, -0.018], [0.188, 1.3, -0.016], [0.208, 1.2, -0.014], [0.228, 1.11, -0.004], [0.25, 1.0, 0.006], [0.272, 0.92, 0.012], [0.29, 0.86, 0.014], H(0.0, 0.025, 0.01), H(0.004, 0.06, 0.01)], 0.0014),
      ...[0.012, 0.004, -0.006].map((u) => tube([H(0.004, 0.06, 0.01), H(u, 0.09, 0.008), H(u, 0.13, 0.006)], 0.0007, { rs: 5 }))],
  d: "Runs down the middle of the arm and forearm and through the carpal tunnel at the wrist.",
  fn: "Controls most forearm flexors and the thumb muscles, and carries feeling from the thumb, index, middle and half the ring finger. Squeezing it in the carpal tunnel causes carpal tunnel syndrome.",
  kid, meta: { Roots: "C6–T1" },
});
N({
  id: "ulnar-nerve", name: "Ulnar Nerve", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.165, 1.36, -0.02], [0.186, 1.3, -0.026], [0.2, 1.2, -0.034], [0.208, 1.125, -0.042], [0.222, 1.08, -0.03], [0.25, 0.98, -0.014], [0.272, 0.88, 0.0], H(-0.012, 0.025, 0.006), H(-0.016, 0.07, 0.008), H(-0.02, 0.13, 0.006)], 0.0013)],
  d: "Passes behind the medial epicondyle of the humerus at the elbow — the 'funny bone' — then down the little-finger side of the forearm.",
  fn: "Controls most small muscles of the hand for fine finger movements, and carries feeling from the little finger and half the ring finger.",
  kid: "Hitting your 'funny bone' is really bumping this nerve.", meta: { Roots: "C8–T1" },
});

/* ---- lower limb (left; mirrored) ---- */
N({
  id: "lumbar-plexus", name: "Lumbar Plexus", grp: "Lower limb", bi: 1, q: 3,
  g: [1.11, 1.075, 1.04, 1.005].map((y) => tube([[0.022, y, -0.034], [0.04, y - 0.03, -0.03], [0.058, 0.96, -0.012]], 0.0013))],
  d: "A network formed by spinal nerves L1–L4 inside the psoas major muscle.",
  fn: "Supplies the lower abdominal wall, groin and front and inner thigh through the femoral, obturator and genitofemoral nerves.",
  kid, meta: { Roots: "L1–L4" },
});
N({
  id: "femoral-nerve", name: "Femoral Nerve", grp: "Lower limb", bi: 1, q: 2,
  g: [tube([[0.058, 0.96, -0.012], [0.072, 0.92, 0.02], [0.086, 0.885, 0.05], [0.094, 0.85, 0.055]], 0.0018),
      ...[[0.12, 0.7, 0.055], [0.1, 0.72, 0.06], [0.08, 0.74, 0.05], [0.068, 0.5, -0.02]].map((e) => tube([[0.094, 0.85, 0.055], [(0.094 + e[0]) / 2, (0.85 + e[1]) / 2, (0.055 + e[2]) / 2 + 0.005], e], 0.0009, { rs: 5 }))],
  d: "The largest branch of the lumbar plexus, entering the thigh under the inguinal ligament just outside the femoral artery.",
  fn: "Straightens the knee through the quadriceps, bends the hip, and carries feeling from the front of the thigh and inner leg (via the saphenous nerve).",
  kid, meta: { Roots: "L2–L4" },
});
N({
  id: "sciatic-nerve", name: "Sciatic Nerve", grp: "Lower limb", bi: 1, q: 1, lbl: 1,
  g: [tube([[0.03, 0.95, -0.05], [0.055, 0.905, -0.052], [0.075, 0.86, -0.04], [0.085, 0.78, -0.03], [0.09, 0.66, -0.035], [0.09, 0.58, -0.035]], [0.004, 0.0045, 0.0042, 0.004, 0.0038, 0.0036])],
  d: "The thickest and longest nerve in the body — as wide as a thumb at its origin — running from the lower spine through the buttock and down the back of the thigh.",
  fn: "Supplies the hamstrings and, through its tibial and common fibular branches, every muscle below the knee. Pressure on its roots causes sciatica.",
  kid: "The biggest nerve in your body is as thick as your thumb.", meta: { Roots: "L4–S3" },
});
N({
  id: "tibial-nerve", name: "Tibial Nerve", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.09, 0.58, -0.035], [0.09, 0.48, -0.036], [0.086, 0.35, -0.04], [0.078, 0.2, -0.032], [0.07, 0.09, -0.024], F(-0.02, 0.04, 0.0), F(-0.01, 0.015, 0.06)], 0.0026)],
  d: "The larger branch of the sciatic nerve, running straight down the back of the leg and behind the inner ankle into the sole.",
  fn: "Points the foot and toes down (the push-off in walking) and carries feeling from the sole.",
  kid, meta: { Roots: "L4–S3" },
});
N({
  id: "common-fibular-nerve", name: "Common Fibular Nerve", grp: "Lower limb", bi: 1, q: 3, aka: "peroneal",
  g: [tube([[0.09, 0.58, -0.035], [0.11, 0.5, -0.03], [0.126, 0.445, -0.018], [0.118, 0.42, 0.004], [0.108, 0.3, 0.012], [0.098, 0.13, 0.016], F(0.0, 0.06, 0.05)], 0.0018)],
  d: "Winds round the neck of the fibula just below the knee, where it is easily injured, then divides into deep and superficial branches.",
  fn: "Lifts the foot and toes and turns the foot outwards; damage causes 'foot drop'.",
  kid, meta: { Roots: "L4–S2" },
});

export default parts;
