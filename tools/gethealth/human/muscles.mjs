/**
 * Muscular system. Limb muscles are fusiform bellies (spin) oriented between
 * origin and insertion; the broad trunk muscles are pillowed sheets wrapped
 * onto an elliptical model of the torso (see TORSO / BACK tables below).
 * Every muscle is authored on the left and mirrored (bi) unless midline.
 */
import { add, spin, tube, ell, sheet, sdf, S, makePart } from "../lib.mjs";
import { HAND, FOOT, TORSO, canalAt } from "./rig.mjs";

const parts = [];
const H = (u, v, w) => HAND.at([u, v, w]);
const F = (u, v, w) => FOOT.at([u, v, w]);

/* Torso wrap tables: [y, half-width, half-depth, centre z]. The back table
   is broader at the top because it runs out over the shoulders. */
const FRONT = TORSO;
const BACK = [
  [0.86, 0.15, 0.1, -0.004], [0.96, 0.14, 0.098, -0.002], [1.04, 0.13, 0.094, 0.004], [1.12, 0.134, 0.1, 0.002],
  [1.2, 0.142, 0.108, 0.0], [1.28, 0.148, 0.112, -0.004], [1.36, 0.156, 0.108, -0.008], [1.42, 0.172, 0.1, -0.014],
  [1.46, 0.168, 0.09, -0.02], [1.5, 0.09, 0.07, -0.018], [1.55, 0.052, 0.05, -0.018], [1.62, 0.036, 0.04, -0.03],
];
const R0 = 0.13;
/** Outline given as [angle°, y] pairs → sheet coordinates (arc length, y). */
const arc = (pts, a0) => pts.map(([deg, y]) => [((deg - a0) * Math.PI / 180) * R0, y]);
const wrapped = (pts, a0, th, tab, off = 0.004, extra = {}) => sheet(arc(pts, a0), th, { wr: { tab, R0, a0, off }, ...extra });

/* One muscle. `m` = [origin, insertion, action, nerve]. */
function M(id, name, grp, g, m, d, fn, extra = {}) {
  const [origin, insertion, action, nerve] = m;
  parts.push(makePart({
    id, name, sys: "muscular", grp, bi: 1, q: 3, g, d, fn: fn || action,
    kid: extra.kid || KIDS[grp] || "Muscles pull on bones to move you — they can only pull, never push.",
    meta: { Origin: origin, Insertion: insertion, Action: action, Nerve: nerve },
    ...extra,
  }));
}
const KIDS = {
  "Face": "You use more than 40 small muscles in your face to smile, frown and blink.",
  "Neck": "Your neck muscles hold up your head, which weighs about as much as a bowling ball.",
  "Shoulder": "Your shoulder is the most movable joint in your body, thanks to these muscles.",
  "Chest": "Chest muscles help you push, hug and throw.",
  "Back": "Back muscles keep you standing tall.",
  "Abdomen": "Your tummy muscles protect your organs and help you sit up.",
  "Arm": "Bend your elbow and feel your biceps get fat and hard.",
  "Forearm": "Forearm muscles move your fingers using long tendons like puppet strings.",
  "Hand": "Tiny muscles in your hand let you write and pick up small things.",
  "Hip": "Your bottom muscle, the gluteus maximus, is the biggest muscle in your body.",
  "Thigh": "Thigh muscles are some of the strongest in your body.",
  "Leg": "Calf muscles lift your whole body every time you stand on tiptoe.",
};

/* =====================================================================
   HEAD & NECK
   ===================================================================== */
M("frontalis", "Frontalis", "Face", [ell([0.022, 1.686, 0.079], [0.023, 0.03, 0.0045], { e: [-22, 17, 0] })],
  ["Galea aponeurotica", "Skin of the eyebrows", "Raises the eyebrows and wrinkles the forehead", "Facial nerve (CN VII)"],
  "The front belly of the occipitofrontalis, a thin sheet over the forehead.", null, { q: 2 });
M("temporalis", "Temporalis", "Face", [ell([0.069, 1.648, 0.006], [0.0065, 0.036, 0.042], { e: [0, -6, 0] })],
  ["Temporal fossa of the skull", "Coronoid process of the mandible", "Closes the jaw and pulls it backwards", "Mandibular nerve (CN V3)"],
  "A fan-shaped chewing muscle on the side of the head; you can feel it bulge at your temple when you clench your teeth.", null, { q: 2 });
M("masseter", "Masseter", "Face", [spin([0.058, 1.598, 0.036], [0.051, 1.53, 0.016], 0.012, { f: 0.5, nz: [1, 0, 0.2] })],
  ["Zygomatic arch", "Angle and ramus of the mandible", "Clenches the jaw with great force", "Mandibular nerve (CN V3)"],
  "A thick, rectangular muscle over the angle of the jaw — for its size, the strongest muscle in the body.", null, { q: 2, kid: "Your masseter can bite with a force of around 70 kg!" });
M("orbicularis-oculi", "Orbicularis Oculi", "Face", [tube(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [0.033 + Math.cos(a) * 0.02, 1.613 + Math.sin(a) * 0.017, 0.078 + Math.cos(a) * 0.004]; }), 0.003, { cl: 1, fa: 0.5 })],
  ["Medial orbital margin", "Skin around the eyelids", "Closes the eyelids, blinks and squints", "Facial nerve (CN VII)"],
  "A ring of muscle around each eye within the eyelids.", null, { kid: "You blink about 15 times a minute using this muscle." });
parts.push(makePart({
  id: "orbicularis-oris", name: "Orbicularis Oris", sys: "muscular", grp: "Face", q: 3,
  g: [tube(Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [Math.cos(a) * 0.022, 1.543 + Math.sin(a) * 0.012, 0.086 - Math.abs(Math.cos(a)) * 0.012]; }), 0.0034, { cl: 1, fa: 0.6 })],
  d: "The ring of muscle inside the lips.", fn: "Closes and purses the lips — for kissing, whistling, speaking and keeping food in the mouth.",
  kid: "Pucker up! This ring of muscle shapes your lips.", meta: { Origin: "Maxilla, mandible and surrounding muscles", Insertion: "Skin of the lips", Action: "Closes and protrudes the lips", Nerve: "Facial nerve (CN VII)" },
}));
M("zygomaticus-major", "Zygomaticus Major", "Face", [spin([0.052, 1.598, 0.062], [0.026, 1.548, 0.087], 0.0042, { f: 0.5, nz: [0.4, 0, 1] })],
  ["Zygomatic bone", "Corner of the mouth", "Pulls the corner of the mouth up and out — the smiling muscle", "Facial nerve (CN VII)"],
  "A slender strap running from the cheekbone to the corner of the mouth.", null, { kid: "This is your smiling muscle!" });
M("buccinator", "Buccinator", "Face", [ell([0.037, 1.55, 0.058], [0.004, 0.012, 0.018], { e: [0, -30, 0] })],
  ["Alveolar processes of the maxilla and mandible", "Corner of the mouth", "Presses the cheek against the teeth", "Facial nerve (CN VII)"],
  "The muscle of the cheek, lying deep to the other facial muscles.", "Keeps food between the teeth while chewing and lets you blow out — trumpeters rely on it.");
M("sternocleidomastoid", "Sternocleidomastoid", "Neck", [spin([0.018, 1.438, 0.07], [0.058, 1.585, -0.026], 0.011, { f: 0.62, nz: [1, 0, 0.6] }), spin([0.045, 1.442, 0.068], [0.056, 1.58, -0.022], 0.007, { f: 0.5, nz: [1, 0, 0.4] })],
  ["Manubrium of sternum and medial clavicle", "Mastoid process of the temporal bone", "Turns the head to the opposite side and flexes the neck", "Accessory nerve (CN XI)"],
  "The prominent diagonal strap on each side of the neck.", null, { q: 2, lbl: 1 });
M("scalenes", "Scalene Muscles", "Neck", [spin([0.024, 1.545, -0.012], [0.042, 1.435, 0.024], 0.0065, { f: 0.7 }), spin([0.028, 1.535, -0.016], [0.058, 1.43, 0.0], 0.0065, { f: 0.7 })],
  ["Transverse processes of C2–C7", "First and second ribs", "Tilt the neck to the side and lift the upper ribs in deep breathing", "Cervical spinal nerves"],
  "Three muscles (anterior, middle and posterior) at the side of the neck; the brachial plexus passes between them.");
M("levator-scapulae", "Levator Scapulae", "Neck", [spin([0.03, 1.565, -0.022], [0.078, 1.44, -0.096], 0.0075, { f: 0.7 })],
  ["Transverse processes of C1–C4", "Superior angle of the scapula", "Lifts the shoulder blade and tilts the neck", "Dorsal scapular nerve (C5)"],
  "A strap muscle at the back and side of the neck — a common spot for a stiff neck.");

/* =====================================================================
   SHOULDER & BACK
   ===================================================================== */
M("trapezius", "Trapezius", "Back", [wrapped([[180, 1.64], [160, 1.63], [148, 1.56], [128, 1.48], [98, 1.458], [102, 1.43], [126, 1.405], [150, 1.34], [170, 1.22], [180, 1.16]], 180, 0.008, BACK, 0.006, { fib: 20 })],
  ["Occipital bone, nuchal ligament, spines of C7–T12", "Lateral clavicle, acromion and spine of the scapula", "Shrugs, braces and rotates the shoulder blade; extends the neck", "Accessory nerve (CN XI)"],
  "A large, flat diamond-shaped muscle covering the upper back and back of the neck.", null, { q: 1, lbl: 1 });
M("latissimus-dorsi", "Latissimus Dorsi", "Back", [wrapped([[180, 1.3], [180, 1.0], [152, 0.992], [118, 1.02], [96, 1.14], [88, 1.28], [94, 1.345], [118, 1.34], [146, 1.29]], 180, 0.007, BACK, 0.003), spin([0.13, 1.3, -0.075], [0.19, 1.36, -0.012], 0.014, { f: 0.4, nz: [0.4, 0, -1] })],
  ["Spines of T7–L5, thoracolumbar fascia, iliac crest, lower ribs", "Floor of the intertubercular groove of the humerus", "Pulls the arm down and back and rotates it inwards", "Thoracodorsal nerve (C6–C8)"],
  "The broadest muscle of the back, sweeping from the lower spine to the armpit.", "Pulls the arm down and back — the swimming, rowing and pull-up muscle.", { q: 2, lbl: 1 });
M("rhomboid-major", "Rhomboid Major", "Back", [wrapped([[180, 1.44], [180, 1.3], [152, 1.26], [152, 1.4]], 180, 0.006, BACK, 0.0)],
  ["Spines of T2–T5", "Medial border of the scapula below its spine", "Pulls the shoulder blades together", "Dorsal scapular nerve (C5)"],
  "A flat, quadrilateral muscle under the trapezius between the spine and shoulder blade.");
M("rhomboid-minor", "Rhomboid Minor", "Back", [wrapped([[180, 1.49], [180, 1.45], [154, 1.405], [153, 1.44]], 180, 0.005, BACK, 0.0)],
  ["Spines of C7–T1", "Medial border of the scapula at its spine", "Pulls the shoulder blade towards the spine", "Dorsal scapular nerve (C5)"],
  "A narrow strap just above the rhomboid major.");
{
  // Muscles lying on the scapula share its plane (see skeleton.mjs).
  const ux = [0.8645, 0, 0.5026], back = [0.0035, 0, -0.006], front = [-0.0035, 0, 0.006];
  const onScap = (pts, th, off) => sheet(pts, th, { c: add([0.074, 0, -0.1], off), ux, uy: [0, 1, 0], bend: -0.22 });
  M("supraspinatus", "Supraspinatus", "Shoulder", [spin([0.085, 1.425, -0.104], [0.176, 1.418, -0.02], 0.01, { f: 0.7, nz: [0, 1, -0.4] })],
    ["Supraspinous fossa of the scapula", "Greater tubercle of the humerus", "Starts lifting the arm out to the side", "Suprascapular nerve (C5)"],
    "A rotator-cuff muscle lying above the spine of the scapula; its tendon is the one most often torn.", null, { kid: "Four 'rotator cuff' muscles hold your arm bone in its socket." });
  M("infraspinatus", "Infraspinatus", "Shoulder", [onScap([[0.0, 1.39], [0.085, 1.405], [0.092, 1.37], [0.062, 1.31], [0.032, 1.27], [0.012, 1.262], [-0.004, 1.3]], 0.012, back)],
    ["Infraspinous fossa of the scapula", "Greater tubercle of the humerus", "Rotates the arm outwards", "Suprascapular nerve (C5–C6)"],
    "A thick triangular rotator-cuff muscle covering most of the back of the scapula.");
  M("subscapularis", "Subscapularis", "Shoulder", [onScap([[0.0, 1.43], [0.07, 1.425], [0.092, 1.39], [0.06, 1.3], [0.015, 1.262], [-0.004, 1.34]], 0.012, front)],
    ["Subscapular fossa (front of the scapula)", "Lesser tubercle of the humerus", "Rotates the arm inwards", "Subscapular nerves (C5–C6)"],
    "The largest rotator-cuff muscle, lying on the front of the scapula against the ribs.");
}
M("teres-minor", "Teres Minor", "Shoulder", [spin([0.145, 1.35, -0.085], [0.195, 1.385, -0.036], 0.007, { f: 0.7, nz: [0, 0, -1] })],
  ["Lateral border of the scapula", "Greater tubercle of the humerus", "Rotates the arm outwards", "Axillary nerve (C5)"],
  "A small rotator-cuff muscle below the infraspinatus.");
M("teres-major", "Teres Major", "Shoulder", [spin([0.105, 1.275, -0.1], [0.19, 1.33, -0.022], 0.011, { f: 0.65, nz: [0, 0, -1] })],
  ["Inferior angle of the scapula", "Medial lip of the intertubercular groove", "Pulls the arm down and rotates it inwards", "Lower subscapular nerve (C5–C7)"],
  "A thick rounded muscle forming the lower border of the armpit from behind.");
M("deltoid", "Deltoid", "Shoulder", [
  spin([0.14, 1.444, 0.022], [0.213, 1.29, -0.012], 0.017, { f: 0.55, nz: [0.5, 0, 1], bow: 0.08 }),
  spin([0.188, 1.452, -0.014], [0.218, 1.29, -0.02], 0.019, { f: 0.55, nz: [1, 0, 0], bow: 0.1 }),
  spin([0.15, 1.432, -0.07], [0.214, 1.29, -0.03], 0.017, { f: 0.55, nz: [0.4, 0, -1], bow: 0.08 })],
  ["Lateral clavicle, acromion and spine of the scapula", "Deltoid tuberosity of the humerus", "Lifts the arm forwards, sideways and backwards", "Axillary nerve (C5–C6)"],
  "The thick triangular muscle that caps the shoulder, with front, middle and back fibres.", null, { q: 1, lbl: 1 });

/* =====================================================================
   CHEST & ABDOMEN
   ===================================================================== */
M("pectoralis-major", "Pectoralis Major", "Chest", [wrapped([[2, 1.43], [40, 1.442], [62, 1.42], [72, 1.36], [60, 1.265], [30, 1.232], [4, 1.25]], 0, 0.011, FRONT, 0.008, { fib: -30 }), spin([0.12, 1.37, 0.07], [0.195, 1.35, 0.004], 0.014, { f: 0.45, nz: [0.2, 0, 1] })],
  ["Clavicle, sternum, costal cartilages 1–6", "Lateral lip of the intertubercular groove of the humerus", "Pulls the arm forwards and across the chest and rotates it inwards", "Medial and lateral pectoral nerves (C5–T1)"],
  "The large fan-shaped muscle of the chest.", null, { q: 1, lbl: 1 });
M("pectoralis-minor", "Pectoralis Minor", "Chest", [spin([0.062, 1.33, 0.1], [0.148, 1.415, 0.016], 0.013, { f: 0.35, nz: [0.2, 0, 1] })],
  ["Ribs 3–5", "Coracoid process of the scapula", "Pulls the shoulder blade forwards and down", "Medial pectoral nerve (C8–T1)"],
  "A thin triangular muscle underneath the pectoralis major.");
M("serratus-anterior", "Serratus Anterior", "Chest", [wrapped([[62, 1.4], [70, 1.36], [60, 1.34], [74, 1.31], [62, 1.29], [78, 1.26], [66, 1.24], [82, 1.21], [72, 1.19], [96, 1.2], [104, 1.3], [110, 1.4]], 0, 0.007, FRONT, 0.004)],
  ["Outer surfaces of ribs 1–8", "Medial border of the scapula (front surface)", "Holds the shoulder blade against the ribs and swings it forwards — the punching muscle", "Long thoracic nerve (C5–C7)"],
  "A saw-toothed muscle on the side of the chest.", null, { kid: "Boxers use this muscle to punch. Its edge looks like the teeth of a saw." });
M("intercostal-muscles", "Intercostal Muscles", "Chest", [wrapped([[18, 1.4], [70, 1.39], [100, 1.34], [110, 1.18], [80, 1.12], [30, 1.18], [14, 1.26]], 0, 0.004, FRONT, -0.003)],
  ["Lower border of each rib", "Upper border of the rib below", "Raise and lower the ribs during breathing", "Intercostal nerves (T1–T11)"],
  "Three thin layers of muscle (external, internal and innermost) filling the spaces between the ribs.", null, { kid: "These muscles between your ribs help your chest get bigger when you breathe in." });
{
  const rect = (y0, y1, w0, w1) => [[1.6, y1], [w1, y1], [w0, y0], [1.6, y0]];
  M("rectus-abdominis", "Rectus Abdominis", "Abdomen", [
    wrapped(rect(1.17, 1.236, 15, 16), 0, 0.009, FRONT, 0.006, { fib: 90 }),
    wrapped(rect(1.098, 1.162, 14, 15), 0, 0.01, FRONT, 0.006, { fib: 90 }),
    wrapped(rect(1.03, 1.09, 12.5, 14), 0, 0.01, FRONT, 0.006, { fib: 90 }),
    wrapped([[1.6, 1.022], [12.5, 1.022], [9, 0.95], [5, 0.885], [1.6, 0.885]], 0, 0.009, FRONT, 0.006, { fib: 90 })],
    ["Pubic crest and pubic symphysis", "Xiphoid process and costal cartilages 5–7", "Bends the trunk forwards and supports the abdominal wall", "Intercostal nerves T7–T11, subcostal nerve"],
    "The long, strap-like 'six-pack' muscle down the front of the abdomen, divided into blocks by three or four tendinous intersections.", null, { q: 1, lbl: 1 });
}
M("external-oblique", "External Oblique", "Abdomen", [wrapped([[16, 1.25], [60, 1.26], [92, 1.22], [104, 1.12], [100, 1.02], [60, 0.95], [30, 0.92], [18, 0.96], [16, 1.1]], 0, 0.007, FRONT, 0.004, { fib: -50 })],
  ["Outer surfaces of ribs 5–12", "Linea alba, pubic tubercle and iliac crest", "Twists and bends the trunk and compresses the abdomen", "Intercostal nerves T7–T11, subcostal nerve"],
  "The largest and outermost of the flat abdominal muscles, its fibres running down and forwards like hands in front pockets.", null, { q: 2 });
M("internal-oblique", "Internal Oblique", "Abdomen", [wrapped([[16, 1.2], [70, 1.16], [100, 1.08], [98, 1.0], [60, 0.95], [22, 0.94], [16, 1.05]], 0, 0.005, FRONT, 0.0, { fib: 50 })],
  ["Thoracolumbar fascia, iliac crest, inguinal ligament", "Lower ribs, linea alba and pubis", "Twists the trunk to the same side and compresses the abdomen", "Intercostal nerves T7–T12, L1"],
  "The middle layer of the abdominal wall, its fibres at right angles to the external oblique.");
M("transversus-abdominis", "Transversus Abdominis", "Abdomen", [wrapped([[16, 1.18], [100, 1.14], [110, 1.0], [60, 0.94], [18, 0.94]], 0, 0.004, FRONT, -0.004, { fib: 0 })],
  ["Lower costal cartilages, thoracolumbar fascia, iliac crest", "Linea alba and pubic crest", "Squeezes the abdomen like a corset, stabilising the spine", "Intercostal nerves T7–T12, L1"],
  "The deepest abdominal muscle, with horizontal fibres.");
{
  const column = (x, rTop, rBot) => {
    const pts = [];
    for (let y = 0.96; y <= 1.47; y += 0.05) { const c = canalAt(Math.max(y, 0.985)); pts.push([x, y, (y < 0.985 ? -0.07 : c[2] - 0.028) - (x > 0.035 ? -0.004 : 0)]); }
    return tube(pts, pts.map((_, i) => rBot + (rTop - rBot) * (i / (pts.length - 1))), { fa: 0.6, up: [1, 0, 0] });
  };
  M("erector-spinae", "Erector Spinae", "Back", [column(0.012, 0.005, 0.009), column(0.026, 0.008, 0.013), column(0.044, 0.007, 0.011)],
    ["Sacrum, iliac crest and spines of the lumbar vertebrae", "Ribs, vertebrae and the base of the skull", "Straightens and arches the back and holds the spine upright", "Dorsal rami of the spinal nerves"],
    "Three columns of muscle — iliocostalis, longissimus and spinalis — running up either side of the spine.", null, { q: 2 });
}
M("quadratus-lumborum", "Quadratus Lumborum", "Back", [spin([0.05, 1.16, -0.045], [0.068, 0.995, -0.045], 0.013, { f: 0.6, nz: [0, 0, -1] })],
  ["Iliac crest", "Rib 12 and the lumbar transverse processes", "Hitches the hip and bends the trunk sideways", "Subcostal nerve and L1–L4"],
  "A deep, four-sided muscle of the lower back wall — a frequent source of lower back pain.");
M("psoas-major", "Psoas Major", "Hip", [tube([[0.026, 1.14, -0.028], [0.034, 1.06, -0.018], [0.05, 0.98, -0.004], [0.066, 0.92, 0.024], [0.09, 0.88, 0.02], [0.1, 0.86, 0.004]], [0.009, 0.016, 0.018, 0.013, 0.009, 0.006])],
  ["Bodies and transverse processes of T12–L5", "Lesser trochanter of the femur", "Bends the hip (lifts the thigh) and bends the trunk forwards", "Lumbar plexus (L1–L3)"],
  "A long, thick muscle beside the lumbar spine that joins the iliacus to form the iliopsoas, the strongest hip flexor.", null, { q: 2 });
M("iliacus", "Iliacus", "Hip", [ell([0.078, 0.975, 0.004], [0.034, 0.038, 0.008], { e: [8, -55, -14] }), spin([0.078, 0.95, 0.02], [0.1, 0.862, 0.006], 0.012, { f: 0.6 })],
  ["Iliac fossa of the hip bone", "Lesser trochanter of the femur", "Bends the hip", "Femoral nerve (L2–L3)"],
  "A fan-shaped muscle filling the inner bowl of the ilium.");
M("gluteus-maximus", "Gluteus Maximus", "Hip", [sdf([S.ell([0.086, 0.872, -0.074], [0.064, 0.086, 0.034], { e: [0, -18, -24] })], { k: 0.01, cell: 0.004 })],
  ["Ilium, sacrum, coccyx", "Iliotibial tract and gluteal tuberosity of the femur", "Straightens the hip powerfully — climbing, running, standing up", "Inferior gluteal nerve (L5–S2)"],
  "The largest muscle in the body, forming the shape of the buttock.", null, { q: 1, lbl: 1 });
M("gluteus-medius", "Gluteus Medius", "Hip", [ell([0.114, 0.962, -0.036], [0.045, 0.04, 0.016], { e: [0, -42, -12] })],
  ["Outer surface of the ilium", "Greater trochanter of the femur", "Lifts the leg sideways and keeps the pelvis level when you walk", "Superior gluteal nerve (L4–S1)"],
  "A fan-shaped muscle on the upper outer hip, partly under the gluteus maximus.");
M("gluteus-minimus", "Gluteus Minimus", "Hip", [ell([0.118, 0.952, -0.022], [0.034, 0.03, 0.01], { e: [0, -48, -12] })],
  ["Outer surface of the ilium, below gluteus medius", "Greater trochanter of the femur", "Lifts the leg sideways and rotates the thigh inwards", "Superior gluteal nerve (L4–S1)"],
  "The smallest and deepest of the three gluteal muscles.");
M("tensor-fasciae-latae", "Tensor Fasciae Latae", "Hip", [spin([0.122, 0.985, 0.05], [0.138, 0.86, 0.028], 0.011, { f: 0.6, nz: [1, 0, 0.4] })],
  ["Anterior superior iliac spine", "Iliotibial tract", "Tightens the iliotibial band and helps lift and turn the thigh inwards", "Superior gluteal nerve (L4–S1)"],
  "A short muscle at the front edge of the hip, enclosed in the fascia lata.");
parts.push(makePart({
  id: "iliotibial-tract", name: "Iliotibial Tract", sys: "muscular", grp: "Thigh", bi: 1, mat: "tendon", q: 3, aka: "IT band",
  g: [tube([[0.138, 0.86, 0.028], [0.146, 0.72, 0.012], [0.138, 0.58, 0.0], [0.13, 0.47, -0.006]], 0.0045, { fa: 0.35, up: [0, 0, 1] })],
  d: "A long, thick band of fascia running down the outside of the thigh from the hip to the tibia.",
  fn: "Transmits the pull of the gluteus maximus and tensor fasciae latae to the knee and steadies it; overuse causes 'IT band syndrome' in runners.",
  kid: "A tough strap down the outside of your thigh.", meta: { From: "Iliac crest", To: "Lateral condyle of the tibia (Gerdy's tubercle)" },
}));

/* =====================================================================
   ARM & FOREARM
   ===================================================================== */
M("biceps-brachii", "Biceps Brachii", "Arm", [spin([0.168, 1.37, 0.004], [0.245, 1.1, 0.004], 0.019, { f: 0.75, nz: [0.3, 0, 1], bias: 0.55 }), tube([[0.245, 1.1, 0.004], [0.252, 1.075, -0.008]], 0.0035), tube([[0.165, 1.415, 0.01], [0.168, 1.38, 0.006]], 0.003)],
  ["Supraglenoid tubercle (long head) and coracoid process (short head)", "Radial tuberosity and bicipital aponeurosis", "Bends the elbow and turns the palm up", "Musculocutaneous nerve (C5–C6)"],
  "The two-headed muscle on the front of the upper arm.", null, { q: 1, lbl: 1 });
M("brachialis", "Brachialis", "Arm", [spin([0.198, 1.25, -0.014], [0.232, 1.1, -0.018], 0.016, { f: 0.6, nz: [0.3, 0, 1] })],
  ["Front of the lower humerus", "Coronoid process and tuberosity of the ulna", "Bends the elbow in any position — the main elbow flexor", "Musculocutaneous nerve (C5–C6)"],
  "A broad muscle lying under the biceps.");
M("coracobrachialis", "Coracobrachialis", "Arm", [spin([0.15, 1.414, 0.012], [0.196, 1.29, -0.02], 0.0085, { f: 0.7 })],
  ["Coracoid process of the scapula", "Middle of the medial humerus", "Pulls the arm forwards and towards the body", "Musculocutaneous nerve (C5–C7)"],
  "A slender muscle in the upper inner arm; the musculocutaneous nerve pierces it.");
M("triceps-brachii", "Triceps Brachii", "Arm", [spin([0.176, 1.37, -0.052], [0.223, 1.14, -0.054], 0.022, { f: 0.7, nz: [0.3, 0, -1] }), spin([0.2, 1.335, -0.038], [0.228, 1.155, -0.048], 0.015, { f: 0.6, nz: [1, 0, -0.5] })],
  ["Infraglenoid tubercle (long head) and back of the humerus (lateral and medial heads)", "Olecranon of the ulna", "Straightens the elbow", "Radial nerve (C6–C8)"],
  "The three-headed muscle filling the back of the upper arm.", null, { q: 1, lbl: 1 });
const flex = (a, b, r, nz = [0, 0, 1], bias = 0.3) => spin(a, b, r, { f: 0.65, nz, bias });
M("brachioradialis", "Brachioradialis", "Forearm", [flex([0.244, 1.19, -0.028], [0.31, 0.868, 0.012], 0.012, [1, 0, 0.4])],
  ["Lateral supracondylar ridge of the humerus", "Radial styloid process", "Bends the elbow with the thumb pointing up", "Radial nerve (C5–C6)"],
  "The muscle forming the outer bulge of the forearm below the elbow.", null, { q: 2 });
M("pronator-teres", "Pronator Teres", "Forearm", [flex([0.212, 1.116, -0.026], [0.262, 1.03, -0.004], 0.009, [0, 0, 1], 0.4)],
  ["Medial epicondyle and coronoid process", "Middle of the lateral radius", "Turns the palm down", "Median nerve (C6–C7)"],
  "A short diagonal muscle across the upper front forearm.");
M("flexor-carpi-radialis", "Flexor Carpi Radialis", "Forearm", [flex([0.215, 1.11, -0.018], [0.292, 0.872, 0.018], 0.0085)],
  ["Medial epicondyle of the humerus", "Bases of the 2nd and 3rd metacarpals", "Bends the wrist and tilts it towards the thumb", "Median nerve (C6–C7)"],
  "A superficial forearm flexor whose tendon you can feel at the wrist.");
M("palmaris-longus", "Palmaris Longus", "Forearm", [flex([0.217, 1.108, -0.016], [0.286, 0.872, 0.022], 0.006)],
  ["Medial epicondyle of the humerus", "Palmar aponeurosis", "Tightens the palm and helps bend the wrist", "Median nerve (C7–C8)"],
  "A thin muscle with a long tendon — missing in about 1 in 7 people, and used by surgeons for tendon grafts.", null, { kid: "Press your thumb and little finger together — about 1 in 7 people won't see this tendon pop up." });
M("flexor-carpi-ulnaris", "Flexor Carpi Ulnaris", "Forearm", [flex([0.212, 1.115, -0.036], [0.276, 0.862, 0.004], 0.009, [-0.6, 0, 0.5])],
  ["Medial epicondyle and olecranon", "Pisiform, hamate and 5th metacarpal", "Bends the wrist and tilts it towards the little finger", "Ulnar nerve (C7–T1)"],
  "The most medial superficial forearm flexor.");
M("flexor-digitorum-superficialis", "Flexor Digitorum Superficialis", "Forearm", [flex([0.222, 1.1, -0.022], [0.284, 0.88, 0.01], 0.012, [0, 0, 1], 0.4)],
  ["Medial epicondyle, coronoid process and radius", "Middle phalanges of the four fingers", "Bends the fingers at their middle joints", "Median nerve (C7–T1)"],
  "The largest superficial forearm muscle, sending four tendons through the carpal tunnel.");
M("extensor-carpi-radialis-longus", "Extensor Carpi Radialis Longus", "Forearm", [flex([0.25, 1.15, -0.032], [0.304, 0.87, 0.0], 0.009, [1, 0, -0.2])],
  ["Lateral supracondylar ridge", "Base of the 2nd metacarpal", "Straightens the wrist and tilts it towards the thumb", "Radial nerve (C6–C7)"],
  "A long extensor on the thumb side of the forearm.");
M("extensor-digitorum", "Extensor Digitorum", "Forearm", [flex([0.262, 1.11, -0.036], [0.294, 0.87, -0.012], 0.01, [0.2, 0, -1])],
  ["Lateral epicondyle of the humerus", "Extensor hoods of the four fingers", "Straightens the fingers and wrist", "Posterior interosseous nerve (C7–C8)"],
  "The main finger extensor on the back of the forearm; its tendons show on the back of the hand.");
M("extensor-carpi-ulnaris", "Extensor Carpi Ulnaris", "Forearm", [flex([0.258, 1.1, -0.044], [0.279, 0.87, -0.014], 0.008, [-0.3, 0, -1])],
  ["Lateral epicondyle and back of the ulna", "Base of the 5th metacarpal", "Straightens the wrist and tilts it towards the little finger", "Posterior interosseous nerve (C7–C8)"],
  "The most medial extensor on the back of the forearm.");
M("thenar-muscles", "Thenar Muscles", "Hand", [ell(H(0.02, 0.05, 0.009), [0.012, 0.022, 0.008], { e: [0, 0, -18] })],
  ["Flexor retinaculum, scaphoid and trapezium", "First metacarpal and proximal phalanx of the thumb", "Move the thumb across the palm to meet the fingers (opposition)", "Median nerve (recurrent branch)"],
  "The fleshy pad at the base of the thumb: abductor pollicis brevis, flexor pollicis brevis and opponens pollicis.");
M("hypothenar-muscles", "Hypothenar Muscles", "Hand", [ell(H(-0.02, 0.055, 0.008), [0.009, 0.026, 0.007])],
  ["Pisiform and hamate", "Fifth metacarpal and proximal phalanx of the little finger", "Move and cup the little finger", "Ulnar nerve (deep branch)"],
  "The padded edge of the palm under the little finger.");

/* =====================================================================
   THIGH & LEG
   ===================================================================== */
M("sartorius", "Sartorius", "Thigh", [tube([[0.118, 0.99, 0.062], [0.1, 0.86, 0.078], [0.078, 0.72, 0.062], [0.062, 0.6, 0.026], [0.066, 0.5, -0.004], [0.078, 0.448, 0.018]], 0.0068, { fa: 0.45, up: [0, 0, 1] })],
  ["Anterior superior iliac spine", "Upper medial tibia (pes anserinus)", "Bends, spreads and rotates the thigh outwards — the cross-legged tailor's position", "Femoral nerve (L2–L3)"],
  "The longest muscle in the body, a thin strap spiralling across the front of the thigh.", null, { q: 2, kid: "The longest muscle in your body crosses your thigh like a sash." });
M("rectus-femoris", "Rectus Femoris", "Thigh", [spin([0.11, 0.97, 0.052], [0.094, 0.54, 0.046], 0.022, { f: 0.8, nz: [0, 0, 1], bias: 0.45 })],
  ["Anterior inferior iliac spine and above the acetabulum", "Patella and, via the patellar ligament, the tibial tuberosity", "Straightens the knee and bends the hip — the kicking muscle", "Femoral nerve (L2–L4)"],
  "The central muscle of the quadriceps, the only one that crosses the hip.", null, { q: 1, lbl: 1 });
M("vastus-lateralis", "Vastus Lateralis", "Thigh", [spin([0.132, 0.88, 0.012], [0.112, 0.535, 0.03], 0.03, { f: 0.7, nz: [1, 0, 0.3], bow: 0.05 })],
  ["Greater trochanter and linea aspera of the femur", "Patella via the quadriceps tendon", "Straightens the knee", "Femoral nerve (L2–L4)"],
  "The largest part of the quadriceps, on the outside of the thigh.", null, { q: 2 });
M("vastus-medialis", "Vastus Medialis", "Thigh", [spin([0.086, 0.8, 0.032], [0.08, 0.53, 0.032], 0.022, { f: 0.7, nz: [-1, 0, 0.4], bias: 0.7 })],
  ["Linea aspera of the femur", "Patella via the quadriceps tendon", "Straightens the knee and keeps the kneecap on track", "Femoral nerve (L2–L4)"],
  "The teardrop-shaped quadriceps muscle above the inner knee.");
M("vastus-intermedius", "Vastus Intermedius", "Thigh", [spin([0.116, 0.84, 0.024], [0.096, 0.55, 0.03], 0.02, { f: 0.6 })],
  ["Front and side of the femoral shaft", "Patella via the quadriceps tendon", "Straightens the knee", "Femoral nerve (L2–L4)"],
  "The deepest quadriceps muscle, hidden under the rectus femoris.");
parts.push(makePart({
  id: "patellar-ligament", name: "Patellar Ligament", sys: "muscular", grp: "Thigh", bi: 1, mat: "tendon", q: 3,
  g: [tube([[0.094, 0.545, 0.044], [0.095, 0.53, 0.047]], 0.009, { fa: 0.4, up: [0, 0, 1] }), tube([[0.094, 0.492, 0.036], [0.094, 0.47, 0.034], [0.094, 0.45, 0.03]], 0.0075, { fa: 0.4, up: [0, 0, 1] })],
  d: "The strong band continuing the quadriceps tendon below the kneecap to the tibial tuberosity.",
  fn: "Transmits the pull of the quadriceps to the tibia. Tapping it triggers the knee-jerk reflex.",
  kid: "When a doctor taps below your knee and your leg kicks, they're tapping this.", meta: { From: "Patella", To: "Tibial tuberosity" },
}));
M("adductor-longus", "Adductor Longus", "Thigh", [spin([0.028, 0.88, 0.064], [0.104, 0.68, 0.022], 0.016, { f: 0.6, nz: [-1, 0, 0.5] })],
  ["Body of the pubis", "Middle of the linea aspera", "Pulls the thigh inwards", "Obturator nerve (L2–L4)"],
  "A triangular muscle on the inner thigh; strained in a 'groin pull'.", null, { q: 2 });
M("adductor-brevis", "Adductor Brevis", "Thigh", [spin([0.032, 0.87, 0.05], [0.104, 0.75, 0.012], 0.013, { f: 0.6 })],
  ["Body and inferior ramus of the pubis", "Upper linea aspera", "Pulls the thigh inwards", "Obturator nerve (L2–L4)"],
  "A short adductor lying behind the adductor longus.");
M("adductor-magnus", "Adductor Magnus", "Thigh", [spin([0.05, 0.842, -0.01], [0.082, 0.54, -0.014], 0.029, { f: 0.6, nz: [-1, 0, -0.3] })],
  ["Inferior pubic ramus, ischial ramus and ischial tuberosity", "Linea aspera and adductor tubercle of the femur", "Pulls the thigh inwards and straightens the hip", "Obturator and sciatic nerves"],
  "The largest and deepest of the adductors, part adductor and part hamstring.");
M("gracilis", "Gracilis", "Thigh", [spin([0.022, 0.868, 0.056], [0.072, 0.465, -0.012], 0.011, { f: 0.55, nz: [-1, 0, 0] })],
  ["Body and inferior ramus of the pubis", "Upper medial tibia (pes anserinus)", "Pulls the thigh inwards and bends the knee", "Obturator nerve (L2–L3)"],
  "A long, slender strap along the inner thigh.");
M("pectineus", "Pectineus", "Thigh", [spin([0.036, 0.9, 0.064], [0.1, 0.832, 0.02], 0.012, { f: 0.55, nz: [0, 0, 1] })],
  ["Pectineal line of the pubis", "Pectineal line of the femur", "Bends the hip and pulls the thigh inwards", "Femoral nerve (L2–L3)"],
  "A flat, quadrangular muscle at the top of the inner thigh.");
M("biceps-femoris", "Biceps Femoris", "Thigh", [spin([0.062, 0.838, -0.014], [0.121, 0.47, -0.03], 0.022, { f: 0.7, nz: [0.4, 0, -1] })],
  ["Ischial tuberosity (long head) and linea aspera (short head)", "Head of the fibula", "Bends the knee and straightens the hip", "Sciatic nerve (L5–S2)"],
  "The lateral hamstring muscle.", null, { q: 2, lbl: 1, kid: "Hamstrings bend your knee — they're the muscles you stretch when you touch your toes." });
M("semitendinosus", "Semitendinosus", "Thigh", [spin([0.056, 0.838, -0.018], [0.08, 0.46, -0.02], 0.018, { f: 0.7, nz: [0, 0, -1], bias: 0.4 })],
  ["Ischial tuberosity", "Upper medial tibia (pes anserinus)", "Bends the knee and straightens the hip", "Sciatic nerve (L5–S2)"],
  "A medial hamstring with a long, cord-like lower tendon.");
M("semimembranosus", "Semimembranosus", "Thigh", [spin([0.06, 0.83, -0.01], [0.074, 0.49, -0.03], 0.022, { f: 0.6, nz: [-0.4, 0, -1], bias: 0.65 })],
  ["Ischial tuberosity", "Back of the medial tibial condyle", "Bends the knee and straightens the hip", "Sciatic nerve (L5–S2)"],
  "The deepest medial hamstring, with a flat, membrane-like upper tendon.");
M("gastrocnemius", "Gastrocnemius", "Leg", [spin([0.074, 0.52, -0.032], [0.088, 0.2, -0.052], 0.026, { f: 0.62, nz: [-0.3, 0, -1], bias: 0.32 }), spin([0.11, 0.52, -0.03], [0.09, 0.22, -0.052], 0.021, { f: 0.62, nz: [0.4, 0, -1], bias: 0.32 })],
  ["Medial and lateral condyles of the femur", "Calcaneus via the Achilles tendon", "Points the foot and bends the knee — rising on tiptoe, jumping", "Tibial nerve (S1–S2)"],
  "The two-headed calf muscle that gives the calf its shape.", null, { q: 1, lbl: 1 });
M("soleus", "Soleus", "Leg", [spin([0.1, 0.45, -0.028], [0.088, 0.13, -0.046], 0.026, { f: 0.5, nz: [0, 0, -1], bias: 0.45 })],
  ["Back of the upper tibia and fibula", "Calcaneus via the Achilles tendon", "Points the foot and keeps you from falling forwards while standing", "Tibial nerve (S1–S2)"],
  "A broad, flat calf muscle under the gastrocnemius — sometimes called the 'second heart' because it pumps venous blood up the leg.");
parts.push(makePart({
  id: "achilles-tendon", name: "Achilles Tendon", sys: "muscular", grp: "Leg", bi: 1, mat: "tendon", q: 1, aka: "calcaneal tendon",
  g: [tube([[0.088, 0.21, -0.052], [0.088, 0.12, -0.054], [0.089, 0.07, -0.058], F(0.006, 0.035, -0.058)], [0.008, 0.0055, 0.006, 0.008], { fa: 0.5, up: [1, 0, 0] })],
  d: "The thickest and strongest tendon in the body, joining the calf muscles to the heel bone.",
  fn: "Transfers the force of the calf to the heel for walking, running and jumping — it can bear several times body weight.",
  kid: "Named after the Greek hero Achilles, whose only weak spot was his heel.", meta: { From: "Gastrocnemius and soleus", To: "Calcaneus" },
}));
M("tibialis-anterior", "Tibialis Anterior", "Leg", [spin([0.108, 0.44, 0.02], [0.086, 0.13, 0.03], 0.013, { f: 0.7, nz: [0.3, 0, 1], bias: 0.35 }), tube([[0.086, 0.13, 0.03], [0.078, 0.08, 0.034], F(-0.016, 0.052, 0.05)], 0.0028)],
  ["Upper lateral tibia and interosseous membrane", "Medial cuneiform and base of the 1st metatarsal", "Lifts the foot (dorsiflexion) and turns the sole inwards", "Deep fibular nerve (L4–L5)"],
  "The muscle along the front of the shin, just outside the tibia.", null, { q: 2, lbl: 1 });
M("extensor-digitorum-longus", "Extensor Digitorum Longus", "Leg", [spin([0.12, 0.44, 0.008], [0.106, 0.12, 0.028], 0.0095, { f: 0.7, nz: [0.4, 0, 1] })],
  ["Lateral tibial condyle and fibula", "Middle and distal phalanges of toes 2–5", "Lifts the toes and the foot", "Deep fibular nerve (L5–S1)"],
  "A long muscle beside tibialis anterior whose tendons fan out over the top of the foot.");
M("fibularis-longus", "Fibularis Longus", "Leg", [spin([0.126, 0.44, -0.012], [0.118, 0.14, -0.022], 0.011, { f: 0.6, nz: [1, 0, 0] })],
  ["Head and upper lateral fibula", "Medial cuneiform and base of the 1st metatarsal (under the foot)", "Turns the sole outwards and points the foot", "Superficial fibular nerve (L5–S1)"],
  "The superficial muscle on the outer side of the leg; its tendon hooks behind the lateral malleolus and under the foot.", null, { aka: "peroneus longus" });
M("fibularis-brevis", "Fibularis Brevis", "Leg", [spin([0.122, 0.3, -0.016], [0.118, 0.1, -0.024], 0.0085, { f: 0.6, nz: [1, 0, 0] })],
  ["Lower lateral fibula", "Tuberosity of the 5th metatarsal", "Turns the sole outwards", "Superficial fibular nerve (L5–S1)"],
  "A shorter fibular muscle under the fibularis longus.", null, { aka: "peroneus brevis" });
M("tibialis-posterior", "Tibialis Posterior", "Leg", [spin([0.1, 0.43, -0.018], [0.078, 0.12, -0.02], 0.011, { f: 0.6 })],
  ["Back of the tibia, fibula and interosseous membrane", "Navicular and other tarsals", "Points the foot and supports the arch", "Tibial nerve (L4–L5)"],
  "The deepest calf muscle; weakness of it leads to flat feet.");
M("plantar-muscles", "Plantar Muscles", "Leg", [ell(F(0.002, 0.012, 0.05), [0.022, 0.006, 0.06], { e: [0, 10, 0] })],
  ["Calcaneus and plantar aponeurosis", "Phalanges of the toes", "Curl the toes and support the arches of the foot", "Medial and lateral plantar nerves"],
  "Four layers of small muscles in the sole of the foot, including flexor digitorum brevis and abductor hallucis.");

export default parts;
