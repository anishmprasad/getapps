/**
 * Thoracic, abdominal and pelvic organs, plus the skin.
 */
import { add, mul, norm, lerp, ell, tube, sdf, sheet, S, both, makePart } from "../lib.mjs";
import { L } from "./rig.mjs";

const parts = [];
const P = (p) => parts.push(makePart(p));
const K = 0.0012;
const Sub = (p) => ({ ...p, o: "s", k: p.k ?? 0.004 });
const Int = (p) => ({ ...p, o: "i", k: p.k ?? K });
const I = (c, n) => S.pl(c, n, { o: "i", k: K });

/* =====================================================================
   HEART
   ===================================================================== */
const HEART = { base: [0.008, 1.305, 0.035], apex: [0.052, 1.228, 0.07] };
P({
  id: "left-ventricle", name: "Left Ventricle", sys: "heart", grp: "Heart", org: "Heart", col: "#B03A40", q: 2, lbl: 1,
  g: [sdf([S.cap([0.014, 1.296, 0.03], HEART.apex, 0.031, 0.009), S.ell([0.03, 1.268, 0.036], [0.03, 0.032, 0.028], { e: [0, 0, 30] })], { k: 0.012, cell: 0.0018 })],
  d: "The thick-walled chamber at the bottom left of the heart that forms the apex. Its wall is about three times thicker than the right ventricle's.",
  fn: "Pumps oxygen-rich blood through the aortic valve into the aorta and out to the whole body, generating the systolic blood pressure.",
  kid: "This is the strongest part of your heart — it pushes blood all the way to your toes.",
  meta: { "Wall thickness": "10–15 mm", Output: "About 5 L of blood a minute at rest", Valve: "Mitral in, aortic out" },
});
P({
  id: "right-ventricle", name: "Right Ventricle", sys: "heart", grp: "Heart", org: "Heart", col: "#A5404F", q: 2,
  g: [sdf([S.cap([-0.008, 1.29, 0.05], [0.036, 1.236, 0.076], 0.026, 0.009), S.ell([0.004, 1.275, 0.06], [0.026, 0.024, 0.02], { e: [0, 0, 25] }), Sub(S.cap([0.014, 1.296, 0.03], HEART.apex, 0.029, 0.007, { k: 0.004 }))], { k: 0.01, cell: 0.0018 })],
  d: "The crescent-shaped chamber at the front of the heart, wrapped around the left ventricle.",
  fn: "Pumps oxygen-poor blood through the pulmonary valve into the pulmonary arteries and on to the lungs at low pressure.",
  kid: "This chamber sends used blood to your lungs to pick up fresh oxygen.",
  meta: { "Wall thickness": "3–5 mm", Valve: "Tricuspid in, pulmonary out" },
});
P({
  id: "left-atrium", name: "Left Atrium", sys: "heart", grp: "Heart", org: "Heart", col: "#BE5358", q: 2,
  g: [sdf([S.ell([0.012, 1.316, 0.004], [0.026, 0.016, 0.016]), S.cap([0.028, 1.318, 0.012], [0.042, 1.312, 0.036], 0.008, 0.005)], { k: 0.008, cell: 0.0016 })],
  d: "The chamber at the back of the heart that receives blood from the four pulmonary veins. Its small ear-like pouch is the left auricle.",
  fn: "Collects oxygen-rich blood returning from the lungs and pushes it through the mitral valve into the left ventricle.",
  kid: "Fresh blood from your lungs arrives here first.",
  meta: { Receives: "4 pulmonary veins", Valve: "Mitral (bicuspid)" },
});
P({
  id: "right-atrium", name: "Right Atrium", sys: "heart", grp: "Heart", org: "Heart", col: "#AE4A5E", q: 2,
  g: [sdf([S.ell([-0.026, 1.298, 0.028], [0.021, 0.026, 0.021]), S.cap([-0.018, 1.316, 0.04], [-0.004, 1.33, 0.052], 0.009, 0.005)], { k: 0.008, cell: 0.0016 })],
  d: "The chamber on the right side of the heart that receives blood from the superior and inferior venae cavae and the coronary sinus. Its wall holds the heart's natural pacemaker.",
  fn: "Collects oxygen-poor blood from the body and passes it through the tricuspid valve into the right ventricle.",
  kid: "Blood coming back from your body pours into this chamber.",
  meta: { Receives: "SVC, IVC, coronary sinus", Contains: "Sinoatrial node" },
});
const valve = (id, name, c, e, r, d, fn) => P({ id, name, sys: "heart", grp: "Heart valves", org: "Heart", col: "#F0D9C8", q: 3, g: [sdf([S.tor(c, r, 0.0018, { e })], { k: 0.001, cell: 0.0007 })], d, fn, kid: "Heart valves are one-way doors — their closing makes the 'lub-dub' sound.", meta: { Type: name.includes("Mitral") || name.includes("Tricuspid") ? "Atrioventricular valve" : "Semilunar valve" } });
valve("mitral-valve", "Mitral Valve", [0.014, 1.302, 0.02], [70, 0, 20], 0.012, "The two-leaflet valve between the left atrium and left ventricle.", "Opens to let blood into the left ventricle and snaps shut when it contracts, stopping backflow into the lungs.");
valve("tricuspid-valve", "Tricuspid Valve", [-0.014, 1.29, 0.04], [60, 20, -10], 0.012, "The three-leaflet valve between the right atrium and right ventricle.", "Stops blood flowing back into the right atrium when the right ventricle contracts.");
valve("aortic-valve", "Aortic Valve", [0.003, 1.307, 0.04], [20, 0, -25], 0.0105, "Three half-moon cusps at the exit of the left ventricle. The coronary arteries open just above it.", "Lets blood out into the aorta and closes to prevent it falling back into the ventricle.");
valve("pulmonary-valve", "Pulmonary Valve", [0.006, 1.318, 0.062], [-30, 0, -20], 0.0098, "Three half-moon cusps at the exit of the right ventricle.", "Opens as the right ventricle pumps blood to the lungs, then closes to stop it flowing back.");
P({
  id: "sinoatrial-node", name: "Sinoatrial Node", sys: "heart", grp: "Conduction system", org: "Heart", col: "#F2C94C", q: 3, aka: "SA node pacemaker",
  g: [ell([-0.027, 1.323, 0.036], [0.003, 0.005, 0.002])],
  d: "A small patch of specialised muscle cells in the wall of the right atrium where the superior vena cava enters.",
  fn: "The heart's natural pacemaker: it fires an electrical impulse 60–100 times a minute that starts every heartbeat.",
  kid: "A tiny spark-maker in your heart starts every heartbeat.", meta: { Rate: "60–100 impulses per minute" },
});
P({
  id: "atrioventricular-node", name: "Atrioventricular Node", sys: "heart", grp: "Conduction system", org: "Heart", col: "#F2C94C", q: 3, aka: "AV node",
  g: [ell([-0.004, 1.294, 0.03], [0.0025, 0.002, 0.003])],
  d: "A cluster of conducting cells in the wall between the atria, just above the tricuspid valve.",
  fn: "Delays each impulse by about a tenth of a second so the atria finish emptying, then passes it down the bundle of His to the ventricles.",
  kid: "It makes the top of the heart squeeze just before the bottom.", meta: { Delay: "About 0.1 s" },
});

/* =====================================================================
   RESPIRATORY — lungs (by lobe), bronchi, diaphragm
   ===================================================================== */
const ribcage = () => Int(S.ell([0, 1.29, -0.004], [0.128, 0.19, 0.098], { k: 0.01 }));
const dome = () => Sub(S.ell([0, 1.1, 0.0], [0.15, 0.11, 0.12], { k: 0.012 }));
const rightLung = () => [
  S.ell([-0.066, 1.3, -0.006], [0.06, 0.13, 0.078]),
  ribcage(), dome(), I([-0.016, 0, 0], [1, 0, 0]),
  Sub(S.ell([-0.004, 1.3, 0.03], [0.03, 0.05, 0.045])),               // mediastinum / right heart
];
const leftLung = () => [
  S.ell([0.066, 1.296, -0.01], [0.056, 0.126, 0.074]),
  ribcage(), dome(), I([0.018, 0, 0], [-1, 0, 0]),
  Sub(S.ell([0.024, 1.262, 0.052], [0.05, 0.05, 0.05], { k: 0.01 })),  // cardiac notch
];
const oblUpper = (d = 0.0008) => S.pl([0, 1.39 - d, -0.06], [0, -0.13, -0.2], { o: "i", k: K });   // anterior-superior side
const oblLower = (d = 0.0008) => S.pl([0, 1.39 + d, -0.06], [0, 0.13, 0.2], { o: "i", k: K });
const lungSDF = (prims) => sdf(prims, { k: 0.012, cell: 0.0028 });
const LUNG_FN = "Swaps gases with the blood: oxygen passes from the air in about 300 million alveoli into the capillaries, and carbon dioxide passes out to be breathed away.";
P({
  id: "right-superior-lobe", name: "Right Upper Lobe", sys: "respiratory", grp: "Right lung", org: "Right Lung", col: "#E59AA3", q: 2, lbl: 1,
  g: [lungSDF([...rightLung(), oblUpper(), I([0, 1.3 + 0.0008, 0], [0, -1, 0])])],
  d: "The top lobe of the right lung, above the horizontal fissure. Its apex rises about 2–3 cm above the collarbone.",
  fn: LUNG_FN, kid: "Your right lung has three parts and your left lung has two — to make room for your heart.",
  meta: { Segments: "Apical, posterior, anterior" },
});
P({
  id: "right-middle-lobe", name: "Right Middle Lobe", sys: "respiratory", grp: "Right lung", org: "Right Lung", col: "#E59AA3", q: 3,
  g: [lungSDF([...rightLung(), oblUpper(), I([0, 1.3 - 0.0008, 0], [0, 1, 0])])],
  d: "The small wedge-shaped middle lobe found only in the right lung, between the horizontal and oblique fissures.",
  fn: LUNG_FN, kid: "Only your right lung has a middle part.", meta: { Segments: "Lateral, medial" },
});
P({
  id: "right-inferior-lobe", name: "Right Lower Lobe", sys: "respiratory", grp: "Right lung", org: "Right Lung", col: "#E59AA3", q: 3,
  g: [lungSDF([...rightLung(), oblLower()])],
  d: "The largest lobe of the right lung, below the oblique fissure, resting on the dome of the diaphragm.",
  fn: LUNG_FN, kid: "The bottom of your lungs sits on a big breathing muscle called the diaphragm.", meta: { Segments: "Five basal segments plus the superior segment" },
});
P({
  id: "left-superior-lobe", name: "Left Upper Lobe", sys: "respiratory", grp: "Left lung", org: "Left Lung", col: "#E59AA3", q: 2, lbl: 1,
  g: [lungSDF([...leftLung(), oblUpper()])],
  d: "The upper lobe of the left lung. Its lower front part, the lingula, curls round the cardiac notch where the heart sits.",
  fn: LUNG_FN, kid: "Your left lung is a bit smaller than your right to leave room for your heart.", meta: { Segments: "Apicoposterior, anterior, superior and inferior lingular" },
});
P({
  id: "left-inferior-lobe", name: "Left Lower Lobe", sys: "respiratory", grp: "Left lung", org: "Left Lung", col: "#E59AA3", q: 3,
  g: [lungSDF([...leftLung(), oblLower()])],
  d: "The lower lobe of the left lung, below and behind the oblique fissure.",
  fn: LUNG_FN, kid: "Deep breaths fill the bottom of your lungs.", meta: { Segments: "Superior plus four basal segments" },
});
function bronchialTree(side) {
  const s = side === "l" ? 1 : -1;
  const out = [], carina = [0, 1.347, -0.002];
  const main = side === "l" ? [carina, [0.024, 1.33, -0.006], [0.046, 1.305, -0.012]] : [carina, [-0.02, 1.33, -0.004], [-0.036, 1.31, -0.008]];
  const grow = (from, dir, len, r, depth) => {
    const to = add(from, mul(norm(dir), len));
    out.push(tube([from, lerp(from, to, 0.5), to], [r, r * 0.8], { rs: 6 }));
    if (depth === 0) return;
    const d1 = add(dir, [0.35 * s, 0.25, 0.25]), d2 = add(dir, [0.2 * s, -0.35, -0.3]);
    grow(to, d1, len * 0.72, r * 0.7, depth - 1);
    grow(to, d2, len * 0.72, r * 0.7, depth - 1);
  };
  const end = main[2];
  grow(end, [0.2 * s, 0.9, 0.15], 0.03, 0.0035, 2);   // upper lobe
  grow(end, [0.5 * s, -0.6, 0.35], 0.035, 0.004, 2);   // middle / lingula
  grow(end, [0.3 * s, -0.9, -0.35], 0.045, 0.0045, 3); // lower lobe
  return { main, out };
}
for (const side of ["r", "l"]) {
  const { main, out } = bronchialTree(side);
  const nm = side === "r" ? "Right" : "Left";
  P({
    id: `${side === "r" ? "right" : "left"}-main-bronchus`, name: `${nm} Main Bronchus`, sys: "respiratory", grp: "Airways", col: "#E7B6AE", q: 2,
    g: [tube(main, side === "r" ? 0.0068 : 0.006)],
    d: side === "r" ? "The wider, shorter and more vertical of the two main bronchi — which is why inhaled objects usually lodge in the right lung." : "The narrower, longer main bronchus, which passes under the aortic arch to reach the left lung.",
    fn: "Carries air from the trachea into the lung, where it divides into lobar bronchi.",
    kid: "The windpipe splits into two tubes, one for each lung.", meta: { Length: side === "r" ? "About 2.5 cm" : "About 5 cm" },
  });
  P({
    id: `${side === "r" ? "right" : "left"}-bronchial-tree`, name: `${nm} Bronchial Tree`, sys: "respiratory", grp: "Airways", col: "#EFC7BF", q: 3,
    g: out,
    d: "The branching airways inside the lung: lobar, segmental and ever smaller bronchi, then bronchioles — about 23 generations of branching in all.",
    fn: "Distributes air evenly to the alveoli. Smooth muscle in the smaller airways tightens during an asthma attack.",
    kid: "Inside your lungs the airways branch like an upside-down tree.", meta: { Branching: "About 23 generations" },
  });
}
P({
  id: "diaphragm", name: "Diaphragm", sys: "respiratory", grp: "Breathing muscles", mat: "muscle", q: 1, lbl: 1,
  g: [sdf([
    S.ell([-0.008, 1.1, -0.006], [0.14, 0.116, 0.108]),
    Sub(S.ell([-0.008, 1.1, -0.006], [0.1335, 0.109, 0.1015], { k: 0.002 })),
    I([0, 1.125, 0], [0, -1, 0]),
    Sub(S.ell([0.012, 1.19, -0.035], [0.02, 0.02, 0.02], { k: 0.002 })),
    S.cap([0.012, 1.14, -0.05], [0.01, 1.06, -0.035], 0.006, 0.004), S.cap([-0.012, 1.14, -0.05], [-0.01, 1.05, -0.035], 0.007, 0.004),
  ], { k: 0.006, cell: 0.003 })],
  d: "A dome-shaped sheet of muscle and tendon separating the chest from the abdomen. The aorta, oesophagus and inferior vena cava pass through it.",
  fn: "The main muscle of breathing: it contracts and flattens to draw air into the lungs, and relaxes to let it out. It also helps with coughing, vomiting and pushing during childbirth.",
  kid: "When this muscle moves down, air rushes into your lungs. Hiccups are little spasms of the diaphragm!",
  meta: { Nerve: "Phrenic nerve (C3–C5)", Openings: "Caval (T8), oesophageal (T10), aortic (T12)" },
});

/* =====================================================================
   DIGESTIVE
   ===================================================================== */
P({
  id: "esophagus", name: "Oesophagus", sys: "digestive", grp: "Gastrointestinal tract", col: "#D98C84", q: 1, lbl: 1, aka: "esophagus food pipe gullet",
  g: [tube([[0, 1.486, -0.014], [0, 1.43, -0.024], [0.004, 1.35, -0.026], [0.008, 1.26, -0.022], [0.016, 1.21, -0.016], [0.03, 1.192, -0.008]], 0.0075)],
  d: "The food pipe: a 25 cm muscular tube from the throat, behind the trachea and heart, through the diaphragm to the stomach.",
  fn: "Moves swallowed food to the stomach with waves of muscle contraction (peristalsis) — it works even upside down. A ring of muscle at the bottom stops acid coming back up.",
  kid: "Food doesn't just fall down this tube — muscles squeeze it along, even if you're upside down.",
  meta: { Length: "About 25 cm" },
});
P({
  id: "stomach", name: "Stomach", sys: "digestive", grp: "Gastrointestinal tract", col: "#E09A86", q: 1, lbl: 1,
  g: [sdf([
    S.sph([0.056, 1.188, -0.004], 0.03),
    ...S.chain([[0.064, 1.17, 0.012], [0.062, 1.118, 0.04], [0.03, 1.084, 0.056], [-0.004, 1.086, 0.05], [-0.016, 1.09, 0.044]], [0.034, 0.032, 0.022, 0.014, 0.011]),
    S.cap([0.03, 1.192, -0.008], [0.04, 1.185, -0.002], 0.009),
  ], { k: 0.02, cell: 0.0028 })],
  d: "A J-shaped muscular bag in the upper left abdomen, below the diaphragm. Its regions are the cardia, fundus, body, antrum and pylorus.",
  fn: "Stores a meal, churns it with hydrochloric acid and pepsin into a paste called chyme, and releases it little by little into the duodenum. It also makes intrinsic factor, needed to absorb vitamin B12.",
  kid: "Your stomach is a stretchy bag that mashes food with strong acid.",
  meta: { Capacity: "About 1–1.5 L", "Stomach acid": "pH 1.5–3.5" },
});
P({
  id: "duodenum", name: "Duodenum", sys: "digestive", grp: "Small intestine", org: "Small Intestine", col: "#E3A98C", q: 2,
  g: [tube([[-0.016, 1.09, 0.044], [-0.04, 1.086, 0.03], [-0.05, 1.062, 0.016], [-0.047, 1.034, 0.01], [-0.02, 1.02, 0.008], [0.014, 1.026, 0.01], [0.03, 1.046, 0.016]], 0.0125)],
  d: "The first 25 cm of the small intestine, a C-shaped loop wrapped around the head of the pancreas.",
  fn: "Receives chyme from the stomach plus bile and pancreatic juice, which neutralise the acid and break down fats, proteins and carbohydrates.",
  kid: "Digestive juices from the liver and pancreas squirt into this part.", meta: { Length: "About 25 cm" },
});
{
  // Jejunum (upper left) and ileum (lower right): a serpentine packed into the abdomen.
  const coil = (y0, y1, rows, zBase, xOff) => {
    const pts = [];
    for (let r = 0; r < rows; r++) {
      const y = y0 + (y1 - y0) * (r / (rows - 1)), dir = r % 2 ? -1 : 1, z = zBase + (r % 2 ? 0.014 : 0);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, x = xOff + dir * (-0.06 + 0.12 * t);
        pts.push([x, y + Math.sin(t * Math.PI * 2 + r) * 0.006, z + Math.cos(t * Math.PI * 3 + r) * 0.01]);
      }
    }
    return pts;
  };
  const jej = [[0.03, 1.046, 0.016], [0.05, 1.05, 0.03], ...coil(1.045, 0.99, 4, 0.04, 0.01)];
  const ile = [...coil(0.978, 0.935, 3, 0.042, -0.005), [-0.05, 0.95, 0.04], [-0.07, 0.955, 0.03]];
  P({
    id: "jejunum", name: "Jejunum", sys: "digestive", grp: "Small intestine", org: "Small Intestine", col: "#E7A993", q: 2, lbl: 1,
    g: [tube(jej, 0.0115, { sl: 0.005 })],
    d: "The middle section of the small intestine, about 2.5 m long, lying mostly in the upper left abdomen. Its thick, velvety lining is folded into finger-like villi.",
    fn: "Absorbs most of the sugars, amino acids and fatty acids released by digestion.",
    kid: "If you stretched out your small intestine it would be longer than a car!", meta: { Length: "About 2.5 m" },
  });
  P({
    id: "ileum", name: "Ileum", sys: "digestive", grp: "Small intestine", org: "Small Intestine", col: "#E2A08C", q: 2,
    g: [tube(ile, 0.0105, { sl: 0.005 })],
    d: "The final and longest section of the small intestine (about 3.5 m), in the lower right abdomen, ending at the ileocaecal valve.",
    fn: "Absorbs vitamin B12 and bile salts and whatever nutrients the jejunum missed; its Peyer's patches are an important part of gut immunity.",
    kid: "The last part of the small intestine soaks up vitamin B12.", meta: { Length: "About 3.5 m" },
  });
}
const haustra = (n, a, b) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));
P({
  id: "cecum", name: "Caecum", sys: "digestive", grp: "Large intestine", org: "Large Intestine", col: "#D8A080", q: 3, aka: "cecum",
  g: [sdf([S.sph([-0.075, 0.945, 0.03], 0.021), S.cap([-0.075, 0.945, 0.03], [-0.08, 0.965, 0.025], 0.02)], { k: 0.008, cell: 0.0025 })],
  d: "A pouch about 6 cm long at the start of the large intestine, in the lower right abdomen, where the ileum joins.",
  fn: "Receives liquid waste from the small intestine and starts absorbing water and salts.",
  kid: "The large intestine starts with a little pouch.", meta: { Length: "About 6 cm" },
});
P({
  id: "appendix", name: "Appendix", sys: "digestive", grp: "Large intestine", org: "Large Intestine", col: "#D8A080", q: 2,
  g: [tube([[-0.07, 0.93, 0.032], [-0.064, 0.912, 0.036], [-0.058, 0.9, 0.03], [-0.054, 0.895, 0.022]], [0.0038, 0.0032, 0.003, 0.0025])],
  d: "A narrow, finger-like tube 5–10 cm long hanging from the caecum.",
  fn: "Contains lymphoid tissue and may act as a safe store of friendly gut bacteria. When it becomes blocked and inflamed (appendicitis) it usually has to be removed.",
  kid: "The appendix is a tiny tube that sometimes has to be taken out if it gets sore.", meta: { Length: "5–10 cm" },
});
const colon = (id, name, pts, d, fn, extra = {}) => P({ id, name, sys: "digestive", grp: "Large intestine", org: "Large Intestine", col: "#D8A080", g: [tube(pts, haustra(pts.length * 2 - 1 > 3 ? pts.length : 3, 0.019, 0.016).slice(0, Math.max(pts.length, 2)), { sl: 0.004 })], d, fn, kid: "The large intestine takes water back out of leftover food.", meta: { Wall: "Pouches called haustra" }, ...extra });
colon("ascending-colon", "Ascending Colon", [[-0.08, 0.96, 0.025], [-0.086, 0.99, 0.022], [-0.088, 1.02, 0.02], [-0.087, 1.05, 0.022], [-0.082, 1.075, 0.03]],
  "The part of the colon rising up the right side of the abdomen from the caecum to the hepatic flexure under the liver.", "Absorbs water and salts from liquid waste.", { q: 3 });
colon("transverse-colon", "Transverse Colon", [[-0.078, 1.085, 0.04], [-0.05, 1.07, 0.066], [-0.015, 1.058, 0.078], [0.025, 1.064, 0.078], [0.058, 1.085, 0.06], [0.08, 1.11, 0.03]],
  "The longest and most mobile part of the colon, hanging across the abdomen between the liver and spleen.", "Continues absorbing water; its gut bacteria ferment fibre and make vitamin K.", { q: 2, lbl: 1 });
colon("descending-colon", "Descending Colon", [[0.086, 1.108, 0.008], [0.092, 1.07, 0.0], [0.092, 1.03, 0.0], [0.09, 0.99, 0.0], [0.086, 0.962, 0.004]],
  "The part of the colon running down the left side of the abdomen from the splenic flexure.", "Stores faeces that are becoming solid on their way to the rectum.", { q: 3 });
colon("sigmoid-colon", "Sigmoid Colon", [[0.084, 0.958, 0.004], [0.07, 0.935, 0.03], [0.04, 0.925, 0.036], [0.015, 0.93, 0.015], [0.004, 0.92, -0.018]],
  "An S-shaped loop of colon in the lower left pelvis, joining the descending colon to the rectum.", "Holds faeces until they are ready to pass into the rectum.", { q: 3 });
P({
  id: "rectum", name: "Rectum", sys: "digestive", grp: "Large intestine", org: "Large Intestine", col: "#C98E76", q: 2,
  g: [tube([[0.004, 0.92, -0.022], [0.002, 0.905, -0.042], [0, 0.885, -0.046], [0, 0.866, -0.038]], [0.017, 0.02, 0.019, 0.012])],
  d: "The last 12 cm of the large intestine, following the curve of the sacrum.",
  fn: "Stores faeces until you go to the toilet; stretch receptors in its wall create the urge to go.",
  kid: "This is the waiting room before poo leaves your body.", meta: { Length: "About 12 cm" },
});
P({
  id: "anal-canal", name: "Anal Canal", sys: "digestive", grp: "Large intestine", org: "Large Intestine", col: "#C98E76", q: 3,
  g: [tube([[0, 0.866, -0.038], [0, 0.852, -0.034], [0, 0.838, -0.03]], [0.009, 0.007])],
  d: "The final 3–4 cm of the digestive tract, surrounded by internal and external sphincter muscles.",
  fn: "Keeps faeces in and gas under control until you choose to let them out.",
  kid: "Two rings of muscle keep it closed until you're on the toilet.", meta: { Length: "3–4 cm" },
});
// Liver: one organ carved into its two anatomical lobes at the falciform ligament.
const liver = () => [
  S.ell([-0.06, 1.162, 0.018], [0.072, 0.058, 0.074]),
  S.ell([0.018, 1.175, 0.034], [0.06, 0.03, 0.05]),
  Int(S.ell([-0.008, 1.1, -0.004], [0.139, 0.114, 0.106], { k: 0.006 })),   // under the diaphragm dome
  S.pl([0, 1.118, 0.0], [0.34, -1, -0.28], { o: "i", k: 0.01 }),              // sloping visceral surface
  Sub(S.ell([0.058, 1.19, -0.004], [0.034, 0.03, 0.032])),                    // stomach bed
  Sub(S.ell([-0.05, 1.1, -0.05], [0.03, 0.05, 0.022])),                       // renal impression
];
P({
  id: "liver-right-lobe", name: "Liver — Right Lobe", sys: "digestive", grp: "Liver", org: "Liver", col: "#7B2F27", q: 1, lbl: 1,
  g: [sdf([...liver(), I([0.006, 0, 0], [1, 0, 0])], { k: 0.012, cell: 0.003 })],
  d: "The larger of the liver's two lobes, filling the upper right abdomen under the ribs. The liver is the body's largest internal organ, weighing about 1.5 kg.",
  fn: "Processes everything absorbed from the gut, stores glycogen, vitamins and iron, makes bile, blood proteins such as albumin and clotting factors, and breaks down alcohol, drugs and old red cells.",
  kid: "Your liver does over 500 jobs, like cleaning your blood — and it can regrow if part is removed!",
  meta: { Weight: "About 1.5 kg (whole liver)", "Blood supply": "Hepatic artery (25%), portal vein (75%)" },
});
P({
  id: "liver-left-lobe", name: "Liver — Left Lobe", sys: "digestive", grp: "Liver", org: "Liver", col: "#7B2F27", q: 3,
  g: [sdf([...liver(), I([0.006, 0, 0], [-1, 0, 0])], { k: 0.012, cell: 0.003 })],
  d: "The smaller, flatter lobe of the liver, extending to the left over the stomach, separated from the right lobe by the falciform ligament.",
  fn: "Shares all of the liver's metabolic, storage and detoxifying work.",
  kid: "The liver's left side is smaller and sits over your stomach.", meta: { Part: "Liver" },
});
P({
  id: "gallbladder", name: "Gallbladder", sys: "digestive", grp: "Liver", col: "#6C9A42", q: 2, lbl: 1,
  g: [sdf([S.cap([-0.032, 1.12, 0.042], [-0.04, 1.098, 0.07], 0.007, 0.012)], { k: 0.004, cell: 0.0015 })],
  d: "A pear-shaped sac about 8 cm long tucked under the right lobe of the liver.",
  fn: "Stores and concentrates bile and squeezes it into the duodenum after a fatty meal. Hardened bile forms gallstones.",
  kid: "It squirts green bile to help you digest fatty food.", meta: { Capacity: "About 50 mL" },
});
P({
  id: "bile-ducts", name: "Bile Ducts", sys: "digestive", grp: "Liver", col: "#86B04C", q: 3, aka: "common bile duct hepatic duct cystic duct",
  g: [tube([[-0.02, 1.13, 0.03], [-0.026, 1.115, 0.03], [-0.032, 1.09, 0.025], [-0.04, 1.06, 0.02], [-0.046, 1.052, 0.016]], 0.0022), tube([[-0.033, 1.118, 0.044], [-0.027, 1.113, 0.032]], 0.0018)],
  d: "The hepatic, cystic and common bile ducts: the plumbing that carries bile from the liver and gallbladder to the duodenum.",
  fn: "Deliver bile to the gut. A stone or tumour blocking them causes jaundice.",
  kid: "Tiny tubes carry bile from your liver to your gut.", meta: { Opens: "Major duodenal papilla, with the pancreatic duct" },
});
P({
  id: "pancreas", name: "Pancreas", sys: "digestive", grp: "Pancreas", col: "#E3B26E", q: 1, lbl: 1,
  g: [tube([[-0.038, 1.05, 0.02], [-0.018, 1.066, 0.02], [0.01, 1.08, 0.006], [0.045, 1.1, -0.014], [0.08, 1.118, -0.028], [0.092, 1.13, -0.034]], [0.017, 0.012, 0.011, 0.01, 0.008, 0.006], { fa: 0.6, up: [0, 0, 1] })],
  d: "A soft, 15 cm long gland lying behind the stomach, with its head in the curve of the duodenum and its tail touching the spleen.",
  fn: "Two jobs in one: it pours about 1.5 litres of digestive enzymes a day into the duodenum, and its islets of Langerhans release insulin and glucagon to control blood sugar.",
  kid: "The pancreas makes insulin, which lets sugar from your food get into your cells.",
  meta: { Length: "About 15 cm", Hormones: "Insulin, glucagon, somatostatin", Enzymes: "Amylase, lipase, proteases" },
});
P({
  id: "spleen", name: "Spleen", sys: "lymphatic", grp: "Lymphoid organs", col: "#7B3050", q: 1, lbl: 1,
  g: [sdf([S.ell([0.1, 1.148, -0.042], [0.022, 0.052, 0.034], { e: [10, -35, 20] }), Sub(S.sph([0.082, 1.15, -0.02], 0.02))], { k: 0.006, cell: 0.0025 })],
  d: "A fist-sized organ in the upper left abdomen, tucked under ribs 9–11 behind the stomach.",
  fn: "Filters the blood, removing old and damaged red cells, recycles their iron, stores platelets and white cells, and fights blood-borne infections.",
  kid: "Your spleen is a blood filter that also helps fight germs.",
  meta: { Size: "About 12 × 7 × 3 cm", Weight: "About 150 g" },
});

/* =====================================================================
   URINARY
   ===================================================================== */
P({
  id: "kidney", name: "Kidney", sys: "urinary", grp: "Kidneys", bi: 1, ro: [0, -0.014, 0], col: "#8E3A34", q: 1, lbl: 1,
  g: [sdf([S.ell([0.054, 1.103, -0.05], [0.026, 0.054, 0.019], { e: [8, -30, 14] }), Sub(S.ell([0.03, 1.1, -0.036], [0.012, 0.018, 0.012]))], { k: 0.006, cell: 0.0022 })],
  d: "A bean-shaped organ about 11 cm long against the back wall of the abdomen, at the level of T12–L3. The right kidney sits a little lower than the left because of the liver.",
  fn: "Filters about 180 litres of blood plasma a day through a million nephrons each, keeping water, salts, acid and blood pressure in balance and producing 1–2 litres of urine. Also makes erythropoietin (EPO) and activates vitamin D.",
  kid: "Your kidneys clean your blood and turn the waste into pee.",
  meta: { Size: "About 11 × 6 × 3 cm", Nephrons: "About 1 million per kidney", Hormones: "EPO, renin, calcitriol" },
});
P({
  id: "ureter", name: "Ureter", sys: "urinary", grp: "Urinary tract", bi: 1, col: "#D8A56A", q: 2,
  g: [tube([[0.034, 1.095, -0.036], [0.038, 1.04, -0.032], [0.044, 0.975, -0.02], [0.046, 0.925, -0.018], [0.03, 0.892, 0.012], [0.02, 0.884, 0.026]], 0.0024)],
  d: "A muscular tube 25–30 cm long carrying urine from each kidney down to the bladder.",
  fn: "Pushes urine downward with waves of contraction; kidney stones cause intense pain when they get stuck in it.",
  kid: "Two thin tubes carry pee from your kidneys to your bladder.", meta: { Length: "25–30 cm" },
});
P({
  id: "bladder", name: "Urinary Bladder", sys: "urinary", grp: "Urinary tract", col: "#E3B062", q: 1, lbl: 1,
  g: [sdf([S.ell([0, 0.886, 0.045], [0.032, 0.026, 0.028]), I([0, 0.91, 0], [0, 1, 0])], { k: 0.008, cell: 0.0022 })],
  d: "A hollow, stretchy muscular bag in the pelvis behind the pubic bone.",
  fn: "Stores urine and empties it through the urethra when you choose to go.",
  kid: "Your bladder is like a balloon that fills with pee and tells you when it's time to go.",
  meta: { Capacity: "400–600 mL", Muscle: "Detrusor" },
});
P({
  id: "urethra-m", name: "Urethra", sex: "m", sys: "urinary", grp: "Urinary tract", col: "#E0A56A", q: 3,
  g: [tube([[0, 0.862, 0.036], [0, 0.848, 0.04], [0, 0.835, 0.06], [0, 0.83, 0.092], [0, 0.8, 0.112], [0, 0.772, 0.126]], 0.0022)],
  d: "In males, a tube about 20 cm long running from the bladder through the prostate and penis.",
  fn: "Carries urine out of the body, and in males also carries semen.",
  kid: "Pee leaves your body through this tube.", meta: { Length: "About 20 cm" },
});
P({
  id: "urethra-f", name: "Urethra", sex: "f", sys: "urinary", grp: "Urinary tract", col: "#E0A56A", q: 3,
  g: [tube([[0, 0.862, 0.036], [0, 0.848, 0.045], [0, 0.835, 0.052]], 0.0024)],
  d: "In females, a short tube about 4 cm long from the bladder to the outside, in front of the vagina.",
  fn: "Carries urine out of the body. Its shortness is why urinary infections are more common in women.",
  kid: "Pee leaves your body through this tube.", meta: { Length: "About 4 cm" },
});

/* =====================================================================
   ENDOCRINE (trunk) & LYMPHATIC
   ===================================================================== */
P({
  id: "adrenal-gland", name: "Adrenal Gland", sys: "endocrine", grp: "Adrenals", bi: 1, ro: [0, -0.012, 0], mat: "gland", col: "#D59A3C", q: 2,
  g: [sdf([S.ell([0.046, 1.159, -0.046], [0.013, 0.011, 0.005], { e: [0, -30, 15] })], { k: 0.003, cell: 0.0012 })],
  d: "A small triangular gland capping the top of each kidney, made of an outer cortex and inner medulla.",
  fn: "The cortex makes cortisol (stress and blood sugar), aldosterone (salt and blood pressure) and androgens; the medulla releases adrenaline and noradrenaline for fight or flight.",
  kid: "When you're scared, these glands pump out adrenaline so you can run fast.",
  meta: { Hormones: "Cortisol, aldosterone, adrenaline, noradrenaline", Weight: "About 5 g" },
});
P({
  id: "thymus", name: "Thymus", sys: "lymphatic", grp: "Lymphoid organs", mat: "gland", col: "#C7A68A", q: 2,
  g: [sdf([...both([S.ell([0.011, 1.385, 0.066], [0.011, 0.032, 0.01], { e: [0, 0, 8] })])], { k: 0.006, cell: 0.0016 })],
  d: "A two-lobed organ behind the top of the sternum. It is largest at puberty and is gradually replaced by fat in adults.",
  fn: "Where T-lymphocytes mature and learn to tell the body's own cells from invaders.",
  kid: "The thymus is a school where your germ-fighting T-cells learn their job.", meta: { Peak: "Puberty", Trains: "T-lymphocytes" },
});
P({
  id: "thoracic-duct", name: "Thoracic Duct", sys: "lymphatic", grp: "Lymph vessels", col: "#9ACB7B", q: 3,
  g: [tube([[0.004, 1.1, -0.028], [0.004, 1.16, -0.036], [0.002, 1.25, -0.046], [0.004, 1.34, -0.046], [0.012, 1.41, -0.032], [0.026, 1.448, -0.004], [0.034, 1.442, 0.018]], 0.0022)],
  d: "The largest lymph vessel, about 40 cm long, running up in front of the spine from the cisterna chyli to the junction of the left subclavian and internal jugular veins.",
  fn: "Returns about three-quarters of the body's lymph — plus fats absorbed from the gut — to the bloodstream.",
  kid: "This long tube returns lymph fluid to your blood.", meta: { Length: "38–45 cm" },
});
P({
  id: "cisterna-chyli", name: "Cisterna Chyli", sys: "lymphatic", grp: "Lymph vessels", col: "#9ACB7B", q: 3,
  g: [ell([0.004, 1.09, -0.026], [0.005, 0.014, 0.004])],
  d: "A sac at the bottom of the thoracic duct in front of L1–L2.",
  fn: "Collects milky, fat-rich lymph (chyle) from the intestines and lymph from the legs.",
  kid: "A little collecting bag for lymph from your belly.", meta: { Level: "L1–L2" },
});
const nodes = (id, name, pts, r, d, fn, extra = {}) => P({ id, name, sys: "lymphatic", grp: "Lymph nodes", col: "#8FC46F", q: 2, g: pts.map((c, i) => ell(c, [r * (1 - (i % 3) * 0.12), r * 1.3, r], { seg: 12 })), d, fn, kid: "Lymph nodes are like filters that trap germs. They swell up when you're sick.", meta: { Contains: "Lymphocytes and macrophages" }, ...extra });
nodes("cervical-lymph-nodes", "Cervical Lymph Nodes", [[0.036, 1.52, 0.03], [0.04, 1.5, 0.028], [0.041, 1.48, 0.024], [0.044, 1.46, 0.02], [0.03, 1.535, 0.042], [0.048, 1.55, 0.004]], 0.0035,
  "Chains of lymph nodes along the internal jugular vein and under the jaw.", "Filter lymph from the head and neck — the lumps you can feel under your jaw during a sore throat.", { bi: 1 });
nodes("axillary-lymph-nodes", "Axillary Lymph Nodes", [[0.15, 1.35, -0.005], [0.14, 1.33, 0.005], [0.155, 1.32, -0.01], [0.135, 1.36, 0.0], [0.145, 1.305, 0.0]], 0.0045,
  "20–40 lymph nodes in the fat of the armpit.", "Filter lymph from the arm and chest wall, including the breast — which is why they are checked in breast cancer.", { bi: 1 });
nodes("inguinal-lymph-nodes", "Inguinal Lymph Nodes", [[0.07, 0.88, 0.06], [0.08, 0.87, 0.058], [0.062, 0.866, 0.064], [0.085, 0.855, 0.055]], 0.0042,
  "Lymph nodes in the groin, below the inguinal ligament.", "Filter lymph from the leg, buttock and lower abdominal wall.", { bi: 1 });
nodes("mesenteric-lymph-nodes", "Mesenteric Lymph Nodes", [[0.0, 1.04, 0.02], [0.012, 1.02, 0.025], [-0.012, 1.01, 0.022], [0.006, 0.995, 0.03], [-0.004, 1.03, 0.015], [0.018, 1.0, 0.02]], 0.0035,
  "Hundreds of nodes in the mesentery, the fan of tissue that holds the intestines.", "Filter lymph and absorbed fat coming from the gut and start immune responses to gut infections.");
nodes("mediastinal-lymph-nodes", "Mediastinal Lymph Nodes", [[0.006, 1.35, 0.005], [-0.012, 1.34, 0.004], [0.016, 1.33, -0.008], [-0.018, 1.36, 0.012], [0.0, 1.37, 0.018]], 0.0035,
  "Lymph nodes in the centre of the chest around the trachea and bronchi.", "Drain the lungs and heart; they can be blackened by soot in city dwellers and smokers.");
nodes("para-aortic-lymph-nodes", "Para-aortic Lymph Nodes", [[0.02, 1.1, -0.015], [0.018, 1.06, -0.008], [-0.012, 1.08, -0.01], [-0.014, 1.04, -0.004], [0.02, 1.02, -0.004]], 0.0035,
  "Lymph nodes along the abdominal aorta.", "Drain the kidneys, adrenals and gonads — testicular and ovarian cancers spread here first.");

/* =====================================================================
   REPRODUCTIVE — male
   ===================================================================== */
P({
  id: "testis", name: "Testis", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, col: "#E7C1B0", q: 2,
  g: [ell([0.017, 0.8, 0.078], [0.011, 0.02, 0.013], { e: [10, 0, 0] })],
  d: "An oval gland about 4–5 cm long held in the scrotum, outside the body where it is 2–3 °C cooler.",
  fn: "Produces sperm (about 100 million a day) and the hormone testosterone.",
  kid: "The testes make the cells that can grow into a baby.", meta: { Hormone: "Testosterone", Size: "About 4.5 × 2.5 cm" },
});
P({
  id: "epididymis", name: "Epididymis", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, col: "#D9A38E", q: 3,
  g: [tube([[0.02, 0.818, 0.07], [0.022, 0.8, 0.064], [0.019, 0.782, 0.068]], [0.005, 0.0035, 0.003])],
  d: "A tightly coiled tube about 6 metres long packed along the back of each testis.",
  fn: "Stores sperm while they mature and learn to swim.",
  kid: "A long coiled tube where sperm grow up.", meta: { Length: "About 6 m uncoiled" },
});
P({
  id: "vas-deferens", name: "Vas Deferens", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, col: "#E0B7A0", q: 3,
  g: [tube([[0.02, 0.785, 0.066], [0.028, 0.83, 0.078], [0.045, 0.88, 0.07], [0.06, 0.9, 0.045], [0.052, 0.915, 0.02], [0.03, 0.9, 0.006], [0.012, 0.878, 0.016], [0.006, 0.864, 0.028]], 0.0018)],
  d: "A muscular tube about 45 cm long that runs from the epididymis up through the groin, over the ureter and behind the bladder to the prostate.",
  fn: "Propels sperm towards the urethra during ejaculation. Cutting it (vasectomy) is a permanent form of contraception.",
  kid: "A tube that carries sperm from the testes.", meta: { Length: "About 45 cm" },
});
P({
  id: "seminal-vesicle", name: "Seminal Vesicle", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, mat: "gland", col: "#D9B08A", q: 3,
  g: [ell([0.018, 0.872, 0.012], [0.016, 0.0055, 0.008], { e: [0, 20, 25] })],
  d: "A coiled gland about 5 cm long behind the bladder.",
  fn: "Makes about 70% of the fluid in semen, rich in fructose that fuels the sperm.",
  kid: "It makes the fluid that carries sperm.", meta: { Output: "About 70% of semen volume" },
});
P({
  id: "prostate", name: "Prostate", sex: "m", sys: "reproductive", grp: "Male reproductive", mat: "gland", col: "#C98F77", q: 2,
  g: [ell([0, 0.853, 0.036], [0.018, 0.013, 0.014])],
  d: "A walnut-sized gland below the bladder that surrounds the first part of the urethra.",
  fn: "Adds a milky, alkaline fluid to semen. It commonly enlarges with age, making urination slower; PSA is the blood test used to monitor it.",
  kid: "A gland just under the bladder, found only in boys and men.", meta: { Weight: "About 20 g", "Blood test": "PSA" },
});
P({
  id: "penis", name: "Penis", sex: "m", sys: "reproductive", grp: "Male reproductive", col: "#DDA38C", q: 2,
  g: [sdf([S.cap([0, 0.84, 0.084], [0, 0.782, 0.118], 0.0115, 0.011), S.ell([0, 0.776, 0.121], [0.012, 0.013, 0.012])], { k: 0.005, cell: 0.0022 })],
  d: "The external male organ, made of three columns of spongy erectile tissue around the urethra.",
  fn: "Carries urine and semen out of the body through the urethra.",
  kid: "Boys pee through their penis.", meta: { Tissue: "Corpora cavernosa and corpus spongiosum" },
});
P({
  id: "scrotum", name: "Scrotum", sex: "m", sys: "reproductive", grp: "Male reproductive", mat: "skin", q: 3,
  g: [sdf([S.ell([0.013, 0.8, 0.078], [0.02, 0.028, 0.02]), S.ell([-0.013, 0.8, 0.078], [0.02, 0.028, 0.02])], { k: 0.01, cell: 0.0025 })],
  d: "The pouch of skin and smooth muscle that holds the testes outside the abdomen.",
  fn: "Keeps the testes a few degrees cooler than the core, which sperm production needs, tightening in the cold and relaxing in the warm.",
  kid: "It keeps the testes cool.", meta: { Muscle: "Dartos and cremaster" },
});

/* =====================================================================
   REPRODUCTIVE — female
   ===================================================================== */
P({
  id: "ovary", name: "Ovary", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, col: "#E8C4B0", q: 2,
  g: [ell([0.052, 0.93, 0.01], [0.009, 0.014, 0.008], { e: [0, 0, 30] })],
  d: "An almond-sized gland on each side of the uterus. At birth each ovary holds about a million immature eggs.",
  fn: "Releases an egg about once a month from puberty to menopause and makes the hormones oestrogen and progesterone.",
  kid: "Ovaries store tiny eggs that could one day grow into a baby.", meta: { Hormones: "Oestrogen, progesterone, inhibin", Size: "About 3 × 2 × 1 cm" },
});
P({
  id: "fallopian-tube", name: "Fallopian Tube", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, col: "#E2A99A", q: 2, aka: "uterine tube oviduct",
  g: [tube([[0.02, 0.953, 0.032], [0.036, 0.956, 0.03], [0.052, 0.95, 0.024], [0.064, 0.938, 0.014], [0.062, 0.924, 0.006]], [0.0022, 0.0028, 0.0035, 0.005])],
  d: "A slender tube about 10 cm long from the top of the uterus to the ovary, ending in finger-like fimbriae.",
  fn: "Catches the egg released by the ovary; fertilisation usually happens here, and the tube then carries the embryo to the uterus.",
  kid: "The egg travels down this tube to reach the womb.", meta: { Length: "About 10 cm" },
});
P({
  id: "uterus", name: "Uterus", sex: "f", sys: "reproductive", grp: "Female reproductive", col: "#D98A80", q: 1, lbl: 1, aka: "womb",
  g: [sdf([S.ell([0, 0.94, 0.036], [0.025, 0.028, 0.018], { e: [-30, 0, 0] }), S.cap([0, 0.918, 0.024], [0, 0.896, 0.012], 0.012, 0.0095)], { k: 0.008, cell: 0.0022 })],
  d: "The womb: a hollow, pear-shaped muscular organ about 7.5 cm long, tilted forward over the bladder. Its lining (endometrium) thickens and sheds each menstrual cycle.",
  fn: "Nourishes and protects a developing baby for about nine months, stretching to hundreds of times its size, then contracts powerfully during birth.",
  kid: "The womb is where a baby grows before it is born.", meta: { Size: "About 7.5 × 5 × 2.5 cm", Muscle: "Myometrium" },
});
P({
  id: "vagina", name: "Vagina", sex: "f", sys: "reproductive", grp: "Female reproductive", col: "#D99890", q: 3,
  g: [tube([[0, 0.898, 0.014], [0, 0.878, 0.02], [0, 0.858, 0.03], [0, 0.842, 0.04]], [0.011, 0.012, 0.011, 0.009], { fa: 0.55, up: [1, 0, 0] })],
  d: "A muscular, elastic canal about 8 cm long from the cervix to the outside of the body.",
  fn: "Lets menstrual blood out, receives sperm and stretches to become the birth canal.",
  kid: "Babies are usually born through this stretchy canal.", meta: { Length: "7–9 cm" },
});
P({
  id: "mammary-gland", name: "Mammary Gland", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, mat: "gland", col: "#E9C0A4", q: 2, aka: "breast",
  g: [sdf([S.ell([0.07, 1.31, 0.122], [0.042, 0.04, 0.024]), ...Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2; return S.sph([0.07 + Math.cos(a) * 0.024, 1.31 + Math.sin(a) * 0.022, 0.13], 0.011); })], { k: 0.012, cell: 0.0028 })],
  d: "Breast tissue made of 15–20 lobes of milk glands set in fat, each drained by a duct that opens at the nipple.",
  fn: "Produces milk after childbirth under the control of the hormones prolactin and oxytocin.",
  kid: "Mothers' bodies make milk here to feed their babies.", meta: { Lobes: "15–20", Hormones: "Prolactin (make), oxytocin (release)" },
});

/* =====================================================================
   SKIN — a translucent envelope, off by default
   ===================================================================== */
{
  const armPts = [[0.19, 1.39, -0.02], [0.24, 1.108, -0.028], [0.294, 0.86, 0.004]];
  const legPts = [[0.09, 0.9, 0.02], [0.093, 0.5, 0.004], [0.086, 0.09, -0.01]];
  const body = [
    S.ell([0, 1.668, -0.004], [0.078, 0.092, 0.101]),                      // head
    S.ell([0, 1.575, 0.052], [0.05, 0.062, 0.042]),                        // face & jaw
    S.cap([0, 1.54, -0.01], [0, 1.43, -0.005], 0.052, 0.058),              // neck
    S.ell([0, 1.33, 0.0], [0.155, 0.15, 0.118]),                           // chest
    S.ell([0, 1.12, 0.004], [0.14, 0.13, 0.108]),                          // abdomen
    S.ell([0, 0.93, -0.006], [0.165, 0.11, 0.112]),                        // pelvis
    ...both([
      S.sph([0.17, 1.42, -0.018], 0.06),                                   // shoulder
      S.cap(armPts[0], armPts[1], 0.047, 0.038),
      S.cap(armPts[1], armPts[2], 0.038, 0.027),
      S.ell(add(armPts[2], [0.02, -0.07, 0.008]), [0.034, 0.075, 0.016], { e: [0, 0, 11] }),
      S.ell([0.095, 0.82, -0.004], [0.08, 0.12, 0.09]),                    // hip & buttock
      S.cap(legPts[0], legPts[1], 0.084, 0.052),
      S.cap(legPts[1], [0.09, 0.3, -0.01], 0.05, 0.056),                   // calf
      S.cap([0.09, 0.3, -0.01], legPts[2], 0.056, 0.032),
      S.ell([0.095, 0.03, 0.07], [0.042, 0.035, 0.12], { e: [0, 10, 0] }),  // foot
    ]),
  ];
  P({
    id: "skin", name: "Skin", sys: "integumentary", grp: "Integument", mat: "skin", q: 1,
    g: [sdf(body, { k: 0.045, cell: 0.009 })],
    d: "The body's largest organ, covering about 1.8 m² and weighing around 4 kg. It has three layers: the epidermis, the dermis and the fatty hypodermis.",
    fn: "Keeps germs out and water in, controls temperature by sweating and flushing, senses touch, pain, heat and cold, and makes vitamin D in sunlight.",
    kid: "Your skin is your biggest organ — it replaces its whole outer layer about once a month!",
    meta: { Area: "About 1.8 m²", Weight: "About 4 kg", Layers: "Epidermis, dermis, hypodermis" },
  });
}

export default parts;
