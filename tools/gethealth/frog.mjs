/**
 * Frog (Rana tigrina — the Indian bullfrog studied in school biology).
 * Model units: snout–vent length = 0.5 (a real adult is 10–15 cm), head
 * towards +z, back towards +y, the frog's left towards +x. Sitting posture.
 */
import { add, lerp, ell, bone, spin, tube, sdf, sheet, S, both, makePart } from "./lib.mjs";

const parts = [];
const P = (p) => parts.push(makePart(p));

/* ---------------------------------------------------------------- landmarks (left) */
const J = {
  shoulder: [0.068, 0.118, 0.08], elbow: [0.118, 0.066, 0.1], wrist: [0.106, 0.022, 0.172],
  hip: [0.045, 0.118, -0.196], knee: [0.17, 0.086, -0.07], ankle: [0.118, 0.038, -0.25], tarsus: [0.16, 0.022, -0.11],
};
const SPINE_Z = [0.1, 0.07, 0.045, 0.02, -0.005, -0.03, -0.055, -0.08, -0.105];
const sp = (z) => [0, 0.148 - Math.max(0, -z) * 0.1, z];

/* =====================================================================
   SKELETON
   ===================================================================== */
const B = (p) => P({ sys: "skeletal", q: 3, ...p });
B({
  id: "skull", name: "Skull", grp: "Axial skeleton", q: 1, lbl: 1,
  g: [sdf([
    S.ell([0, 0.145, 0.175], [0.03, 0.022, 0.07]),                                    // cranium (frontoparietals)
    ...both([S.cap([0.024, 0.14, 0.24], [0.1, 0.125, 0.12], 0.0065), S.cap([0.1, 0.125, 0.12], [0.075, 0.13, 0.095], 0.008)]), // maxillary arch
    S.ell([0, 0.14, 0.235], [0.03, 0.012, 0.02]),                                     // nasal region
    ...both([S.ell([0.052, 0.16, 0.155], [0.028, 0.004, 0.03], { o: "s", k: 0.004 })]),   // orbits
  ], { k: 0.01, cell: 0.004 })],
  d: "A broad, flat and lightweight skull. Unlike ours it has large open orbits and few bones, and it joins the spine through two occipital condyles (dicondylic).",
  fn: "Protects the small brain, supports the huge eyes and forms the upper jaw, which carries tiny maxillary teeth for gripping prey.",
  kid: "A frog's skull is flat and full of big holes for its bulging eyes.",
  meta: { Condyles: "Two (dicondylic)", Teeth: "Maxillary and vomerine (upper jaw only)" },
});
B({
  id: "lower-jaw", name: "Lower Jaw", grp: "Axial skeleton", q: 2,
  g: [sdf(both(S.chain([[0.0, 0.112, 0.25], [0.05, 0.11, 0.2], [0.095, 0.116, 0.12]], 0.006)), { k: 0.006, cell: 0.003 })],
  d: "A U-shaped jaw of several small bones (dentary, angulosplenial and mentomeckelian). It has no teeth.",
  fn: "Hinges widely so the frog can swallow prey whole; the sticky tongue is attached at its front.",
  kid: "Frogs have no teeth in their bottom jaw — they swallow their food whole.", meta: { Teeth: "None" },
});
SPINE_Z.forEach((z, i) => {
  const n = i + 1;
  const name = n === 1 ? "Atlas (Vertebra 1)" : n === 9 ? "Sacral Vertebra (Vertebra 9)" : `Vertebra ${n}`;
  const tpx = n === 9 ? 0.05 : n <= 4 ? 0.042 : 0.03;
  B({
    id: `vertebra-${n}`, name, grp: "Vertebral column", q: n === 1 || n === 9 ? 2 : 3,
    g: [sdf([S.ell(sp(z), [0.011, 0.009, 0.011]), S.cap(add(sp(z), [-tpx, 0.002, 0]), add(sp(z), [tpx, 0.002, 0]), 0.0045), S.cap(sp(z), add(sp(z), [0, 0.014, -0.005]), 0.0035)], { k: 0.004, cell: 0.0022 })],
    d: n === 1 ? "The first vertebra, with no transverse processes, carrying the skull on two cup-shaped facets." : n === 9 ? "The ninth vertebra, whose large transverse processes articulate with the long ilia of the pelvic girdle." : "One of the procoelous vertebrae of the short frog spine — there are only nine vertebrae plus the urostyle, and no ribs.",
    fn: n === 9 ? "Transfers the thrust of the hind legs to the spine during jumping." : "Protects the spinal cord and gives the trunk a short, rigid frame for leaping.",
    kid: "A frog has only 9 back bones — and no ribs at all!", meta: { Type: "Procoelous vertebra" },
  });
});
B({
  id: "urostyle", name: "Urostyle", grp: "Vertebral column", q: 2, lbl: 1,
  g: [tube([sp(-0.118), [0, 0.13, -0.17], [0, 0.118, -0.22]], [0.007, 0.005, 0.003])],
  d: "A long, rod-like bone formed by fused tail vertebrae, running back from the sacral vertebra between the ilia.",
  fn: "Stiffens the rear of the body and anchors muscles used in jumping — a reminder that the tadpole had a tail.",
  kid: "This bone is what's left of the tadpole's tail.", meta: { Formed: "Fused caudal vertebrae" },
});
B({
  id: "suprascapula", name: "Suprascapula", grp: "Pectoral girdle", bi: 1,
  g: [sheet([[0, 0], [0.035, 0.004], [0.04, 0.03], [0.004, 0.03]], 0.004, { c: [0.035, 0.14, 0.075], ux: [0.3, 0.95, 0], uy: [0, 0, 1] })],
  d: "A broad, partly cartilaginous plate forming the upper part of the shoulder girdle over the back.", fn: "Anchors the shoulder muscles and braces the forelimbs.",
  kid: "Frogs land on their arms, so their shoulder bones act like shock absorbers.", meta: { Tissue: "Partly calcified cartilage" },
});
B({ id: "scapula", name: "Scapula", grp: "Pectoral girdle", bi: 1, g: [bone([0.06, 0.128, 0.078], [0.07, 0.1, 0.085], 0.005)], d: "A short bone joining the suprascapula to the glenoid cavity.", fn: "Forms the upper half of the shoulder socket.", kid: "Frogs land on their arms, so their shoulder bones act like shock absorbers.", meta: { Type: "Girdle bone" } });
B({ id: "clavicle", name: "Clavicle", grp: "Pectoral girdle", bi: 1, g: [bone([0.005, 0.085, 0.1], [0.066, 0.1, 0.09], 0.003)], d: "A slender bar running from the midline to the shoulder at the front of the girdle.", fn: "Braces the shoulder against the sternum when the frog lands.", kid: "Frogs land on their arms, so their shoulder bones act like shock absorbers.", meta: { Type: "Girdle bone" } });
B({ id: "coracoid", name: "Coracoid", grp: "Pectoral girdle", bi: 1, g: [bone([0.005, 0.082, 0.075], [0.066, 0.098, 0.08], 0.0045)], d: "A stout bone behind the clavicle joining the girdle to the ventral midline.", fn: "Takes the impact of landing on the forelimbs.", kid: "Frogs land on their arms, so their shoulder bones act like shock absorbers.", meta: { Type: "Girdle bone" } });
B({ id: "sternum", name: "Sternum", grp: "Pectoral girdle", g: [ell([0, 0.078, 0.06], [0.01, 0.003, 0.022]), ell([0, 0.082, 0.118], [0.008, 0.003, 0.014])], d: "The frog's breastbone — the omosternum in front and sternum behind the girdle — with no ribs attached.", fn: "Anchors the chest muscles and ties the two halves of the pectoral girdle together.", kid: "Frogs have a breastbone but no ribs.", meta: { Parts: "Omosternum and sternum" } });
const limb = (id, name, grp, a, b, r, d, fn, q = 2) => B({ id, name, grp, bi: 1, q, g: [bone(a, b, r)], d, fn, kid: "Frogs' strong back legs let them jump up to 20 times their own body length.", meta: { Type: "Long bone" } });
limb("humerus", "Humerus", "Forelimb", J.shoulder, J.elbow, 0.0055, "The upper arm bone, with a prominent crest (deltoid ridge) in males for gripping females during mating.", "Carries the forelimb muscles that cushion landing after a jump.");
limb("radio-ulna", "Radio-ulna", "Forelimb", J.elbow, J.wrist, 0.005, "The radius and ulna fused into a single bone, with a groove showing where they joined.", "Forms the rigid forearm that props the front of the body up.");
limb("femur", "Femur", "Hindlimb", J.hip, J.knee, 0.0065, "The long, slightly S-shaped thigh bone.", "Carries the powerful thigh muscles that straighten the leg in a jump.", 1);
limb("tibio-fibula", "Tibio-fibula", "Hindlimb", J.knee, J.ankle, 0.006, "The tibia and fibula fused into one long bone, longer than the femur.", "Adds a long lever to the hind leg for jumping and swimming.", 2);
limb("astragalus-calcaneum", "Astragalus & Calcaneum", "Hindlimb", J.ankle, J.tarsus, 0.0045, "Two elongated ankle bones (tarsals), fused at each end, forming an extra segment of the leg.", "Give the frog a fourth leg segment for extra leverage when leaping.", 2);
B({
  id: "hand-bones", name: "Hand Bones", grp: "Forelimb", bi: 1,
  g: [ell(J.wrist, [0.008, 0.004, 0.008]), ...[[-0.02, 0.03], [-0.004, 0.05], [0.014, 0.05], [0.028, 0.032]].flatMap(([dx, len]) => [bone(add(J.wrist, [dx * 0.4, -0.004, 0.006]), add(J.wrist, [dx, -0.018, len]), 0.0022, { ha: 0.003, hb: 0.003 })])],
  d: "The carpals, metacarpals and phalanges of the hand. The frog has four fingers; the thumb is only a vestige.",
  fn: "Spread on the ground to steady the body and, in males, grip the female during mating (amplexus).",
  kid: "Frogs have 4 fingers on each hand but 5 toes on each foot.", meta: { Digits: "4" },
});
B({
  id: "foot-bones", name: "Foot Bones", grp: "Hindlimb", bi: 1,
  g: [...[[-0.03, 0.06], [-0.012, 0.085], [0.006, 0.11], [0.028, 0.14], [0.05, 0.1]].map(([dx, len]) => bone(add(J.tarsus, [dx * 0.3, 0, 0.004]), add(J.tarsus, [dx * 1.6, -0.012, len]), 0.0024, { ha: 0.003, hb: 0.003 }))],
  d: "The metatarsals and phalanges of the five long, webbed toes.",
  fn: "Support the webbing that makes the hind feet powerful paddles for swimming.",
  kid: "Webbed feet work like flippers.", meta: { Digits: "5, webbed" },
});
B({ id: "ilium", name: "Ilium", grp: "Pelvic girdle", bi: 1, q: 2, g: [bone([0.05, 0.14, -0.105], [0.022, 0.12, -0.2], 0.005, { ha: 0.006, hb: 0.008 })], d: "A long rod-like bone running from the sacral vertebra back to the acetabulum — the frog's hips are stretched out for jumping.", fn: "Transmits the kick of the hind legs forward to the spine.", kid: "A frog's hip bones are long rods that act like the springs in a catapult.", meta: { Joins: "Sacral vertebra, acetabulum" } });
B({ id: "ischium-pubis", name: "Ischium & Pubis", grp: "Pelvic girdle", g: [ell([0, 0.11, -0.21], [0.03, 0.02, 0.012])], d: "The fused ischium and (cartilaginous) pubis forming a disc at the back of the pelvis with the socket for each femur.", fn: "Holds the hip sockets (acetabula) where the legs attach.", kid: "The hip sockets are at the very back of the frog.", meta: { Contains: "Acetabula" } });

/* =====================================================================
   MUSCLES
   ===================================================================== */
const Mu = (id, name, g, d, fn, extra = {}) => P({ id, name, sys: "muscular", grp: "Muscles", bi: 1, q: 3, g, d, fn, kid: "Frog leg muscles are among the most studied muscles in science.", ...extra });
Mu("gastrocnemius", "Gastrocnemius", [spin(lerp(J.knee, J.ankle, 0.05), lerp(J.knee, J.ankle, 0.9), 0.022, { f: 0.7, nz: [0, 1, 0], bias: 0.4 })],
  "The big calf muscle of the frog, ending in the tendon of Achilles over the ankle.", "Straightens the ankle to power jumping and swimming. Galvani's famous 1780s experiments on frog legs used this muscle.", { q: 2, lbl: 1 });
Mu("triceps-femoris", "Triceps Femoris", [spin(lerp(J.hip, J.knee, 0.05), lerp(J.hip, J.knee, 0.95), 0.028, { f: 0.7, nz: [0, 1, 0.2] })], "The large three-part muscle on the front of the thigh.", "Straightens the knee during the jump.", { q: 2 });
Mu("sartorius", "Sartorius", [spin(lerp(J.hip, J.knee, 0.0), lerp(J.hip, J.knee, 1), 0.01, { f: 0.4, nz: [0, -1, 0.3] })], "A long, thin strap across the underside of the thigh.", "Bends the knee and pulls the thigh forward.");
Mu("gluteus", "Gluteus", [spin([0.04, 0.14, -0.12], [0.1, 0.12, -0.15], 0.018, { f: 0.6 })], "A muscle over the ilium at the hip.", "Pulls the thigh forward and outward.");
Mu("pectoralis", "Pectoralis", [spin([0.01, 0.075, 0.07], [0.09, 0.085, 0.095], 0.018, { f: 0.4, nz: [0, -1, 0] })], "A fan-shaped chest muscle on the underside.", "Pulls the forelimb inward and backward.");
Mu("deltoid", "Deltoid", [spin([0.06, 0.13, 0.08], [0.1, 0.085, 0.095], 0.012, { f: 0.6 })], "A shoulder muscle over the humerus.", "Moves the forelimb forward.");
Mu("rectus-abdominis", "Rectus Abdominis", [spin([0.012, 0.062, 0.06], [0.012, 0.07, -0.18], 0.016, { f: 0.3, nz: [0, -1, 0] })], "A long band along the belly with transverse tendinous lines.", "Supports the abdominal organs and bends the body.");
Mu("external-oblique", "External Oblique", [spin([0.07, 0.1, 0.05], [0.06, 0.09, -0.16], 0.03, { f: 0.25, nz: [1, 0, 0] })], "A thin sheet of muscle on the side of the trunk.", "Compresses the abdomen, helping to push air out of the lungs.");
P({ id: "mylohyoid", name: "Mylohyoid", sys: "muscular", grp: "Muscles", q: 3, g: [ell([0, 0.098, 0.18], [0.07, 0.006, 0.05])], d: "A sheet of muscle across the floor of the mouth.", fn: "Raises and lowers the floor of the mouth in 'buccal pumping' — the way a frog pushes air into its lungs, since it has no diaphragm.", kid: "Watch a frog's throat pump up and down — that's how it breathes!", meta: { Role: "Buccal pumping" } });

/* =====================================================================
   HEART & VESSELS
   ===================================================================== */
const heartC = [0, 0.09, 0.098];
P({ id: "ventricle", name: "Ventricle", sys: "circulatory", grp: "Heart", org: "Heart", col: "#B03A40", q: 1, lbl: 1, g: [sdf([S.cap(add(heartC, [0, 0, 0.008]), add(heartC, [0, -0.012, -0.03]), 0.02, 0.006)], { k: 0.004, cell: 0.0022 })],
  d: "The single, thick-walled, conical ventricle of the frog's three-chambered heart.", fn: "Pumps blood into the truncus arteriosus. Because there is only one ventricle, oxygen-rich and oxygen-poor blood partly mix.",
  kid: "A frog's heart has 3 rooms. Yours has 4!", meta: { Heart: "3-chambered: 2 atria, 1 ventricle" } });
P({ id: "right-atrium", name: "Right Atrium", sys: "circulatory", grp: "Heart", org: "Heart", col: "#A5465A", q: 2, g: [ell(add(heartC, [-0.012, 0.012, 0.018]), [0.013, 0.011, 0.012])], d: "The larger of the two atria, receiving blood from the sinus venosus.", fn: "Collects deoxygenated blood returning from the body.", kid: "Blood from the body comes back into this chamber.", meta: { Receives: "Sinus venosus" } });
P({ id: "left-atrium", name: "Left Atrium", sys: "circulatory", grp: "Heart", org: "Heart", col: "#BE5358", q: 2, g: [ell(add(heartC, [0.012, 0.012, 0.018]), [0.011, 0.01, 0.011])], d: "The smaller atrium, receiving oxygenated blood from the lungs through the pulmonary vein.", fn: "Passes oxygen-rich blood into the ventricle.", kid: "Blood from the lungs comes into this chamber.", meta: { Receives: "Pulmonary vein" } });
P({ id: "sinus-venosus", name: "Sinus Venosus", sys: "circulatory", grp: "Heart", org: "Heart", col: "#8E4A62", q: 2, g: [ell(add(heartC, [0, 0.018, 0.0]), [0.015, 0.006, 0.01])], d: "A triangular thin-walled chamber on the back of the heart, formed by the joining of the venae cavae.", fn: "Collects blood from the body and passes it to the right atrium; the heartbeat starts here.", kid: "Every heartbeat starts in this little sac.", meta: { Receives: "Two precavals and a postcaval" } });
P({ id: "truncus-arteriosus", name: "Truncus Arteriosus", sys: "circulatory", grp: "Heart", org: "Heart", col: "#C2485A", q: 2, g: [tube([add(heartC, [-0.004, 0.0, 0.022]), add(heartC, [0.0, 0.004, 0.04]), add(heartC, [0.0, 0.01, 0.05])], 0.006)], d: "A tube-like chamber leaving the front of the ventricle, containing a spiral valve.", fn: "Directs blood into the three pairs of aortic arches; its spiral valve helps keep oxygenated and deoxygenated blood partly separate.", kid: "The main pipe leaving a frog's heart splits into three pairs of arches.", meta: { Branches: "Carotid, systemic, pulmocutaneous arches" } });
const arch = (id, name, pts, d, fn, col) => P({ id, name, sys: "circulatory", grp: "Arteries", bi: 1, q: 3, col, g: [tube(pts, 0.0028)], d, fn, kid: "Arteries carry blood away from the heart.", meta: { From: "Truncus arteriosus" } });
arch("carotid-arch", "Carotid Arch", [add(heartC, [0, 0.01, 0.05]), [0.02, 0.1, 0.16], [0.03, 0.12, 0.2]], "The front pair of aortic arches, running forward into the head.", "Supplies the head and brain.");
arch("systemic-arch", "Systemic Arch", [add(heartC, [0, 0.01, 0.05]), [0.03, 0.11, 0.12], [0.03, 0.13, 0.06], [0.006, 0.13, 0.0]], "The middle pair of arches, which curve back and join above the gut to form the dorsal aorta.", "Carries blood to the body and forelimbs.");
arch("pulmocutaneous-arch", "Pulmocutaneous Arch", [add(heartC, [0, 0.01, 0.05]), [0.03, 0.1, 0.1], [0.045, 0.115, 0.06]], "The hind pair of arches, dividing into pulmonary and cutaneous arteries.", "Takes blood to the lungs and the skin to collect oxygen — both are breathing surfaces in a frog.", "#4A63C8");
P({ id: "dorsal-aorta", name: "Dorsal Aorta", sys: "circulatory", grp: "Arteries", q: 3, g: [tube([[0, 0.13, 0.0], [0, 0.128, -0.1], [0, 0.12, -0.18], [0.03, 0.11, -0.21], [0.06, 0.1, -0.22]], [0.004, 0.0035, 0.003, 0.0022, 0.0018])], d: "The main artery running back along the roof of the body cavity.", fn: "Supplies the gut, kidneys, gonads and hind legs.", kid: "Arteries carry blood away from the heart.", meta: { Formed: "Union of the two systemic arches" } });
P({ id: "postcaval-vein", name: "Postcaval Vein", sys: "circulatory", grp: "Veins", mat: "vein", q: 3, g: [tube([[0.004, 0.11, -0.15], [0.004, 0.105, -0.06], [0.0, 0.1, 0.03], add(heartC, [0, 0.018, -0.005])], 0.004)], d: "A large vein running forward from the kidneys through the liver to the sinus venosus.", fn: "Returns blood from the kidneys, liver and hind body to the heart.", kid: "Veins bring blood back to the heart.", meta: { Opens: "Sinus venosus" } });
P({ id: "precaval-vein", name: "Precaval Vein", sys: "circulatory", grp: "Veins", mat: "vein", bi: 1, q: 3, g: [tube([[0.06, 0.1, 0.13], [0.03, 0.1, 0.11], add(heartC, [0.008, 0.018, 0.0])], 0.003)], d: "One of a pair of veins from the head and forelimbs.", fn: "Returns blood from the front of the body to the sinus venosus.", kid: "Veins bring blood back to the heart.", meta: { Opens: "Sinus venosus" } });
P({ id: "hepatic-portal-vein", name: "Hepatic Portal Vein", sys: "circulatory", grp: "Veins", mat: "vein", q: 3, g: [tube([[0.0, 0.08, -0.1], [0.005, 0.085, -0.04], [0.0, 0.09, 0.03]], 0.003)], d: "Carries blood from the intestine to the liver.", fn: "Lets the liver process food absorbed from the gut before it reaches the heart.", kid: "Veins bring blood back to the heart.", meta: { Type: "Portal system" } });
P({ id: "renal-portal-vein", name: "Renal Portal Vein", sys: "circulatory", grp: "Veins", mat: "vein", bi: 1, q: 3, g: [tube([[0.12, 0.08, -0.12], [0.07, 0.1, -0.2], [0.04, 0.115, -0.15], [0.03, 0.12, -0.12]], 0.0025)], d: "Carries blood from the hind legs into the kidney. Frogs, unlike mammals, have a renal portal system.", fn: "Brings blood from the lower body to the kidneys for filtering.", kid: "Veins bring blood back to the heart.", meta: { Type: "Portal system" } });

/* =====================================================================
   RESPIRATORY, DIGESTIVE, UROGENITAL
   ===================================================================== */
P({ id: "lung", name: "Lung", sys: "respiratory", grp: "Lungs", bi: 1, col: "#E59AA3", q: 1, lbl: 1, g: [sdf([S.ell([0.044, 0.112, 0.045], [0.026, 0.022, 0.058])], { k: 0.004, cell: 0.003, n: 0.0015, nf: 90 })],
  d: "A pair of thin, elastic, sac-like lungs with a honeycomb of shallow chambers inside.", fn: "Used for breathing on land; air is forced in by buccal pumping. Underwater and during hibernation the frog breathes through its moist skin instead.",
  kid: "Frogs breathe with lungs AND through their skin!", meta: { Breathing: "Pulmonary, cutaneous and buccal" } });
P({ id: "larynx", name: "Larynx", sys: "respiratory", grp: "Lungs", col: "#E7B6AE", q: 3, g: [ell([0, 0.1, 0.13], [0.008, 0.006, 0.01])], d: "A small voice box behind the mouth, with vocal cords.", fn: "Produces the frog's croaking calls.", kid: "Frogs croak to call each other.", meta: { Role: "Sound production" } });
P({ id: "vocal-sac", name: "Vocal Sac", sex: "m", sys: "respiratory", grp: "Lungs", bi: 1, col: "#D9C47A", q: 2, g: [ell([0.07, 0.1, 0.16], [0.02, 0.016, 0.02])], d: "A thin balloon of skin at each corner of the male's mouth.", fn: "Inflates to amplify the male's mating call — a feature of sexual dimorphism in frogs.", kid: "Male frogs blow up these bubbles to croak loudly.", meta: { Present: "Males only" } });
P({ id: "tongue", name: "Tongue", sys: "digestive", grp: "Mouth", col: "#D9747A", q: 2, g: [sdf([S.cap([0, 0.108, 0.235], [0, 0.11, 0.16], 0.008), ...both([S.cap([0, 0.11, 0.17], [0.012, 0.112, 0.155], 0.004)])], { k: 0.004, cell: 0.002 })],
  d: "A sticky, muscular tongue attached at the FRONT of the mouth, with a forked (bilobed) free end pointing back.", fn: "Flips out in a fraction of a second to catch insects, then carries them back into the mouth.",
  kid: "A frog's tongue is attached at the front and flips out to catch bugs!", meta: { Tip: "Bifid (two-lobed)" } });
P({ id: "esophagus", name: "Oesophagus", sys: "digestive", grp: "Alimentary canal", col: "#D98C84", q: 3, g: [tube([[0, 0.11, 0.13], [0.008, 0.108, 0.08], [0.02, 0.105, 0.05]], 0.006)], d: "A short, wide tube from the pharynx to the stomach.", fn: "Moves swallowed prey quickly into the stomach.", kid: "Food slides down this short tube.", meta: { Length: "Short" } });
P({ id: "stomach", name: "Stomach", sys: "digestive", grp: "Alimentary canal", col: "#E09A86", q: 1, lbl: 1, g: [tube([[0.02, 0.105, 0.05], [0.045, 0.1, 0.01], [0.05, 0.095, -0.04], [0.03, 0.09, -0.07], [0.008, 0.09, -0.065]], [0.012, 0.016, 0.014, 0.01, 0.007])], d: "A curved, J-shaped sac on the left side of the body cavity.", fn: "Stores prey and begins protein digestion with hydrochloric acid and pepsin.", kid: "Frogs swallow bugs whole and digest them in their stomach.", meta: { Enzymes: "Pepsin, HCl" } });
{
  const loop = [[0.008, 0.09, -0.065], [-0.02, 0.085, -0.05], [-0.04, 0.08, -0.07], [-0.02, 0.075, -0.1], [0.02, 0.078, -0.1], [0.03, 0.074, -0.13], [0.0, 0.072, -0.14], [-0.03, 0.075, -0.13], [-0.03, 0.08, -0.16], [0.0, 0.085, -0.17]];
  P({ id: "intestine", name: "Small Intestine", sys: "digestive", grp: "Alimentary canal", col: "#E7A993", q: 1, g: [tube(loop, 0.0065)], d: "The coiled duodenum and ileum, held in place by mesentery.", fn: "Completes digestion with bile and pancreatic juice and absorbs the nutrients into the blood.", kid: "Food is broken down and soaked up in this long coiled tube.", meta: { Parts: "Duodenum, ileum" } });
}
P({ id: "rectum", name: "Rectum", sys: "digestive", grp: "Alimentary canal", col: "#C98E76", q: 2, g: [tube([[0.0, 0.085, -0.17], [0.0, 0.09, -0.2], [0.0, 0.1, -0.225]], [0.01, 0.011, 0.008])], d: "The wide last part of the gut (large intestine).", fn: "Absorbs water and stores faeces before they pass into the cloaca.", kid: "Waste waits here before it leaves the body.", meta: { Opens: "Cloaca" } });
P({ id: "cloaca", name: "Cloaca", sys: "digestive", grp: "Alimentary canal", col: "#B8806A", q: 2, lbl: 1, g: [ell([0, 0.1, -0.235], [0.008, 0.008, 0.012])], d: "A single chamber at the end of the body into which the gut, kidneys and reproductive ducts all open.", fn: "Passes out faeces, urine, eggs or sperm through one opening, the vent.", kid: "Frogs have one opening for poo, pee and eggs.", meta: { Receives: "Rectum, ureters, gonoducts" } });
P({ id: "liver", name: "Liver", sys: "digestive", grp: "Digestive glands", col: "#7B2F27", q: 1, lbl: 1, g: [sdf([S.ell([0.022, 0.085, 0.06], [0.03, 0.012, 0.035]), S.ell([-0.022, 0.085, 0.06], [0.03, 0.012, 0.035]), S.ell([0, 0.083, 0.05], [0.014, 0.01, 0.03])], { k: 0.006, cell: 0.003 })], d: "A large, reddish-brown gland of three lobes (right, left and median) lying around the heart and stomach.", fn: "Makes bile, stores glycogen and fat, and processes nutrients from the gut.", kid: "The liver is the largest gland in a frog.", meta: { Lobes: "Three" } });
P({ id: "gall-bladder", name: "Gall Bladder", sys: "digestive", grp: "Digestive glands", col: "#6C9A42", q: 2, g: [ell([0.006, 0.078, 0.04], [0.006, 0.005, 0.006])], d: "A small greenish sac between the lobes of the liver.", fn: "Stores bile, which it releases into the duodenum to emulsify fats.", kid: "It stores green bile for digesting fat.", meta: { Stores: "Bile" } });
P({ id: "pancreas", name: "Pancreas", sys: "digestive", grp: "Digestive glands", col: "#E3B26E", q: 2, g: [tube([[0.006, 0.09, -0.058], [-0.012, 0.086, -0.05], [-0.028, 0.082, -0.058]], 0.004, { fa: 0.6 })], d: "A thin, pale gland in the loop between the stomach and duodenum.", fn: "Secretes digestive enzymes into the duodenum and hormones (insulin, glucagon) into the blood.", kid: "The pancreas helps digest food and controls blood sugar.", meta: { Secretes: "Pancreatic juice, insulin" } });
P({ id: "spleen", name: "Spleen", sys: "circulatory", grp: "Heart", col: "#7B3050", q: 2, g: [ell([0.012, 0.1, -0.12], [0.006, 0.006, 0.006])], d: "A small, round, dark-red organ in the mesentery near the rectum.", fn: "Stores and filters blood and produces lymphocytes.", kid: "A tiny round organ that filters blood.", meta: { Type: "Lymphoid organ" } });
P({ id: "kidney", name: "Kidney", sys: "urinary", grp: "Excretory", bi: 1, col: "#8E3A34", q: 1, lbl: 1, g: [ell([0.024, 0.124, -0.14], [0.01, 0.006, 0.045])], d: "A pair of long, flat, dark-red kidneys lying against the back of the body cavity.", fn: "Filter waste from the blood and make urine. Frogs are ureotelic — they excrete nitrogen mainly as urea.", kid: "A frog's kidneys clean its blood, just like yours.", meta: { Excretes: "Urea (ureotelic)" } });
P({ id: "ureter", name: "Ureter", sys: "urinary", grp: "Excretory", bi: 1, col: "#D8A56A", q: 3, g: [tube([[0.026, 0.118, -0.18], [0.015, 0.108, -0.215], [0.004, 0.102, -0.232]], 0.0018)], d: "A thin tube from each kidney to the cloaca. In males it also carries sperm (urinogenital duct).", fn: "Carries urine to the cloaca.", kid: "Pee travels down these tubes.", meta: { "In males": "Urinogenital duct" } });
P({ id: "urinary-bladder", name: "Urinary Bladder", sys: "urinary", grp: "Excretory", col: "#E3B062", q: 2, g: [sdf(both([S.ell([0.015, 0.085, -0.215], [0.014, 0.01, 0.014])]), { k: 0.006, cell: 0.0025 })], d: "A thin-walled, two-lobed sac attached to the cloaca.", fn: "Stores urine and lets the frog reabsorb water when it is on dry land.", kid: "Frogs store water in their bladder in case they get dry.", meta: { Shape: "Bilobed" } });
P({ id: "fat-body", name: "Fat Body", sys: "urinary", grp: "Excretory", bi: 1, col: "#EDD27A", mat: "fat", q: 2, g: [0, 1, 2, 3].map((k) => spin([0.03, 0.118, -0.1], [0.05 + k * 0.01, 0.1, -0.06 + k * 0.004], 0.005, { f: 0.7 })), d: "Yellow, finger-shaped bodies attached near the gonads.", fn: "Store fat that fuels the frog through hibernation and the breeding season.", kid: "Frogs store fat here to survive the winter.", meta: { Use: "Energy for hibernation and breeding" } });
P({ id: "testis", name: "Testis", sex: "m", sys: "reproductive", grp: "Reproductive", bi: 1, col: "#EBD58E", q: 2, g: [ell([0.024, 0.118, -0.11], [0.006, 0.005, 0.014])], d: "A yellowish oval body attached to the front of each kidney by a fold of peritoneum.", fn: "Produces sperm, which pass through vasa efferentia into the kidney and out along the urinogenital duct.", kid: "The testes make sperm cells.", meta: { Ducts: "Vasa efferentia → urinogenital duct" } });
P({ id: "ovary", name: "Ovary", sex: "f", sys: "reproductive", grp: "Reproductive", bi: 1, col: "#3A3A3A", q: 2, g: [sdf(Array.from({ length: 7 }, (_, i) => S.sph([0.032 + (i % 2) * 0.008, 0.1 + (i % 3) * 0.006, -0.06 - i * 0.012], 0.013)), { k: 0.008, cell: 0.003, n: 0.002, nf: 120 })], d: "A large, lobed ovary on each side, packed with black-and-white eggs in the breeding season.", fn: "Produces 2 500–3 000 eggs at a time, which are laid in water and fertilised externally.", kid: "A frog can lay thousands of eggs at once!", meta: { Fertilisation: "External, in water" } });
P({ id: "oviduct", name: "Oviduct", sex: "f", sys: "reproductive", grp: "Reproductive", bi: 1, col: "#E7D9C9", q: 3, g: [tube(Array.from({ length: 14 }, (_, i) => [0.06 + Math.sin(i * 1.3) * 0.01, 0.1 + Math.cos(i * 1.3) * 0.006, 0.07 - i * 0.02]), 0.0035)], d: "A long, coiled tube running from near the lungs to the cloaca.", fn: "Coats the eggs in jelly as they pass towards the cloaca.", kid: "Eggs get their jelly coat in this tube.", meta: { Opens: "Cloaca" } });

/* =====================================================================
   NERVOUS SYSTEM & SENSES
   ===================================================================== */
const brainPart = (id, name, g, d, fn, q = 3) => P({ id, name, sys: "nervous", grp: "Brain", org: "Brain", mat: "brain", q, g, d, fn, kid: "A frog's brain is tiny, but it has the same main parts as yours.", meta: { Region: id.includes("olfactory") || id.includes("cerebral") ? "Forebrain" : id.includes("optic") ? "Midbrain" : "Hindbrain" } });
brainPart("olfactory-lobes", "Olfactory Lobes", [ell([0, 0.146, 0.215], [0.007, 0.005, 0.009])], "The small paired lobes at the very front of the brain.", "Process the sense of smell.");
brainPart("cerebral-hemispheres", "Cerebral Hemispheres", [ell([0.006, 0.148, 0.195], [0.006, 0.006, 0.014]), ell([-0.006, 0.148, 0.195], [0.006, 0.006, 0.014])], "Two elongated hemispheres forming most of the forebrain.", "Handle smell-related and simple learned behaviour.", 2);
brainPart("optic-lobes", "Optic Lobes", [ell([0.006, 0.15, 0.172], [0.006, 0.006, 0.006]), ell([-0.006, 0.15, 0.172], [0.006, 0.006, 0.006])], "A pair of rounded lobes forming the roof of the midbrain.", "Process vision — the frog's most important sense for catching prey.", 2);
brainPart("cerebellum", "Cerebellum", [ell([0, 0.149, 0.162], [0.008, 0.002, 0.002])], "A narrow band across the hindbrain behind the optic lobes; small in frogs.", "Coordinates movement and balance.");
brainPart("medulla-oblongata", "Medulla Oblongata", [tube([[0, 0.147, 0.16], [0, 0.146, 0.14]], [0.005, 0.004])], "The rear of the brain, continuous with the spinal cord through the foramen magnum.", "Controls breathing, heartbeat and other automatic functions. Ten pairs of cranial nerves arise from the brain.");
P({ id: "spinal-cord", name: "Spinal Cord", sys: "nervous", grp: "Central nervous system", q: 2, g: [tube([[0, 0.147, 0.14], sp(0.05), sp(-0.05), sp(-0.12)], [0.003, 0.0025, 0.0018, 0.0012])], d: "The nerve cord running through the short vertebral column, giving off ten pairs of spinal nerves.", fn: "Relays messages between the brain and body and controls reflexes.", kid: "Messages travel up and down this cord.", meta: { Nerves: "10 pairs of spinal nerves" } });
P({ id: "sciatic-nerve", name: "Sciatic Nerve", sys: "nervous", grp: "Peripheral nerves", bi: 1, q: 3, g: [tube([[0.01, 0.135, -0.11], J.hip, lerp(J.hip, J.knee, 0.6), J.knee], 0.002)], d: "The large nerve of the hind leg.", fn: "Controls the muscles of the leg used in jumping and swimming.", kid: "This nerve makes the frog's legs kick.", meta: { From: "Sacral plexus" } });
P({ id: "brachial-nerve", name: "Brachial Nerve", sys: "nervous", grp: "Peripheral nerves", bi: 1, q: 3, g: [tube([[0.008, 0.145, 0.07], J.shoulder, J.elbow], 0.0016)], d: "The main nerve of the forelimb.", fn: "Controls the arm muscles.", kid: "This nerve moves the frog's arms.", meta: { From: "Spinal nerve 2" } });
P({ id: "eye", name: "Eye", sys: "sensory", grp: "Senses", bi: 1, col: "#C8A74A", q: 1, lbl: 1, g: [ell([0.052, 0.168, 0.155], [0.026, 0.024, 0.028])], d: "A large, bulging eye on top of the head, protected by a see-through third eyelid, the nictitating membrane.", fn: "Gives a wide field of view to spot prey and predators while the frog sits almost submerged. The eyes also sink down to help push food down the throat.", kid: "Frogs use their eyes to help swallow — they push them down into their mouth!", meta: { Extra: "Nictitating membrane" } });
P({ id: "tympanum", name: "Tympanum", sys: "sensory", grp: "Senses", bi: 1, col: "#8A7A4A", q: 2, g: [ell([0.088, 0.15, 0.105], [0.003, 0.016, 0.016])], d: "The round eardrum on the side of the head behind each eye. Frogs have no outer ear.", fn: "Receives sound vibrations, which the columella bone carries to the inner ear.", kid: "That round circle behind a frog's eye is its eardrum.", meta: { Ear: "Middle and inner ear only" } });
P({ id: "skin", name: "Skin", sys: "integumentary", grp: "Integument", mat: "frogskin", q: 1, g: [sdf([
  S.ell([0, 0.12, 0.0], [0.1, 0.06, 0.2]), S.ell([0, 0.125, 0.17], [0.09, 0.04, 0.09]),
  ...both([S.sph([0.052, 0.168, 0.155], 0.03), S.cap(J.shoulder, J.elbow, 0.022, 0.016), S.cap(J.elbow, J.wrist, 0.016, 0.012), S.cap(J.hip, J.knee, 0.04, 0.03), S.cap(J.knee, J.ankle, 0.03, 0.016), S.cap(J.ankle, J.tarsus, 0.014, 0.01), S.ell(add(J.tarsus, [0.01, -0.012, 0.07]), [0.04, 0.006, 0.07])]),
], { k: 0.035, cell: 0.008 })],
  d: "Smooth, slippery skin kept moist by mucous glands, with no scales. The back is olive-green with dark spots; the belly is pale.", fn: "A breathing surface (cutaneous respiration), especially underwater and during hibernation. Frogs do not drink — they absorb water through the skin. It also changes colour for camouflage.",
  kid: "Frogs drink water through their skin instead of their mouth!", meta: { Glands: "Mucous and poison glands" } });

export default {
  id: "frog", name: "Frog", title: "Frog Atlas",
  blurb: "Rana tigrina, the Indian bullfrog of school biology: skeleton, three-chambered heart, lungs, gut and urogenital system.",
  sexes: true,
  camera: { dir: [0.55, 0.55, 0.62] },
  systems: [
    { id: "skeletal", name: "Skeleton", color: "#E6D9BF" },
    { id: "muscular", name: "Muscles", color: "#C4515C" },
    { id: "circulatory", name: "Heart & vessels", color: "#C8323B" },
    { id: "respiratory", name: "Respiratory", color: "#E891A0" },
    { id: "digestive", name: "Digestive", color: "#D9925E" },
    { id: "urinary", name: "Excretory", color: "#E0A73F" },
    { id: "reproductive", name: "Reproductive", color: "#E57FB0" },
    { id: "nervous", name: "Nervous system", color: "#E8BE3A" },
    { id: "sensory", name: "Sense organs", color: "#7FB2D6" },
    { id: "integumentary", name: "Skin", color: "#6F8F3A", off: 1 },
  ],
  presets: [
    { id: "all", name: "All", sys: ["skeletal", "muscular", "circulatory", "respiratory", "digestive", "urinary", "reproductive", "nervous", "sensory"] },
    { id: "skeleton", name: "Skeleton", sys: ["skeletal"] },
    { id: "organs", name: "Organs", sys: ["circulatory", "respiratory", "digestive", "urinary", "reproductive", "nervous", "sensory"] },
    { id: "outside", name: "Outside", sys: ["integumentary", "sensory"] },
  ],
  parts,
};
