/**
 * Arteries and veins. Paths follow the rig; left-side vessels are mirrored
 * with `bi`, midline and asymmetric vessels are authored individually.
 * Pulmonary arteries carry deoxygenated blood, so they are drawn blue
 * (and pulmonary veins red), as in every anatomy textbook.
 */
import { tube, makePart } from "../lib.mjs";
import { HAND, FOOT } from "./rig.mjs";

const parts = [];
const A = (p) => parts.push(makePart({ sys: "arteries", mat: "artery", ...p }));
const Vn = (p) => parts.push(makePart({ sys: "veins", mat: "vein", ...p }));
const H = (u, v, w) => HAND.at([u, v, w]);
const F = (u, v, w) => FOOT.at([u, v, w]);
const kidA = "Arteries carry blood away from the heart. This one is a branch of the big 'tree' that starts at the aorta.";
const kidV = "Veins carry blood back to your heart. They look blue under your skin, but the blood inside is dark red.";

/* =====================================================================
   ARTERIES — trunk
   ===================================================================== */
A({
  id: "ascending-aorta", name: "Ascending Aorta", grp: "Aorta", org: "Aorta", q: 2,
  g: [tube([[0.003, 1.305, 0.04], [-0.002, 1.33, 0.046], [-0.004, 1.36, 0.042], [0.0, 1.384, 0.028]], 0.0145)],
  d: "The first 5 cm of the aorta, rising from the left ventricle behind the sternum. The two coronary arteries branch off at its root.",
  fn: "Receives every beat of the left ventricle and feeds the coronary arteries that supply the heart muscle itself.",
  kid: "The aorta is your biggest artery — about as wide as a garden hose.", meta: { Diameter: "About 3 cm" },
});
A({
  id: "aortic-arch", name: "Aortic Arch", grp: "Aorta", org: "Aorta", q: 2, lbl: 1,
  g: [
    tube([[0.0, 1.384, 0.028], [0.008, 1.392, 0.012], [0.018, 1.388, -0.008], [0.022, 1.375, -0.024], [0.022, 1.36, -0.034]], 0.013),
    tube([[0.009, 1.392, 0.012], [0.018, 1.412, 0.018], [0.022, 1.432, 0.02]], 0.0045),       // left common carotid origin
    tube([[0.018, 1.388, -0.004], [0.028, 1.412, -0.004], [0.032, 1.432, 0.003]], 0.005),     // left subclavian origin
  ],
  d: "The curve of the aorta above the heart, arching backwards and to the left over the left main bronchus. Three large arteries leave its top: the brachiocephalic trunk, left common carotid and left subclavian.",
  fn: "Distributes blood to the head, neck and arms; pressure sensors in its wall help regulate blood pressure.",
  kid: "The aorta makes a U-turn over your heart like a walking cane.", meta: { Branches: "Brachiocephalic trunk, left common carotid, left subclavian" },
});
A({
  id: "brachiocephalic-trunk", name: "Brachiocephalic Trunk", grp: "Aorta branches", q: 3,
  g: [tube([[0.002, 1.39, 0.022], [-0.012, 1.412, 0.022], [-0.024, 1.432, 0.016]], 0.0062)],
  d: "The first and largest branch of the aortic arch, about 4 cm long, found only on the right.",
  fn: "Divides into the right common carotid artery (to the head) and right subclavian artery (to the arm).",
  kid: kidA, meta: { Divides: "Right common carotid + right subclavian" },
});
A({
  id: "thoracic-aorta", name: "Thoracic Aorta", grp: "Aorta", org: "Aorta", q: 3,
  g: [tube([[0.022, 1.36, -0.034], [0.02, 1.3, -0.04], [0.017, 1.24, -0.042], [0.013, 1.18, -0.038], [0.01, 1.155, -0.034]], 0.0118)],
  d: "The descending aorta in the chest, running down the left side of the vertebral bodies from T4 to the diaphragm.",
  fn: "Gives off intercostal arteries to the chest wall and branches to the oesophagus and bronchi, then passes through the diaphragm at T12.",
  kid: kidA, meta: { Level: "T4–T12" },
});
A({
  id: "abdominal-aorta", name: "Abdominal Aorta", grp: "Aorta", org: "Aorta", q: 2,
  g: [tube([[0.01, 1.155, -0.034], [0.008, 1.11, -0.026], [0.005, 1.05, -0.014], [0.002, 1.0, -0.008], [0.0, 0.99, -0.007]], [0.0105, 0.0095, 0.009, 0.0085, 0.008])],
  d: "The aorta below the diaphragm, lying just in front of the lumbar spine. It divides into the two common iliac arteries at about the level of the navel (L4).",
  fn: "Supplies the gut, liver, spleen, kidneys and adrenals through its major branches. A ballooning of this segment is called an abdominal aortic aneurysm.",
  kid: "You can sometimes feel it beating if you press gently on your tummy.", meta: { Branches: "Coeliac, SMA, renals, IMA, iliacs" },
});
A({
  id: "coronary-arteries", name: "Coronary Arteries", grp: "Heart vessels", q: 2, org: "Heart",
  g: [
    tube([[0.006, 1.31, 0.052], [0.018, 1.305, 0.058], [0.03, 1.28, 0.074], [0.045, 1.245, 0.08], [0.05, 1.225, 0.074]], 0.0022),      // LAD
    tube([[0.018, 1.305, 0.058], [0.03, 1.3, 0.04], [0.042, 1.28, 0.02], [0.044, 1.26, 0.01]], 0.0019),                                // circumflex
    tube([[-0.002, 1.312, 0.054], [-0.02, 1.302, 0.058], [-0.036, 1.28, 0.05], [-0.038, 1.255, 0.03], [-0.02, 1.24, 0.02]], 0.0021),   // RCA
  ],
  d: "The left coronary artery (dividing into the left anterior descending and circumflex branches) and the right coronary artery, running in grooves on the surface of the heart.",
  fn: "Supply the heart muscle with oxygen. A clot blocking one of them causes a heart attack (myocardial infarction).",
  kid: "The heart feeds itself through its own small arteries wrapped around it like a crown.", meta: { Branches: "LAD, circumflex, right coronary" },
});
A({
  id: "pulmonary-trunk", name: "Pulmonary Trunk & Arteries", grp: "Pulmonary circulation", col: "#4A63C8", q: 2, aka: "pulmonary artery",
  g: [
    tube([[0.006, 1.318, 0.062], [0.014, 1.338, 0.052], [0.014, 1.356, 0.03]], 0.0125),
    tube([[0.014, 1.356, 0.03], [0.03, 1.35, 0.01], [0.048, 1.328, -0.006]], 0.0085),
    tube([[0.014, 1.356, 0.03], [-0.006, 1.356, 0.012], [-0.03, 1.345, 0.0], [-0.048, 1.33, -0.004]], 0.0088),
  ],
  d: "The short, wide trunk leaving the right ventricle and its two branches to the lungs. They are the only arteries in the adult body that carry oxygen-poor blood.",
  fn: "Deliver blood from the right heart to the lungs to collect oxygen and unload carbon dioxide.",
  kid: "These arteries are drawn blue because they carry 'used' blood to the lungs.", meta: { Pressure: "About 25/10 mmHg" },
});

/* ---- head & neck (left; mirrored) ---- */
A({
  id: "common-carotid-artery", name: "Common Carotid Artery", grp: "Head & neck", bi: 1, q: 2, lbl: 1,
  g: [tube([[0.022, 1.432, 0.02], [0.024, 1.47, 0.022], [0.026, 1.505, 0.022], [0.027, 1.528, 0.02]], 0.0045)],
  d: "The main artery of the neck, running up beside the trachea and larynx. On the left it rises from the aortic arch, on the right from the brachiocephalic trunk.",
  fn: "Carries blood towards the head. You can feel its pulse beside the windpipe; the carotid sinus at its fork senses blood pressure.",
  kid: "Put two fingers on the side of your neck — that thump is your carotid artery.", meta: { Divides: "Internal and external carotid, at C4" },
});
A({
  id: "internal-carotid-artery", name: "Internal Carotid Artery", grp: "Head & neck", bi: 1, q: 3,
  g: [tube([[0.027, 1.528, 0.018], [0.03, 1.555, 0.008], [0.028, 1.585, 0.004], [0.022, 1.605, 0.008], [0.016, 1.622, 0.012]], 0.0033)],
  d: "The branch of the common carotid that enters the skull through the carotid canal without giving any branches in the neck.",
  fn: "Supplies most of the brain (with the vertebral arteries) and the eye through the ophthalmic artery.",
  kid: kidA, meta: { Supplies: "Brain, eye" },
});
A({
  id: "external-carotid-artery", name: "External Carotid Artery", grp: "Head & neck", bi: 1, q: 3,
  g: [tube([[0.027, 1.528, 0.022], [0.034, 1.548, 0.03], [0.044, 1.575, 0.02], [0.056, 1.6, 0.008], [0.068, 1.635, 0.0]], 0.0028), tube([[0.036, 1.55, 0.03], [0.048, 1.54, 0.055], [0.04, 1.56, 0.07]], 0.0018)],
  d: "The branch of the common carotid that supplies the outside of the head, running up behind the jaw to become the superficial temporal artery at the temple.",
  fn: "Feeds the face, scalp, tongue, jaw and neck through branches such as the facial, lingual and maxillary arteries.",
  kid: "You can feel this artery's pulse at your temple.", meta: { Branches: "Facial, lingual, maxillary, superficial temporal, occipital" },
});
A({
  id: "vertebral-artery", name: "Vertebral Artery", grp: "Head & neck", bi: 1, q: 3,
  g: [tube([[0.036, 1.435, 0.0], [0.026, 1.47, -0.012], [0.022, 1.52, -0.016], [0.022, 1.575, -0.018], [0.014, 1.59, -0.03], [0.004, 1.608, -0.024]], 0.0022)],
  d: "Rises from the subclavian artery and climbs through holes in the cervical vertebrae, entering the skull through the foramen magnum.",
  fn: "Joins its partner to form the basilar artery, which supplies the brainstem, cerebellum and back of the brain.",
  kid: kidA, meta: { Joins: "Basilar artery" },
});
A({
  id: "circle-of-willis", name: "Basilar Artery & Circle of Willis", grp: "Head & neck", q: 3,
  g: [tube([[0, 1.608, -0.024], [0, 1.622, -0.016], [0, 1.632, -0.008]], 0.0018), tube([[0, 1.632, -0.008], [0.01, 1.632, -0.004], [0.014, 1.63, 0.006], [0.008, 1.63, 0.018], [0, 1.63, 0.02], [-0.008, 1.63, 0.018], [-0.014, 1.63, 0.006], [-0.01, 1.632, -0.004], [0, 1.632, -0.008]], 0.0013, { cl: 1 })],
  d: "A ring of arteries under the brain that joins the two internal carotid systems with the basilar artery.",
  fn: "Provides back-up routes so that if one artery narrows, blood can reach the brain another way.",
  kid: "A ring of arteries under your brain works like a roundabout for blood.", meta: { Named: "After Thomas Willis, 1664" },
});

/* ---- upper limb (left; mirrored) ---- */
A({
  id: "subclavian-artery", name: "Subclavian Artery", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.032, 1.432, 0.003], [0.055, 1.448, 0.004], [0.09, 1.448, 0.0], [0.12, 1.432, -0.006]], 0.005)],
  d: "Arches over the first rib behind the collarbone. On the left it comes directly from the aortic arch; on the right from the brachiocephalic trunk.",
  fn: "Supplies the arm, and gives off the vertebral and internal thoracic arteries.",
  kid: kidA, meta: { Becomes: "Axillary artery at the first rib" },
});
A({
  id: "axillary-artery", name: "Axillary Artery", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.12, 1.432, -0.006], [0.145, 1.405, -0.01], [0.168, 1.37, -0.016], [0.182, 1.345, -0.02]], 0.0045)],
  d: "Continues the subclavian artery through the armpit, surrounded by the cords of the brachial plexus.",
  fn: "Supplies the shoulder, chest wall and armpit.",
  kid: kidA, meta: { Becomes: "Brachial artery at teres major" },
});
A({
  id: "brachial-artery", name: "Brachial Artery", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.182, 1.345, -0.02], [0.195, 1.28, -0.02], [0.21, 1.2, -0.018], [0.225, 1.13, -0.012], [0.232, 1.105, -0.008]], 0.0038)],
  d: "The main artery of the upper arm, running down its inner side beside the median nerve to the front of the elbow.",
  fn: "Supplies the arm; it is the artery squeezed by a blood-pressure cuff and listened to with a stethoscope.",
  kid: "When a nurse measures your blood pressure, they squeeze this artery.", meta: { Divides: "Radial and ulnar arteries at the elbow" },
});
A({
  id: "radial-artery", name: "Radial Artery", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.232, 1.105, -0.008], [0.245, 1.05, 0.0], [0.268, 0.95, 0.01], [0.29, 0.875, 0.018], [0.306, 0.858, 0.022]], 0.0024)],
  d: "Runs down the thumb side of the forearm to the wrist, where it lies just under the skin.",
  fn: "Supplies the forearm and hand; it is where you usually feel your pulse at the wrist.",
  kid: "Feel your pulse on the thumb side of your wrist — that's the radial artery.", meta: { Pulse: "Radial pulse" },
});
A({
  id: "ulnar-artery", name: "Ulnar Artery", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.232, 1.105, -0.008], [0.232, 1.05, -0.006], [0.25, 0.95, -0.006], [0.27, 0.87, 0.004], [0.278, 0.855, 0.01]], 0.0024)],
  d: "The larger of the two forearm arteries, running down the little-finger side.",
  fn: "Supplies the forearm and most of the hand through the superficial palmar arch.",
  kid: kidA, meta: { Forms: "Superficial palmar arch" },
});
A({
  id: "palmar-arches", name: "Palmar Arches", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([H(-0.015, 0.012, 0.012), H(-0.012, 0.045, 0.012), H(0.0, 0.055, 0.012), H(0.012, 0.05, 0.012), H(0.02, 0.03, 0.01)], 0.0014),
      ...[-0.018, -0.008, 0.002, 0.012].map((u) => tube([H(u * 0.9, 0.052, 0.011), H(u, 0.09, 0.008), H(u * 1.1, 0.14, 0.006)], 0.0008, { rs: 6 }))],
  d: "Two arterial loops in the palm formed by the radial and ulnar arteries, giving off digital arteries along each finger.",
  fn: "Supply the hand with a double blood supply so it stays pink even if one artery is blocked.",
  kid: kidA, meta: { Loops: "Superficial and deep palmar arches" },
});

/* ---- abdomen ---- */
A({
  id: "celiac-trunk", name: "Coeliac Trunk", grp: "Abdominal branches", q: 3, aka: "celiac",
  g: [tube([[0.008, 1.14, -0.024], [0.008, 1.14, -0.01]], 0.0035),
      tube([[0.008, 1.14, -0.01], [-0.012, 1.138, 0.0], [-0.028, 1.14, 0.012]], 0.0022),
      tube([[0.008, 1.14, -0.01], [0.03, 1.142, -0.018], [0.055, 1.148, -0.012], [0.075, 1.15, -0.03], [0.09, 1.15, -0.034]], 0.0022),
      tube([[0.008, 1.14, -0.01], [0.02, 1.16, 0.0], [0.035, 1.178, 0.01]], 0.0016)],
  d: "A short, wide artery from the front of the aorta just below the diaphragm that splits into the left gastric, common hepatic and splenic arteries.",
  fn: "Supplies the stomach, liver, gallbladder, pancreas, spleen and the first part of the duodenum.",
  kid: kidA, meta: { Level: "T12" },
});
A({
  id: "superior-mesenteric-artery", name: "Superior Mesenteric Artery", grp: "Abdominal branches", q: 3, aka: "SMA",
  g: [tube([[0.006, 1.122, -0.02], [0.005, 1.1, 0.0], [0.002, 1.05, 0.02], [-0.01, 1.0, 0.03], [-0.03, 0.965, 0.03]], 0.003),
      ...[1.07, 1.04, 1.01].map((y) => tube([[0.003, y, 0.018], [0.03, y - 0.01, 0.04], [0.05, y - 0.02, 0.045]], 0.0012, { rs: 6 }))],
  d: "Arises from the aorta just below the coeliac trunk and fans out through the mesentery.",
  fn: "Supplies the small intestine, the caecum, the ascending colon and most of the transverse colon — the midgut.",
  kid: kidA, meta: { Level: "L1" },
});
A({
  id: "inferior-mesenteric-artery", name: "Inferior Mesenteric Artery", grp: "Abdominal branches", q: 3, aka: "IMA",
  g: [tube([[0.004, 1.02, -0.01], [0.02, 1.0, 0.0], [0.045, 0.98, 0.004], [0.07, 0.96, 0.004]], 0.0022)],
  d: "The smallest of the three gut arteries, arising from the aorta at L3.",
  fn: "Supplies the left third of the transverse colon, the descending and sigmoid colon, and the upper rectum — the hindgut.",
  kid: kidA, meta: { Level: "L3" },
});
A({
  id: "renal-artery", name: "Renal Artery", grp: "Abdominal branches", bi: 1, q: 2,
  g: [tube([[0.007, 1.105, -0.024], [0.02, 1.102, -0.032], [0.032, 1.1, -0.038]], 0.0032)],
  d: "Short, wide arteries from the sides of the aorta to each kidney. The right one passes behind the inferior vena cava.",
  fn: "Deliver about a fifth of the heart's output to the kidneys to be filtered.",
  kid: "About a litre of blood flows into your kidneys every minute.", meta: { Flow: "About 20% of cardiac output" },
});

/* ---- pelvis & lower limb (left; mirrored) ---- */
A({
  id: "common-iliac-artery", name: "Common Iliac Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.0, 0.99, -0.007], [0.022, 0.97, -0.004], [0.04, 0.948, 0.0]], 0.0062)],
  d: "One of the two terminal branches of the aorta, about 4 cm long.",
  fn: "Divides into the internal iliac artery (pelvis) and external iliac artery (leg).",
  kid: kidA, meta: { Level: "L4 to the sacroiliac joint" },
});
A({
  id: "internal-iliac-artery", name: "Internal Iliac Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.04, 0.948, 0.0], [0.044, 0.925, -0.018], [0.04, 0.905, -0.03]], 0.0036), tube([[0.043, 0.92, -0.02], [0.03, 0.9, 0.005], [0.02, 0.89, 0.02]], 0.0016)],
  d: "The branch of the common iliac that dips into the pelvis.",
  fn: "Supplies the bladder, rectum, reproductive organs, buttock muscles and pelvic floor.",
  kid: kidA, meta: { Supplies: "Pelvic organs, gluteal region" },
});
A({
  id: "external-iliac-artery", name: "External Iliac Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.04, 0.948, 0.0], [0.055, 0.93, 0.018], [0.07, 0.905, 0.038], [0.078, 0.888, 0.048]], 0.0048)],
  d: "Runs along the brim of the pelvis and under the inguinal ligament, where it becomes the femoral artery.",
  fn: "Carries blood to the leg.",
  kid: kidA, meta: { Becomes: "Femoral artery at the inguinal ligament" },
});
A({
  id: "femoral-artery", name: "Femoral Artery", grp: "Lower limb", bi: 1, q: 2, lbl: 1,
  g: [tube([[0.078, 0.888, 0.048], [0.082, 0.82, 0.05], [0.088, 0.73, 0.036], [0.088, 0.64, 0.01], [0.084, 0.58, -0.012]], 0.0045)],
  d: "The main artery of the thigh. Just below the groin crease it lies close to the surface, where its pulse is easy to feel.",
  fn: "Supplies the thigh through the deep femoral artery and continues down as the popliteal artery. Doctors often use it to thread catheters up to the heart.",
  kid: "The big artery in your thigh carries blood down to your leg and foot.", meta: { Pulse: "Femoral pulse in the groin" },
});
A({
  id: "popliteal-artery", name: "Popliteal Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.084, 0.58, -0.012], [0.086, 0.53, -0.024], [0.09, 0.48, -0.026], [0.094, 0.455, -0.022]], 0.004)],
  d: "The deepest structure behind the knee, continuing the femoral artery.",
  fn: "Supplies the knee joint and divides into the anterior and posterior tibial arteries.",
  kid: kidA, meta: { Divides: "Anterior and posterior tibial arteries" },
});
A({
  id: "anterior-tibial-artery", name: "Anterior Tibial Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.094, 0.455, -0.02], [0.104, 0.44, -0.004], [0.104, 0.3, 0.004], [0.096, 0.13, 0.012], [0.09, 0.09, 0.02]], 0.0025),
      tube([F(-0.004, 0.07, 0.02), F(-0.01, 0.055, 0.06), F(-0.016, 0.035, 0.1)], 0.0018)],
  d: "Passes forward between the tibia and fibula and runs down the front of the leg; on the top of the foot it becomes the dorsalis pedis artery.",
  fn: "Supplies the muscles that lift the foot and toes. The dorsalis pedis pulse on top of the foot is checked in people with poor circulation.",
  kid: kidA, meta: { Continues: "Dorsalis pedis artery" },
});
A({
  id: "posterior-tibial-artery", name: "Posterior Tibial Artery", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.094, 0.455, -0.024], [0.088, 0.4, -0.034], [0.082, 0.25, -0.03], [0.074, 0.12, -0.022], [0.068, 0.07, -0.02]], 0.0028),
      tube([F(-0.02, 0.06, -0.01), F(-0.012, 0.02, 0.03), F(0.0, 0.015, 0.09)], 0.0018)],
  d: "Runs down the back of the calf and behind the inner ankle bone into the sole, where it splits into the plantar arteries.",
  fn: "Supplies the calf muscles and the sole of the foot.",
  kid: kidA, meta: { Pulse: "Behind the medial malleolus" },
});
A({
  id: "fibular-artery", name: "Fibular Artery", grp: "Lower limb", bi: 1, q: 3, aka: "peroneal",
  g: [tube([[0.09, 0.42, -0.03], [0.104, 0.3, -0.03], [0.108, 0.15, -0.028], [0.108, 0.09, -0.026]], 0.0018)],
  d: "A branch of the posterior tibial artery running close to the fibula.",
  fn: "Supplies the muscles on the outer side of the leg and the ankle.",
  kid: kidA, meta: { From: "Posterior tibial artery" },
});

/* =====================================================================
   VEINS
   ===================================================================== */
Vn({
  id: "superior-vena-cava", name: "Superior Vena Cava", grp: "Venae cavae", q: 2, aka: "SVC",
  g: [tube([[-0.022, 1.395, 0.034], [-0.025, 1.36, 0.034], [-0.027, 1.325, 0.03]], 0.0095)],
  d: "A large vein about 7 cm long formed behind the right side of the sternum by the joining of the two brachiocephalic veins.",
  fn: "Returns blood from the head, neck, arms and chest to the right atrium.",
  kid: kidV, meta: { Diameter: "About 2 cm" },
});
Vn({
  id: "inferior-vena-cava", name: "Inferior Vena Cava", grp: "Venae cavae", q: 2, lbl: 1, aka: "IVC",
  g: [tube([[-0.02, 0.985, -0.004], [-0.022, 1.04, -0.012], [-0.024, 1.1, -0.018], [-0.028, 1.16, -0.012], [-0.028, 1.22, 0.004], [-0.027, 1.27, 0.022]], 0.011)],
  d: "The largest vein in the body, running up the right side of the lumbar spine and through the liver and diaphragm to the right atrium.",
  fn: "Returns all the blood from the legs, pelvis and abdomen to the heart.",
  kid: "Your biggest vein carries blood from your legs and tummy back to your heart.", meta: { Diameter: "Up to 3 cm" },
});
Vn({
  id: "brachiocephalic-vein", name: "Brachiocephalic Vein", grp: "Head & neck", q: 3,
  g: [tube([[0.036, 1.438, 0.022], [0.012, 1.425, 0.036], [-0.012, 1.41, 0.038], [-0.022, 1.395, 0.034]], 0.0062), tube([[-0.036, 1.438, 0.022], [-0.03, 1.415, 0.03], [-0.022, 1.395, 0.034]], 0.0065)],
  d: "The left and right brachiocephalic veins, formed behind each sternoclavicular joint where the internal jugular meets the subclavian vein. The left one is longer and crosses in front of the aortic branches.",
  fn: "Collect blood from the head, neck and arms and join to form the superior vena cava.",
  kid: kidV, meta: { Joins: "Superior vena cava" },
});
Vn({
  id: "internal-jugular-vein", name: "Internal Jugular Vein", grp: "Head & neck", bi: 1, q: 2,
  g: [tube([[0.036, 1.438, 0.022], [0.036, 1.48, 0.026], [0.037, 1.525, 0.022], [0.042, 1.565, 0.0], [0.045, 1.59, -0.018]], 0.0055)],
  d: "The main vein of the neck, running in the carotid sheath beside the carotid artery, from the base of the skull to behind the collarbone.",
  fn: "Drains blood from the brain, face and neck. Doctors use it to place central lines.",
  kid: kidV, meta: { Drains: "Brain (via dural sinuses), face, neck" },
});
Vn({
  id: "external-jugular-vein", name: "External Jugular Vein", grp: "Head & neck", bi: 1, q: 3,
  g: [tube([[0.058, 1.575, 0.0], [0.058, 1.53, 0.012], [0.056, 1.48, 0.02], [0.056, 1.448, 0.02]], 0.0025)],
  d: "A superficial vein crossing the sternocleidomastoid muscle; it stands out when you strain or shout.",
  fn: "Drains the scalp and face into the subclavian vein.",
  kid: "When you shout, you might see this vein bulge on your neck.", meta: { Drains: "Scalp and face" },
});
Vn({
  id: "subclavian-vein", name: "Subclavian Vein", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.125, 1.43, 0.004], [0.09, 1.442, 0.012], [0.058, 1.442, 0.018], [0.036, 1.438, 0.022]], 0.005)],
  d: "Continues the axillary vein over the first rib, in front of the subclavian artery.",
  fn: "Returns blood from the arm; the thoracic duct empties lymph into the left one.",
  kid: kidV, meta: { Joins: "Internal jugular → brachiocephalic vein" },
});
Vn({
  id: "axillary-vein", name: "Axillary Vein", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([[0.19, 1.3, -0.016], [0.17, 1.365, -0.008], [0.148, 1.405, -0.002], [0.125, 1.43, 0.004]], 0.0045)],
  d: "The large vein of the armpit, formed by the basilic and brachial veins.",
  fn: "Drains the arm, armpit and upper chest wall.",
  kid: kidV, meta: { Becomes: "Subclavian vein" },
});
Vn({
  id: "cephalic-vein", name: "Cephalic Vein", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([H(0.018, 0.02, -0.004), [0.305, 0.9, 0.016], [0.285, 1.0, 0.012], [0.262, 1.1, 0.012], [0.232, 1.22, 0.014], [0.2, 1.33, 0.016], [0.165, 1.41, 0.032], [0.145, 1.425, 0.012], [0.128, 1.43, 0.004]], 0.0024)],
  d: "A superficial vein running up the thumb side of the forearm and outer arm, then through the groove between the deltoid and pectoralis major.",
  fn: "Drains the lateral hand and arm into the axillary vein; a common site for drips.",
  kid: kidV, meta: { Type: "Superficial vein" },
});
Vn({
  id: "basilic-vein", name: "Basilic Vein", grp: "Upper limb", bi: 1, q: 3,
  g: [tube([H(-0.018, 0.02, -0.004), [0.268, 0.9, -0.012], [0.25, 1.0, -0.012], [0.228, 1.1, -0.014], [0.21, 1.2, -0.024], [0.195, 1.29, -0.018]], 0.0024)],
  d: "A superficial vein on the little-finger side of the forearm that dives deep halfway up the arm.",
  fn: "Drains the medial hand and forearm into the axillary vein.",
  kid: kidV, meta: { Type: "Superficial vein" },
});
Vn({
  id: "median-cubital-vein", name: "Median Cubital Vein", grp: "Upper limb", bi: 1, q: 2,
  g: [tube([[0.272, 1.075, 0.014], [0.25, 1.1, 0.008], [0.232, 1.115, -0.01]], 0.0026)],
  d: "The short diagonal vein in the crook of the elbow linking the cephalic and basilic veins.",
  fn: "The favourite vein for taking blood samples — most of the lab tests in a blood report start here.",
  kid: "When you have a blood test, the needle usually goes into this vein at your elbow.", meta: { Use: "Venepuncture (blood draws)" },
});
Vn({
  id: "pulmonary-veins", name: "Pulmonary Veins", grp: "Pulmonary circulation", col: "#C8323B", q: 2,
  g: [tube([[0.05, 1.33, -0.014], [0.03, 1.322, -0.004], [0.016, 1.318, 0.0]], 0.0045), tube([[0.05, 1.29, -0.014], [0.032, 1.3, -0.006], [0.018, 1.31, 0.0]], 0.0045),
      tube([[-0.05, 1.325, -0.01], [-0.026, 1.32, -0.004], [0.004, 1.316, 0.0]], 0.0045), tube([[-0.05, 1.29, -0.012], [-0.026, 1.3, -0.006], [0.004, 1.31, 0.0]], 0.0045)],
  d: "Four veins, two from each lung, entering the back of the left atrium. They are the only veins that carry oxygen-rich blood.",
  fn: "Return freshly oxygenated blood from the lungs to the left side of the heart.",
  kid: "These veins are red because they carry fresh, oxygen-filled blood from the lungs.", meta: { Count: "4 (2 per lung)" },
});
Vn({
  id: "hepatic-portal-vein", name: "Hepatic Portal Vein", grp: "Abdominal veins", q: 2, aka: "portal vein",
  g: [tube([[0.0, 1.075, 0.012], [-0.012, 1.1, 0.018], [-0.024, 1.125, 0.022], [-0.034, 1.138, 0.02]], 0.0058),
      tube([[0.09, 1.14, -0.03], [0.06, 1.12, -0.02], [0.03, 1.09, -0.004], [0.0, 1.075, 0.012]], 0.0036),
      tube([[-0.02, 0.97, 0.03], [-0.008, 1.02, 0.024], [0.0, 1.075, 0.012]], 0.0036)],
  d: "A vein about 8 cm long formed behind the pancreas by the splenic and superior mesenteric veins, with its branches.",
  fn: "Carries nutrient-rich blood from the gut and spleen to the liver to be processed before it reaches the rest of the body.",
  kid: "Blood from your gut goes to the liver first, to be checked and cleaned.", meta: { Tributaries: "Splenic, superior and inferior mesenteric veins" },
});
Vn({
  id: "hepatic-veins", name: "Hepatic Veins", grp: "Abdominal veins", q: 3,
  g: [tube([[-0.07, 1.18, 0.01], [-0.045, 1.2, 0.008], [-0.028, 1.21, 0.004]], 0.004), tube([[0.01, 1.19, 0.02], [-0.012, 1.205, 0.01], [-0.028, 1.212, 0.004]], 0.0035)],
  d: "Three short veins that drain the liver straight into the inferior vena cava just below the diaphragm.",
  fn: "Return blood that has passed through the liver to the heart.",
  kid: kidV, meta: { Count: "Right, middle and left" },
});
Vn({
  id: "renal-vein", name: "Renal Vein", grp: "Abdominal veins", bi: 1, q: 3,
  g: [tube([[0.034, 1.095, -0.034], [0.012, 1.097, -0.018], [-0.018, 1.1, -0.016]], 0.0038)],
  d: "Drains each kidney into the inferior vena cava; the left one is longer and crosses in front of the aorta.",
  fn: "Returns filtered blood from the kidneys.",
  kid: kidV, meta: { Joins: "Inferior vena cava" },
});
Vn({
  id: "azygos-vein", name: "Azygos Vein", grp: "Thoracic veins", q: 3,
  g: [tube([[-0.012, 1.14, -0.04], [-0.012, 1.22, -0.05], [-0.012, 1.3, -0.052], [-0.016, 1.355, -0.036], [-0.024, 1.365, -0.01], [-0.026, 1.36, 0.02]], 0.0035)],
  d: "An unpaired vein running up the right side of the vertebral bodies and arching over the right lung root into the superior vena cava.",
  fn: "Drains the back of the chest wall and provides a bypass between the two venae cavae.",
  kid: kidV, meta: { Joins: "Superior vena cava" },
});
Vn({
  id: "common-iliac-vein", name: "Common Iliac Vein", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.04, 0.945, -0.006], [0.02, 0.968, -0.008], [-0.02, 0.985, -0.004]], 0.0068)],
  d: "Formed in the pelvis by the external and internal iliac veins; the two unite to form the inferior vena cava at L5.",
  fn: "Drains the leg and pelvis.",
  kid: kidV, meta: { Joins: "Inferior vena cava" },
});
Vn({
  id: "external-iliac-vein", name: "External Iliac Vein", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.072, 0.888, 0.044], [0.062, 0.905, 0.03], [0.05, 0.925, 0.012], [0.04, 0.945, -0.006]], 0.0055)],
  d: "Continues the femoral vein above the inguinal ligament, running along the pelvic brim.",
  fn: "Returns blood from the leg.",
  kid: kidV, meta: { Joins: "Common iliac vein" },
});
Vn({
  id: "femoral-vein", name: "Femoral Vein", grp: "Lower limb", bi: 1, q: 2,
  g: [tube([[0.08, 0.58, -0.02], [0.08, 0.64, 0.004], [0.08, 0.73, 0.03], [0.074, 0.82, 0.044], [0.072, 0.888, 0.044]], 0.0055)],
  d: "The main deep vein of the thigh, lying just inside the femoral artery in the groin.",
  fn: "Returns blood from the leg. Clots here (deep vein thrombosis) can break off and travel to the lungs.",
  kid: kidV, meta: { Receives: "Great saphenous vein" },
});
Vn({
  id: "popliteal-vein", name: "Popliteal Vein", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([[0.098, 0.45, -0.03], [0.092, 0.48, -0.032], [0.086, 0.53, -0.03], [0.08, 0.58, -0.02]], 0.0045)],
  d: "Runs up behind the knee alongside the popliteal artery.",
  fn: "Drains the lower leg and receives the small saphenous vein.",
  kid: kidV, meta: { Becomes: "Femoral vein" },
});
Vn({
  id: "great-saphenous-vein", name: "Great Saphenous Vein", grp: "Lower limb", bi: 1, q: 2,
  g: [tube([F(-0.03, 0.04, 0.06), [0.064, 0.09, 0.02], [0.066, 0.2, 0.008], [0.068, 0.35, -0.004], [0.066, 0.5, -0.018], [0.07, 0.62, -0.006], [0.074, 0.74, 0.03], [0.074, 0.84, 0.052], [0.074, 0.868, 0.048]], 0.0026)],
  d: "The longest vein in the body, running just under the skin from the inner side of the foot up the inside of the leg and thigh to the groin.",
  fn: "Drains the skin of the leg into the femoral vein. It is the vein most often affected by varicose veins and is used for heart-bypass grafts.",
  kid: "The longest vein in your body runs from your ankle to your groin.", meta: { Length: "Up to about 1 m" },
});
Vn({
  id: "small-saphenous-vein", name: "Small Saphenous Vein", grp: "Lower limb", bi: 1, q: 3,
  g: [tube([F(0.03, 0.03, -0.02), [0.112, 0.1, -0.04], [0.104, 0.2, -0.056], [0.096, 0.33, -0.058], [0.094, 0.45, -0.036]], 0.0022)],
  d: "A superficial vein running from behind the outer ankle up the middle of the calf.",
  fn: "Drains the outer foot and back of the calf into the popliteal vein.",
  kid: kidV, meta: { Joins: "Popliteal vein" },
});
Vn({
  id: "coronary-sinus", name: "Coronary Sinus & Cardiac Veins", grp: "Heart vessels", org: "Heart", q: 3,
  g: [tube([[0.052, 1.23, 0.07], [0.042, 1.26, 0.085], [0.032, 1.29, 0.066], [0.036, 1.3, 0.036], [0.02, 1.285, 0.01], [-0.012, 1.282, 0.012]], 0.0022)],
  d: "The great cardiac vein climbs beside the LAD artery and curls round the back of the heart into the coronary sinus, which opens into the right atrium.",
  fn: "Drains used blood from the heart muscle itself.",
  kid: kidV, meta: { Opens: "Right atrium" },
});

export default parts;
