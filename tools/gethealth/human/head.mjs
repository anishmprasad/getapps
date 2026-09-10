/**
 * Head & neck soft anatomy: brain, eyes, ears, mouth and teeth, throat,
 * larynx and the neck glands.
 */
import { add, mul, ell, tube, sdf, S, both, makePart } from "../lib.mjs";
import { SKULL, canalAt } from "./rig.mjs";

const parts = [];
const P = (p) => parts.push(makePart(p));
const K = 0.0015;
const Sub = (p) => ({ ...p, o: "s", k: p.k ?? 0.003 });
const I = (c, n) => S.pl(c, n, { o: "i", k: K });

/* =====================================================================
   BRAIN — each hemisphere carved into its four lobes
   ===================================================================== */
const hemisphere = () => [
  S.ell([0.031, 1.676, -0.008], [0.0305, 0.056, 0.079]),
  S.ell([0.043, 1.634, 0.004], [0.021, 0.024, 0.047]),        // temporal pole bulge
  S.ell([0.03, 1.672, 0.042], [0.027, 0.045, 0.032]),          // frontal pole
  I([0.0022, 0, 0], [-1, 0, 0]),                                // longitudinal fissure
  Sub(S.ell([0, 1.611, -0.062], [0.05, 0.027, 0.036], { k: 0.004 })), // room for the cerebellum
  Sub(S.ell([0, 1.63, -0.02], [0.016, 0.03, 0.03], { k: 0.004 })),    // brainstem
];
const central = [[0, 1.73, -0.012], [0, -0.4267, -1]];          // anterior side = frontal lobe
const lobe = (...regions) => sdf([...hemisphere(), ...regions], { k: 0.006, cell: 0.0019, n: 0.0017, nf: 190 });
const temporalRegion = S.ell([0.046, 1.628, 0.0], [0.034, 0.028, 0.058]);
const occBoundary = [[0, 1.7, -0.062], [0, -0.3, 1]];           // posterior side = occipital lobe
const LOBES = [
  ["frontal-lobe", "Frontal Lobe", [S.pl(central[0], central[1], { o: "i", k: K }), Sub({ ...temporalRegion, k: K })],
    "The largest lobe, at the front of each hemisphere, ending at the central sulcus. It contains the primary motor cortex and, on the left side in most people, Broca's speech area.",
    "Plans and controls voluntary movement, decision-making, attention, personality, impulse control and the production of speech.",
    "This is your brain's control room — it helps you make plans and choices.", 1],
  ["parietal-lobe", "Parietal Lobe", [S.pl(central[0], mul(central[1], -1), { o: "i", k: K }), S.pl(occBoundary[0], mul(occBoundary[1], -1), { o: "i", k: K }), Sub({ ...temporalRegion, k: K })],
    "The lobe behind the central sulcus, at the top and back of each hemisphere. Its front strip is the primary somatosensory cortex.",
    "Processes touch, temperature, pain and body position, and combines senses to judge space, size and direction.",
    "It tells you where your body is — that's how you can touch your nose with your eyes closed.", 2],
  ["temporal-lobe", "Temporal Lobe", [{ ...temporalRegion, o: "i", k: K }],
    "The lobe on the side of each hemisphere, below the lateral sulcus, next to the ear. Its inner surface holds the hippocampus and amygdala.",
    "Hearing, understanding language (Wernicke's area on the dominant side), recognising faces and objects, and forming new memories.",
    "The part near your ears helps you hear and remember things.", 2],
  ["occipital-lobe", "Occipital Lobe", [S.pl(occBoundary[0], occBoundary[1], { o: "i", k: K }), Sub({ ...temporalRegion, k: K })],
    "The rearmost lobe of each hemisphere, sitting on the tentorium above the cerebellum.",
    "Home of the primary visual cortex: it turns signals from the eyes into images, colour and motion.",
    "You see with the back of your brain! Signals travel all the way from your eyes to here.", 2],
];
for (const [id, name, regions, d, fn, kid, q] of LOBES) {
  P({ id, name, sys: "nervous", grp: "Brain", org: "Brain", bi: 1, mat: "brain", q, lbl: id === "frontal-lobe" ? 1 : 0, g: [lobe(...regions)], d, fn, kid, meta: { Part: "Cerebral cortex (grey matter) over white matter" } });
}
P({
  id: "cerebellum", name: "Cerebellum", sys: "nervous", grp: "Brain", org: "Brain", mat: "brain", q: 2, lbl: 1,
  g: [sdf([S.ell([0, 1.611, -0.062], [0.048, 0.024, 0.033]), I([0, 1.64, 0], [0, 1, 0])], { k: 0.004, cell: 0.0016, n: 0.0008, nf: 420 })],
  d: "The 'little brain' tucked under the occipital lobes. Its tightly folded surface holds more than half of all the neurons in the brain.",
  fn: "Coordinates movement, balance, posture and timing, and fine-tunes skills learned by practice — from walking to playing an instrument.",
  kid: "This part helps you balance on a bike and catch a ball.",
  meta: { Weight: "About 150 g" },
});
P({
  id: "midbrain", name: "Midbrain", sys: "nervous", grp: "Brainstem", org: "Brain", mat: "brain", q: 3,
  g: [ell([0, 1.638, -0.021], [0.012, 0.009, 0.011])],
  d: "The top section of the brainstem, between the forebrain and the pons.",
  fn: "Relays visual and auditory reflexes, controls eye movement and pupil size, and contains the substantia nigra, whose dopamine neurons are lost in Parkinson's disease.",
  kid: "Deep in your brain, this part makes your eyes follow a moving ball.", meta: { Part: "Brainstem" },
});
P({
  id: "pons", name: "Pons", sys: "nervous", grp: "Brainstem", org: "Brain", mat: "brain", q: 3,
  g: [ell([0, 1.622, -0.017], [0.014, 0.011, 0.012])],
  d: "The bulging bridge of the brainstem in front of the cerebellum.",
  fn: "Carries signals between the cerebrum and cerebellum, helps regulate breathing rhythm and sleep, and is the origin of several cranial nerves.",
  kid: "The pons is a bridge that carries messages across your brain.", meta: { Part: "Brainstem" },
});
P({
  id: "medulla-oblongata", name: "Medulla Oblongata", sys: "nervous", grp: "Brainstem", org: "Brain", mat: "brain", q: 2,
  g: [tube([[0, 1.612, -0.022], [0, 1.598, -0.027], [0, 1.584, -0.031]], [0.009, 0.0078, 0.0068])],
  d: "The lowest part of the brainstem, continuous with the spinal cord at the foramen magnum.",
  fn: "Runs the automatic life-support centres: heart rate, blood pressure, breathing, swallowing, coughing and vomiting.",
  kid: "This part keeps your heart beating and your lungs breathing, even while you sleep.", meta: { Part: "Brainstem" },
});
P({
  id: "thalamus", name: "Thalamus", sys: "nervous", grp: "Brain", org: "Brain", bi: 1, mat: "brain", q: 3,
  g: [ell([0.0085, 1.655, -0.012], [0.0085, 0.008, 0.014])],
  d: "A walnut-sized mass of grey matter deep in each hemisphere, on either side of the third ventricle.",
  fn: "The relay station for almost every sense (except smell) on its way to the cortex; also involved in alertness and sleep.",
  kid: "It's like a post office that sorts messages from your senses.", meta: { Part: "Diencephalon" },
});
P({
  id: "hypothalamus", name: "Hypothalamus", sys: "endocrine", grp: "Brain", org: "Brain", mat: "gland", q: 2,
  g: [ell([0, 1.636, 0.0], [0.0065, 0.005, 0.007])],
  d: "An almond-sized region below the thalamus that links the nervous system to the endocrine system through the pituitary gland.",
  fn: "Keeps the body in balance: body temperature, hunger, thirst, sleep cycles and the release of hormones that control growth, stress, reproduction and the thyroid.",
  kid: "It's your body's thermostat — it tells you when you're hungry, thirsty or too hot.", meta: { Part: "Diencephalon" },
});
P({
  id: "pituitary-gland", name: "Pituitary Gland", sys: "endocrine", grp: "Brain", mat: "gland", q: 2, lbl: 1,
  g: [ell([0, 1.613, 0.01], [0.0065, 0.0045, 0.0055]), tube([[0, 1.628, 0.004], [0, 1.618, 0.008]], 0.0015)],
  d: "The pea-sized 'master gland' hanging from the hypothalamus in a saddle of the sphenoid bone.",
  fn: "Releases growth hormone, TSH, ACTH, prolactin, FSH and LH, which in turn control the thyroid, adrenals and gonads; its back lobe releases ADH and oxytocin.",
  kid: "This tiny gland is the boss of many other glands in your body.",
  meta: { Size: "About 1 cm, 0.5 g", Hormones: "GH, TSH, ACTH, PRL, FSH, LH, ADH, oxytocin" },
});
P({
  id: "pineal-gland", name: "Pineal Gland", sys: "endocrine", grp: "Brain", mat: "gland", q: 3,
  g: [ell([0, 1.648, -0.03], [0.003, 0.0025, 0.004])],
  d: "A tiny pine-cone-shaped gland at the back of the third ventricle.",
  fn: "Secretes melatonin in darkness, helping to set the body's day–night (circadian) rhythm.",
  kid: "This gland makes a sleepy hormone when it gets dark.", meta: { Hormone: "Melatonin" },
});
P({
  id: "corpus-callosum", name: "Corpus Callosum", sys: "nervous", grp: "Brain", org: "Brain", mat: "brain", col: "#F1DCD4", q: 3,
  g: [tube([[0, 1.655, 0.035], [0, 1.672, 0.012], [0, 1.674, -0.012], [0, 1.664, -0.036]], [0.004, 0.0035, 0.0035, 0.005], { fa: 0.5, up: [1, 0, 0] })],
  d: "A thick band of about 200 million nerve fibres joining the left and right cerebral hemispheres.",
  fn: "Lets the two halves of the brain share information so they work as one.",
  kid: "It's a bridge of wires connecting the two halves of your brain.", meta: { Tissue: "White matter" },
});
P({
  id: "hippocampus", name: "Hippocampus", sys: "nervous", grp: "Brain", org: "Brain", bi: 1, mat: "brain", q: 3,
  g: [tube([[0.022, 1.628, 0.012], [0.025, 1.626, -0.006], [0.021, 1.632, -0.024], [0.014, 1.643, -0.032]], [0.004, 0.0038, 0.003, 0.0022])],
  d: "A seahorse-shaped structure curled inside the temporal lobe.",
  fn: "Converts short-term experiences into long-term memories and builds mental maps for navigation. It is one of the first regions affected in Alzheimer's disease.",
  kid: "Shaped like a seahorse, it helps you remember what you did today.", meta: { Part: "Limbic system" },
});
P({
  id: "amygdala", name: "Amygdala", sys: "nervous", grp: "Brain", org: "Brain", bi: 1, mat: "brain", q: 3,
  g: [ell([0.022, 1.628, 0.017], [0.0045, 0.0045, 0.0045])],
  d: "An almond-shaped cluster of neurons at the front of the hippocampus.",
  fn: "Detects threats and drives fear, anger and the fight-or-flight response; also tags memories with emotion.",
  kid: "This almond-shaped part makes you jump when something scares you.", meta: { Part: "Limbic system" },
});
P({
  id: "olfactory-bulb", name: "Olfactory Bulb", sys: "nervous", grp: "Cranial nerves", bi: 1, q: 3,
  g: [tube([[0.006, 1.624, 0.064], [0.006, 1.625, 0.048], [0.008, 1.63, 0.03]], [0.0024, 0.0017, 0.0012])],
  d: "The swelling at the front end of each olfactory tract (cranial nerve I), lying on the ethmoid bone.",
  fn: "Receives smell signals through the cribriform plate and passes them straight to the brain's emotion and memory areas — why smells trigger vivid memories.",
  kid: "Smells go straight from your nose to here.", meta: { Nerve: "Cranial nerve I" },
});
P({
  id: "optic-nerve", name: "Optic Nerve", sys: "nervous", grp: "Cranial nerves", bi: 1, q: 2,
  g: [tube([add(SKULL.eye, [0, 0, -0.012]), [0.024, 1.614, 0.038], [0.01, 1.62, 0.022], [0.003, 1.622, 0.014]], 0.0022)],
  d: "Cranial nerve II: a cable of about a million nerve fibres running from the back of the eye to the optic chiasm, where half the fibres cross to the other side.",
  fn: "Carries visual information from the retina to the brain.",
  kid: "It's the cable that sends pictures from your eye to your brain.", meta: { Nerve: "Cranial nerve II" },
});

/* spinal cord & cauda equina */
{
  const pts = [];
  for (let y = 1.584; y >= 1.1; y -= 0.022) pts.push(canalAt(y));
  P({
    id: "spinal-cord", name: "Spinal Cord", sys: "nervous", grp: "Central nervous system", q: 1, lbl: 1,
    g: [tube(pts, [0.0068, 0.006, 0.0058, 0.0058, 0.0062, 0.0056, 0.005, 0.005, 0.0052, 0.0055, 0.005, 0.0042, 0.003, 0.0022], { sl: 0.004 })],
    d: "The column of nerve tissue that runs from the brainstem down the vertebral canal to about the level of L1–L2 — around 45 cm long and as thick as a finger.",
    fn: "Carries motor commands down and sensory information up, and handles fast reflexes such as pulling your hand away from something hot on its own.",
    kid: "The spinal cord is the information highway between your brain and body.",
    meta: { Length: "About 45 cm", Segments: "31 pairs of spinal nerves" },
  });
  const tails = [];
  for (let k = 0; k < 5; k++) {
    const dx = (k - 2) * 0.0025;
    const t = [];
    for (let y = 1.11; y >= 0.9; y -= 0.03) { const c = canalAt(Math.max(y, 0.985)); t.push([dx, y, y < 0.985 ? -0.05 - (0.985 - y) * 0.5 : c[2] + 0.002]); }
    tails.push(tube(t, 0.0011, { rs: 6 }));
  }
  P({
    id: "cauda-equina", name: "Cauda Equina", sys: "nervous", grp: "Central nervous system", q: 3,
    g: tails,
    d: "The 'horse's tail': the bundle of lumbar and sacral nerve roots that continues down the vertebral canal below the end of the spinal cord.",
    fn: "Supplies the legs, bladder, bowel and genitals. Doctors take spinal fluid (lumbar puncture) from this level because there is no cord to injure.",
    kid: "Below the spinal cord, the nerves spread out like a horse's tail.", meta: { Level: "L2 to coccyx" },
  });
}

/* =====================================================================
   EYES & EARS
   ===================================================================== */
P({
  id: "eyeball", name: "Eyeball", sys: "sensory", grp: "Eye", bi: 1, col: "#F3F1EC", q: 1, lbl: 1,
  g: [sdf([S.sph(SKULL.eye, 0.0118), S.sph(add(SKULL.eye, [0, 0, 0.0075]), 0.0072)], { k: 0.002, cell: 0.0007 })],
  d: "A sphere about 24 mm across made of three layers: the tough white sclera and clear cornea outside, the blood-rich choroid, and the light-sensing retina inside.",
  fn: "Focuses light onto the retina, whose 120 million rods and 6 million cones turn it into nerve signals for the brain.",
  kid: "Your eyes are like cameras — the pupil lets light in and the retina takes the picture.",
  meta: { Diameter: "About 24 mm", Weight: "About 7.5 g" },
});
P({
  id: "iris", name: "Iris", sys: "sensory", grp: "Eye", bi: 1, col: "#6A8C5A", q: 2,
  g: [{ t: "tube", p: [add(SKULL.eye, [0, 0, 0.0108]), add(SKULL.eye, [0, 0, 0.0113])], r: [0.0058, 0.0058], rs: 28, cap: 1 }],
  d: "The coloured ring of muscle behind the cornea. The hole in its centre is the pupil.",
  fn: "Widens or narrows the pupil to control how much light enters the eye — like the aperture of a camera.",
  kid: "The coloured part of your eye makes the black pupil bigger in the dark and smaller in bright light.", meta: { Muscles: "Sphincter and dilator pupillae" },
});
P({
  id: "lens", name: "Lens", sys: "sensory", grp: "Eye", bi: 1, col: "#DCE7EE", q: 3,
  g: [ell(add(SKULL.eye, [0, 0, 0.0075]), [0.0045, 0.0045, 0.0022])],
  d: "A transparent, flexible disc behind the iris, held in place by fine ligaments.",
  fn: "Changes shape to fine-focus near and far objects. With age it stiffens (presbyopia) and may cloud over (cataract).",
  kid: "The lens bends light so what you look at is sharp, not blurry.", meta: { Tissue: "Crystallin proteins, no blood vessels" },
});
P({
  id: "auricle", name: "Auricle", sys: "sensory", grp: "Ear", bi: 1, col: "#E2B39A", q: 1, aka: "outer ear pinna",
  g: [sdf([
    S.ell([0.074, 1.612, -0.018], [0.005, 0.031, 0.018], { e: [0, -18, 0] }),
    ...S.chain([[0.078, 1.582, -0.012], [0.08, 1.6, -0.03], [0.08, 1.632, -0.03], [0.078, 1.642, -0.014], [0.076, 1.632, -0.002]], 0.0032),
    Sub(S.sph([0.079, 1.607, -0.012], 0.0075)),
  ], { k: 0.003, cell: 0.0012 })],
  d: "The visible outer ear: a curled plate of elastic cartilage covered with skin, with the fleshy earlobe at the bottom.",
  fn: "Collects sound waves and funnels them into the ear canal; its folds help you tell whether a sound comes from above, below, in front or behind.",
  kid: "Your outer ear is a sound catcher.", meta: { Tissue: "Elastic cartilage and skin" },
});
{
  const coil = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 5, r = 0.0045 * (1 - i / 48); coil.push([0.044 + 0.002 * (i / 40), 1.603 + Math.sin(a) * r, -0.004 + Math.cos(a) * r]); }
  P({
    id: "cochlea", name: "Cochlea", sys: "sensory", grp: "Ear", bi: 1, col: "#E9D7C3", q: 2,
    g: [tube(coil, [0.0016, 0.0009], { rs: 8, sl: 0.0007 })],
    d: "A snail-shaped, fluid-filled tube of 2½ turns inside the temporal bone — the organ of hearing.",
    fn: "Sound waves ripple its fluid; about 15 000 hair cells along it turn different pitches into nerve signals sent along the cochlear nerve.",
    kid: "Deep in your ear is a tiny snail shell that turns sound into signals for your brain.", meta: { Length: "About 35 mm uncoiled" },
  });
  const ring = (c, ax, r) => { const out = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 1.6 + 0.3; out.push(add(c, ax === "x" ? [0, Math.cos(a) * r, Math.sin(a) * r] : ax === "y" ? [Math.cos(a) * r, 0, Math.sin(a) * r] : [Math.cos(a) * r, Math.sin(a) * r, 0])); } return out; };
  P({
    id: "semicircular-canals", name: "Semicircular Canals", sys: "sensory", grp: "Ear", bi: 1, col: "#E9D7C3", q: 3,
    g: [tube(ring([0.05, 1.612, -0.016], "x", 0.004), 0.0007, { rs: 6 }), tube(ring([0.05, 1.608, -0.02], "y", 0.004), 0.0007, { rs: 6 }), tube(ring([0.052, 1.61, -0.018], "z", 0.0038), 0.0007, { rs: 6 })],
    d: "Three fluid-filled loops set at right angles to each other in the inner ear.",
    fn: "Sense rotation of the head in any direction, feeding the brain's sense of balance. Spinning makes the fluid keep moving afterwards — that's why you feel dizzy.",
    kid: "Three little loops in your ear tell your brain which way you're turning.", meta: { Part: "Vestibular system" },
  });
}
P({
  id: "tympanic-membrane", name: "Tympanic Membrane", sys: "sensory", grp: "Ear", bi: 1, col: "#EBD2C8", q: 2, aka: "eardrum",
  g: [ell([0.058, 1.605, -0.011], [0.0008, 0.0045, 0.0045], { e: [0, 0, 20] })],
  d: "The eardrum: a thin cone-shaped membrane about 9 mm across at the end of the ear canal.",
  fn: "Vibrates with incoming sound and passes the vibrations to the malleus.",
  kid: "Sound makes your eardrum wobble like the skin of a drum.", meta: { Diameter: "About 9 mm" },
});

/* =====================================================================
   MOUTH, TEETH, THROAT
   ===================================================================== */
{
  // Arch is sampled by arc length from the midline back to the third molar.
  const ARCH = [[0.0, 0.082], [0.011, 0.079], [0.02, 0.072], [0.026, 0.062], [0.03, 0.05], [0.032, 0.037], [0.033, 0.024]];
  const archAt = (s) => { // s in metres along the arch
    let acc = 0;
    for (let i = 1; i < ARCH.length; i++) {
      const a = ARCH[i - 1], b = ARCH[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= s) { const t = (s - acc) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      acc += l;
    }
    return ARCH[ARCH.length - 1];
  };
  const TEETH = [
    ["central-incisor", "Central Incisor", 0.0085, "incisor", "Chisel-shaped front tooth", "Bites and cuts food."],
    ["lateral-incisor", "Lateral Incisor", 0.0066, "incisor", "Narrower cutting tooth beside the central incisor", "Cuts food and guides the jaw when you bite."],
    ["canine", "Canine", 0.0076, "canine", "The pointed 'eye tooth' with the longest root of any tooth", "Grips and tears food and guides the jaw sideways."],
    ["first-premolar", "First Premolar", 0.0071, "premolar", "A two-cusped tooth behind the canine", "Crushes and tears food."],
    ["second-premolar", "Second Premolar", 0.0068, "premolar", "The second two-cusped tooth", "Crushes food before it reaches the molars."],
    ["first-molar", "First Molar", 0.0102, "molar", "A broad grinding tooth with four or five cusps — usually the first permanent tooth to erupt, at about 6 years", "Grinds food; the main chewing tooth."],
    ["second-molar", "Second Molar", 0.0092, "molar", "Grinding tooth that erupts at about 12 years", "Grinds food."],
    ["third-molar", "Third Molar", 0.0085, "molar", "The wisdom tooth, erupting between 17 and 25 — if there is room", "Adds grinding surface; often removed when impacted."],
  ];
  let s = 0.001;
  for (const [id, name, w, kind] of TEETH) {
    const [x, z] = archAt(s + w / 2);
    s += w + 0.0004;
    const crownH = kind === "molar" ? 0.0075 : kind === "premolar" ? 0.0082 : kind === "canine" ? 0.01 : 0.0095;
    const rootL = kind === "canine" ? 0.017 : kind === "molar" ? 0.012 : 0.013;
    const bw = kind === "molar" ? 0.0052 : kind === "premolar" ? 0.0036 : kind === "canine" ? 0.0036 : 0.0033;
    const bd = kind === "incisor" ? 0.0022 : kind === "canine" ? 0.0036 : 0.0045;
    const tooth = (upper, xs, zs) => {
      const sgn = upper ? 1 : -1, y0 = SKULL.occlusal + sgn * 0.0006;
      const c = [x * xs, y0 + sgn * crownH * 0.5, z * zs - (upper ? 0 : 0.002)];
      return [
        ell(c, [bw, crownH * 0.55, bd], { seg: 14 }),
        tube([add(c, [0, sgn * crownH * 0.25, 0]), add(c, [0, sgn * (crownH * 0.5 + rootL), 0])], [kind === "molar" ? 0.0036 : 0.0023, 0.0009], { rs: 8 }),
      ];
    };
    const [what, does] = TEETH.find((t) => t[0] === id).slice(4);
    for (const upper of [true, false]) {
      const jaw = upper ? "Upper" : "Lower";
      P({
        id: `tooth-${upper ? "upper" : "lower"}-${id}`, name: `${jaw} ${name}`, sys: "digestive", grp: "Teeth", org: "Teeth", bi: 1, mat: "tooth", q: kind === "molar" && id === "first-molar" ? 2 : 3,
        g: tooth(upper, upper ? 1 : 0.94, upper ? 1 : 0.95),
        d: `${what}, in the ${jaw.toLowerCase()} jaw. Each tooth has an enamel crown — the hardest substance in the body — over dentine, with a pulp of nerves and vessels in the middle.`,
        fn: does,
        kid: "Adults have 32 teeth; children have 20 baby teeth.",
        meta: { Type: cap(kind), Set: "Permanent (adult) dentition" },
      });
    }
  }
}
P({
  id: "tongue", name: "Tongue", sys: "digestive", grp: "Mouth", q: 1, col: "#D9747A",
  g: [sdf([S.ell([0, 1.556, 0.045], [0.022, 0.009, 0.03]), S.ell([0, 1.545, 0.018], [0.02, 0.016, 0.02]), S.cap([0, 1.538, 0.005], [0, 1.515, 0.0], 0.012, 0.008)], { k: 0.01, cell: 0.0014 })],
  d: "A muscular organ covered with papillae; its surface carries 2 000–8 000 taste buds.",
  fn: "Moves food around for chewing, shapes it into a ball for swallowing, detects the five basic tastes and is essential for speech.",
  kid: "Your tongue is made of muscles and can taste sweet, salty, sour, bitter and savoury.",
  meta: { Muscles: "4 intrinsic + 4 extrinsic pairs", Nerve: "Hypoglossal (movement)" },
});
P({
  id: "parotid-gland", name: "Parotid Gland", sys: "digestive", grp: "Salivary glands", bi: 1, mat: "gland", q: 3,
  g: [sdf([S.ell([0.056, 1.573, 0.003], [0.009, 0.022, 0.015]), S.cap([0.055, 1.573, 0.012], [0.045, 1.572, 0.04], 0.002)], { k: 0.004, cell: 0.0016 })],
  d: "The largest salivary gland, wrapped around the back of the jaw in front of the ear. Its duct opens inside the cheek opposite the upper second molar.",
  fn: "Produces watery saliva rich in amylase, which starts digesting starch. It swells painfully in mumps.",
  kid: "When you smell tasty food, this gland makes your mouth water.", meta: { Output: "About 25% of saliva" },
});
P({
  id: "submandibular-gland", name: "Submandibular Gland", sys: "digestive", grp: "Salivary glands", bi: 1, mat: "gland", q: 3,
  g: [ell([0.035, 1.524, 0.028], [0.011, 0.008, 0.013])],
  d: "A walnut-sized gland under the angle of the jaw; its duct opens under the tongue.",
  fn: "Makes about 70% of your saliva, a mix of watery and mucous secretions.",
  kid: "It makes most of your spit!", meta: { Output: "About 70% of saliva" },
});
P({
  id: "sublingual-gland", name: "Sublingual Gland", sys: "digestive", grp: "Salivary glands", bi: 1, mat: "gland", q: 3,
  g: [ell([0.014, 1.535, 0.058], [0.012, 0.0035, 0.006], { e: [0, 25, 0] })],
  d: "The smallest major salivary gland, lying under the tongue in the floor of the mouth.",
  fn: "Secretes thick, mucous saliva that lubricates food.",
  kid: "A small gland under your tongue keeps your mouth slippery.", meta: { Output: "About 5% of saliva" },
});
P({
  id: "palatine-tonsil", name: "Palatine Tonsil", sys: "lymphatic", grp: "Tonsils", bi: 1, q: 2, aka: "tonsils",
  g: [ell([0.016, 1.543, 0.012], [0.004, 0.008, 0.005])],
  d: "An almond-shaped mass of lymphoid tissue on each side of the back of the throat.",
  fn: "Samples bacteria and viruses entering through the mouth and helps train the immune system, especially in childhood.",
  kid: "Tonsils are guards at the back of your throat that catch germs.", meta: { Tissue: "Lymphoid (MALT)" },
});
P({
  id: "pharyngeal-tonsil", name: "Adenoids", sys: "lymphatic", grp: "Tonsils", q: 3, aka: "pharyngeal tonsil",
  g: [ell([0, 1.593, 0.008], [0.009, 0.005, 0.005])],
  d: "The pharyngeal tonsil, a pad of lymphoid tissue at the back of the nasal cavity. It is largest in childhood and shrinks by adolescence.",
  fn: "Traps germs breathed in through the nose; enlarged adenoids can cause snoring and blocked ears in children.",
  kid: "Hidden behind your nose, the adenoids help fight colds.", meta: { Tissue: "Lymphoid (MALT)" },
});
P({
  id: "nasal-cavity", name: "Nasal Cavity", sys: "respiratory", grp: "Upper airway", col: "#E7A4A8", q: 2,
  g: [sdf([S.ell([0, 1.59, 0.05], [0.012, 0.021, 0.036]), S.ell([0, 1.593, 0.084], [0.009, 0.015, 0.012]), Sub(S.ell([0, 1.59, 0.05], [0.0012, 0.03, 0.05], { k: 0.001 }))], { k: 0.006, cell: 0.0014 })],
  d: "The air passage behind the nose, split in two by the septum and lined with moist, hair-covered mucous membrane. The olfactory area in its roof detects smells.",
  fn: "Warms, moistens and filters about 10 000 litres of air a day before it reaches the lungs, and gives your voice its resonance.",
  kid: "The inside of your nose warms and cleans the air you breathe.", meta: { Lining: "Respiratory and olfactory epithelium" },
});
P({
  id: "pharynx", name: "Pharynx", sys: "respiratory", grp: "Upper airway", col: "#D98A8C", q: 2, aka: "throat",
  g: [tube([[0, 1.598, 0.006], [0, 1.57, 0.002], [0, 1.54, -0.001], [0, 1.51, -0.006], [0, 1.488, -0.012]], [0.0125, 0.013, 0.012, 0.0105, 0.0085])],
  d: "The throat: a 12–14 cm muscular tube from the back of the nose down to the larynx and oesophagus, divided into nasopharynx, oropharynx and laryngopharynx.",
  fn: "A shared passage for air and food. When you swallow, its muscles squeeze food down while the epiglottis closes the airway.",
  kid: "Food and air share this tube at the back of your mouth.", meta: { Length: "12–14 cm" },
});
P({
  id: "epiglottis", name: "Epiglottis", sys: "respiratory", grp: "Larynx", mat: "cartilage", q: 2,
  g: [ell([0, 1.518, 0.012], [0.008, 0.012, 0.0018], { e: [-25, 0, 0] })],
  d: "A leaf-shaped flap of elastic cartilage behind the root of the tongue.",
  fn: "Folds down over the entrance to the larynx every time you swallow so food goes into the oesophagus, not the windpipe.",
  kid: "A tiny trapdoor stops food going down the wrong way.", meta: { Tissue: "Elastic cartilage" },
});
P({
  id: "larynx", name: "Larynx", sys: "respiratory", grp: "Larynx", mat: "cartilage", q: 2, lbl: 1, aka: "voice box adam's apple thyroid cartilage",
  g: [sdf([
    S.ell([0, 1.5, 0.024], [0.019, 0.014, 0.016]),
    S.cap([0, 1.508, 0.036], [0, 1.492, 0.038], 0.004),
    Sub(S.ell([0, 1.5, 0.018], [0.016, 0.02, 0.013], { k: 0.002 })),
    I([0, 0, 0.008], [0, 0, -1]),
    S.tor([0, 1.479, 0.019], 0.0105, 0.0032),
  ], { k: 0.004, cell: 0.0012 })],
  d: "The voice box, built of nine cartilages joined by muscles and ligaments. The thyroid cartilage forms the Adam's apple, which grows larger in males at puberty.",
  fn: "Protects the airway, holds the vocal folds that vibrate to make sound, and closes tightly when you cough or strain.",
  kid: "Hum and touch your throat — you can feel your voice box buzzing.", meta: { Cartilages: "Thyroid, cricoid, epiglottis, arytenoids (×2) and others" },
});
P({
  id: "vocal-folds", name: "Vocal Fold", sys: "respiratory", grp: "Larynx", bi: 1, col: "#F0E4DC", q: 3, aka: "vocal cords",
  g: [tube([[0.0015, 1.496, 0.034], [0.006, 1.496, 0.022], [0.007, 1.496, 0.012]], 0.0014)],
  d: "Two bands of muscle and elastic ligament stretched across the larynx, about 1.5 cm long in men and 1 cm in women.",
  fn: "Snap together and vibrate as air passes to produce voice; tension and length set the pitch.",
  kid: "Your vocal cords wobble super fast to make your voice.", meta: { Vibration: "Around 100–250 times per second when speaking" },
});
{
  const rings = [];
  const path = (t) => [0, 1.472 - t * 0.125, 0.018 - t * 0.02];
  for (let k = 0; k < 16; k++) {
    const c = path(k / 15), pts = [];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI * 0.8 + (i / 10) * Math.PI * 1.6; pts.push([c[0] + Math.sin(a) * 0.0088, c[1], c[2] + Math.cos(a) * 0.0088]); }
    rings.push(tube(pts, 0.0017, { rs: 6 }));
  }
  P({
    id: "trachea", name: "Trachea", sys: "respiratory", grp: "Airways", q: 1, lbl: 1, aka: "windpipe",
    g: [tube([path(0), path(0.5), path(1)], 0.0078, { rs: 16 }), ...rings.map((r) => ({ ...r, mat: "cartilage" }))],
    col: "#E7B6AE",
    d: "The windpipe: a tube about 11 cm long held open by 16–20 C-shaped rings of cartilage, running from the larynx to its fork (the carina) behind the sternum.",
    fn: "Conducts air to the lungs. Its lining of mucus and beating cilia sweeps dust and germs up and away from the lungs.",
    kid: "The rings in your windpipe keep it open like the hose of a vacuum cleaner.", meta: { Length: "10–12 cm", Rings: "16–20 C-shaped cartilages" },
  });
}
P({
  id: "thyroid-gland", name: "Thyroid Gland", sys: "endocrine", grp: "Neck", mat: "gland", col: "#B8604E", q: 1, lbl: 1,
  g: [sdf([...both([S.ell([0.016, 1.468, 0.022], [0.008, 0.02, 0.009], { e: [0, 0, -12] })]), S.cap([-0.01, 1.458, 0.028], [0.01, 1.458, 0.028], 0.0045)], { k: 0.004, cell: 0.0012 })],
  d: "A butterfly-shaped gland of two lobes joined by an isthmus, wrapped around the front of the trachea just below the larynx.",
  fn: "Uses iodine to make the hormones T4 and T3, which set the pace of metabolism, heart rate, body temperature and growth; also makes calcitonin.",
  kid: "This butterfly-shaped gland controls how fast your body uses energy.",
  meta: { Weight: "15–25 g", Hormones: "T4, T3, calcitonin", "Controlled by": "TSH from the pituitary" },
});
for (const [id, name, y] of [["superior-parathyroid", "Superior Parathyroid Gland", 1.478], ["inferior-parathyroid", "Inferior Parathyroid Gland", 1.455]]) {
  P({
    id, name, sys: "endocrine", grp: "Neck", bi: 1, mat: "gland", col: "#D9A34E", q: 3,
    g: [ell([0.02, y, 0.013], [0.0025, 0.003, 0.002])],
    d: "One of four rice-grain-sized glands on the back of the thyroid.",
    fn: "Secretes parathyroid hormone (PTH), which raises blood calcium by releasing it from bone, saving it in the kidneys and activating vitamin D.",
    kid: "Four tiny glands keep the right amount of calcium in your blood.", meta: { Hormone: "Parathyroid hormone (PTH)" },
  });
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }
export default parts;
