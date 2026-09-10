/**
 * Cockroach (Periplaneta americana — the American cockroach of school
 * biology). Model units: body length = 0.5 (a real adult is 34–53 mm).
 * Head towards +z, back towards +y, the insect's left towards +x.
 */
import { add, lerp, ell, spin, tube, sdf, sheet, S, both, makePart } from "./lib.mjs";

const parts = [];
const P = (p) => parts.push(makePart(p));
const HEAD = [0, 0.058, 0.225];

/* =====================================================================
   EXTERNAL BODY (sclerites)
   ===================================================================== */
const X = (p) => P({ sys: "exoskeleton", mat: "cuticle", q: 2, ...p });
X({
  id: "head", name: "Head", grp: "Head", q: 1, lbl: 1,
  g: [sdf([S.ell(HEAD, [0.045, 0.048, 0.03], { e: [-35, 0, 0] }), S.ell(add(HEAD, [0, -0.03, 0.012]), [0.03, 0.02, 0.018])], { k: 0.01, cell: 0.003 })],
  d: "A small, triangular head set at right angles to the body with the mouthparts pointing down (hypognathous). It is formed by the fusion of six segments and is very mobile on the neck.",
  fn: "Carries the eyes, antennae and mouthparts, and houses the brain.",
  kid: "A cockroach can live for a week without its head!", meta: { Position: "Hypognathous", Segments: "6 fused" },
});
X({ id: "neck", name: "Neck (Cervicum)", grp: "Head", q: 3, g: [tube([add(HEAD, [0, 0.0, -0.02]), [0, 0.055, 0.19]], 0.018)], d: "A short, flexible neck of soft membrane and small sclerites.", fn: "Lets the head turn in almost every direction.", kid: "The neck is soft so the head can turn.", meta: { Structure: "Membranous with cervical sclerites" } });
X({
  id: "pronotum", name: "Pronotum", grp: "Thorax", q: 1, lbl: 1,
  g: [sdf([S.ell([0, 0.078, 0.158], [0.074, 0.013, 0.052])], { k: 0.004, cell: 0.003 })],
  d: "The large, shield-shaped plate (tergum) of the prothorax that covers the neck and part of the head.",
  fn: "Protects the head and the front of the thorax.",
  kid: "The pronotum is like a shield over the cockroach's neck.", meta: { Segment: "Prothorax" },
});
X({ id: "prothorax", name: "Prothorax", grp: "Thorax", q: 2, g: [ell([0, 0.056, 0.155], [0.058, 0.02, 0.04])], d: "The first segment of the thorax, bearing the first pair of legs. It has no wings.", fn: "Carries the forelegs.", kid: "The thorax has 3 parts, each with a pair of legs — 6 legs in all.", meta: { Bears: "First pair of legs" } });
X({ id: "mesothorax", name: "Mesothorax", grp: "Thorax", q: 2, g: [ell([0, 0.056, 0.098], [0.066, 0.024, 0.028])], d: "The middle thoracic segment, bearing the middle legs and the leathery forewings (tegmina).", fn: "Carries the middle legs and the tegmina.", kid: "The thorax has 3 parts, each with a pair of legs — 6 legs in all.", meta: { Bears: "Second pair of legs, tegmina" } });
X({ id: "metathorax", name: "Metathorax", grp: "Thorax", q: 2, g: [ell([0, 0.054, 0.046], [0.07, 0.024, 0.028])], d: "The last thoracic segment, bearing the hind legs and the membranous hind wings.", fn: "Carries the hind legs and the flight wings.", kid: "The thorax has 3 parts, each with a pair of legs — 6 legs in all.", meta: { Bears: "Third pair of legs, hind wings" } });
for (let i = 0; i < 10; i++) {
  const n = i + 1, z = 0.012 - i * 0.034, w = 0.074 - Math.pow(i / 9, 1.6) * 0.05, h = 0.024 - (i / 9) * 0.01;
  X({
    id: `abdominal-segment-${n}`, name: `Abdominal Segment ${n}`, grp: "Abdomen", q: n === 1 || n === 10 ? 2 : 3, lbl: n === 5 ? 1 : 0,
    g: [ell([0, 0.052 - i * 0.001, z], [w, h, 0.02])],
    d: `Segment ${n} of the ten-segmented abdomen. Each segment is covered above by a tergum and below by a sternum, joined at the sides by soft pleura.${n === 7 ? " In females, segments 7–9 form the brood (genital) pouch." : n === 10 ? " The tenth tergum carries the anal cerci." : ""}`,
    fn: n >= 7 ? "Houses the genital pouch and the openings of the reproductive and digestive systems." : "Protects the digestive, reproductive and excretory organs and bends to allow breathing movements.",
    kid: "The abdomen has 10 segments — you can count the stripes!", meta: { Plates: "Tergum (top), sternum (bottom), pleura (sides)" },
  });
}

/* =====================================================================
   APPENDAGES — antennae, mouthparts, wings, legs, cerci
   ===================================================================== */
const A = (p) => P({ sys: "appendages", mat: "cuticle", q: 3, ...p });
A({
  id: "antenna", name: "Antenna", grp: "Head appendages", bi: 1, q: 1, lbl: 1,
  g: [tube([[0.02, 0.078, 0.24], [0.05, 0.1, 0.33], [0.11, 0.12, 0.47], [0.2, 0.11, 0.6], [0.3, 0.085, 0.7]], [0.0045, 0.003, 0.0022, 0.0016, 0.001], { rs: 6, sl: 0.004 }),
      ...Array.from({ length: 20 }, (_, i) => { const t = i / 19; const p = lerp(lerp([0.02, 0.078, 0.24], [0.11, 0.12, 0.47], t), lerp([0.11, 0.12, 0.47], [0.3, 0.085, 0.7], t), t); return ell(p, [0.0028 - t * 0.0015, 0.0028 - t * 0.0015, 0.0028 - t * 0.0015], { seg: 8 }); })],
  d: "A long, thread-like feeler made of about 100 tiny segments, rising from a socket in front of each eye.",
  fn: "Covered in sensory hairs that detect touch, smell, taste, humidity and air currents — the cockroach's main way of exploring in the dark.",
  kid: "Cockroaches 'smell' and 'feel' with their long antennae.", meta: { Type: "Filiform", Segments: "About 100" },
});
A({ id: "labrum", name: "Labrum", grp: "Mouthparts", q: 2, g: [ell(add(HEAD, [0, -0.04, 0.026]), [0.014, 0.008, 0.004])], d: "The upper lip — a flap hanging from the front of the head.", fn: "Closes the mouth from the front and holds food in place.", kid: "Cockroaches have biting and chewing mouthparts.", meta: { Type: "Upper lip" } });
A({ id: "mandible", name: "Mandible", grp: "Mouthparts", bi: 1, q: 2, g: [sdf([S.ell(add(HEAD, [0.014, -0.045, 0.016]), [0.008, 0.012, 0.006], { e: [0, 0, 20] })], { k: 0.002, cell: 0.0015 })], d: "A hard, toothed jaw on each side of the mouth, moving sideways.", fn: "Bites and chews food — the cockroach can eat almost anything, from crumbs to paper and soap.", kid: "Cockroach jaws move sideways, not up and down like yours.", meta: { Type: "Biting and chewing" } });
A({ id: "maxilla", name: "Maxilla", grp: "Mouthparts", bi: 1, q: 3, g: [spin(add(HEAD, [0.016, -0.03, 0.006]), add(HEAD, [0.02, -0.058, 0.016]), 0.004, { f: 0.7 }), tube([add(HEAD, [0.02, -0.04, 0.012]), add(HEAD, [0.034, -0.055, 0.022]), add(HEAD, [0.03, -0.075, 0.03])], 0.0022)], d: "The second pair of jaws, behind the mandibles, each with a jointed palp.", fn: "Holds and pushes food into the mouth; the maxillary palps taste it.", kid: "Cockroaches taste food with little feelers near their mouth.", meta: { Parts: "Cardo, stipes, galea, lacinia, palp" } });
A({ id: "labium", name: "Labium", grp: "Mouthparts", q: 3, g: [ell(add(HEAD, [0, -0.052, 0.006]), [0.014, 0.004, 0.008]), ...both([tube([add(HEAD, [0.008, -0.055, 0.008]), add(HEAD, [0.014, -0.07, 0.016])], 0.0018)])], d: "The lower lip, formed by the fused second maxillae, with a pair of labial palps.", fn: "Closes the mouth from behind and senses food with its palps.", kid: "Cockroaches have biting and chewing mouthparts.", meta: { Type: "Lower lip" } });
A({ id: "hypopharynx", name: "Hypopharynx", grp: "Mouthparts", q: 3, g: [ell(add(HEAD, [0, -0.04, 0.01]), [0.005, 0.007, 0.004])], d: "A tongue-like lobe in the middle of the mouthparts; the salivary duct opens at its base.", fn: "Acts like a tongue, mixing food with saliva.", kid: "The cockroach has a little tongue-like part too.", meta: { Opening: "Salivary duct" } });
A({
  id: "tegmen", name: "Tegmen (Forewing)", grp: "Wings", bi: 1, mat: "wing", col: "#8A5A2C", q: 1, lbl: 1, aka: "tegmina forewing elytra",
  g: [sheet([[0.0, 0.0], [0.02, 0.012], [0.058, 0.04], [0.072, 0.2], [0.06, 0.36], [0.03, 0.42], [0.004, 0.4], [-0.006, 0.1]], 0.0028, { c: [0.012, 0.086, 0.118], ux: [1, -0.08, 0], uy: [0, -0.03, -1], bend: -0.12 })],
  d: "The first pair of wings, arising from the mesothorax: thick, leathery and dark, lying over the back.",
  fn: "Protects the delicate hind wings and the abdomen. Tegmina are not used for flying.",
  kid: "The top wings are hard covers that protect the flying wings underneath.", meta: { From: "Mesothorax", Texture: "Leathery, opaque" },
});
A({
  id: "hind-wing", name: "Hind Wing", grp: "Wings", bi: 1, mat: "wing", col: "#C9A37A", q: 2,
  g: [sheet([[0.0, 0.0], [0.03, 0.01], [0.07, 0.06], [0.074, 0.2], [0.05, 0.33], [0.02, 0.36], [0.002, 0.3]], 0.0012, { c: [0.01, 0.08, 0.06], ux: [1, -0.1, 0], uy: [0, -0.03, -1], bend: -0.14 })],
  d: "The second pair of wings, from the metathorax: thin, transparent and folded like a fan under the tegmina.",
  fn: "The wings actually used for flight — though American cockroaches fly only short distances.",
  kid: "Cockroaches can fly using these thin wings, but they usually prefer to run.", meta: { From: "Metathorax", Texture: "Membranous" },
});
const LEGS = [
  ["fore", "Foreleg", [0.03, 0.035, 0.155], [0.07, 0.07, 0.2], [0.11, 0.015, 0.26], [0.13, 0.0, 0.31]],
  ["middle", "Middle Leg", [0.036, 0.034, 0.095], [0.11, 0.08, 0.11], [0.19, 0.01, 0.11], [0.24, 0.0, 0.1]],
  ["hind", "Hind Leg", [0.04, 0.034, 0.04], [0.12, 0.08, 0.0], [0.2, 0.01, -0.13], [0.25, 0.0, -0.22]],
];
const LEG_PART = {
  coxa: ["Coxa", "The broad first segment of the leg, joining it to the thorax.", "Swings the leg forward and back."],
  trochanter: ["Trochanter", "A small segment between the coxa and femur.", "Acts as a hinge that raises and lowers the leg."],
  femur: ["Femur", "The stout, flattened thigh segment.", "Contains the muscles that move the tibia."],
  tibia: ["Tibia", "The long, slender segment bristling with sharp spines.", "Pushes against the ground; the spines grip surfaces and sense vibration."],
  tarsus: ["Tarsus", "The foot: five small tarsomeres with soft pads (plantulae) underneath.", "Grips the surface — the pads let cockroaches run up smooth walls."],
  pretarsus: ["Pretarsus", "A pair of claws with a sticky pad (arolium) between them at the tip of the leg.", "Clings to rough surfaces and ceilings."],
};
for (const [key, legName, coxa, knee, ankle, foot] of LEGS) {
  const tro = lerp(coxa, knee, 0.2), mid = lerp(knee, ankle, 1);
  const seg = {
    coxa: [spin(add(coxa, [-0.012, 0, 0]), add(coxa, [0.018, 0.004, 0]), 0.012, { f: 0.5, nz: [0, 1, 0] })],
    trochanter: [ell(tro, [0.007, 0.006, 0.006])],
    femur: [spin(tro, knee, 0.009, { f: 0.55, nz: [0, 1, 0], p: 0.5 })],
    tibia: [spin(knee, mid, 0.006, { f: 0.8, p: 0.4, tr: 0.5 }), ...Array.from({ length: 8 }, (_, i) => { const p = lerp(knee, mid, 0.1 + i * 0.1); return tube([p, add(p, [0.004, 0.01, i % 2 ? 0.006 : -0.006])], [0.0012, 0.0003], { rs: 5, cap: 1 }); })],
    tarsus: Array.from({ length: 5 }, (_, i) => { const a = lerp(ankle, foot, i / 5), b = lerp(ankle, foot, (i + 0.85) / 5); return spin(a, b, 0.0035, { f: 0.8, p: 0.4, tr: 0.6 }); }),
    pretarsus: [tube([foot, add(foot, [0.008, -0.004, 0.006])], [0.0018, 0.0004], { rs: 5 }), tube([foot, add(foot, [0.01, -0.004, -0.003])], [0.0018, 0.0004], { rs: 5 })],
  };
  for (const [k, [nm, d, fn]] of Object.entries(LEG_PART)) {
    A({
      id: `${key}-leg-${k}`, name: `${legName} ${nm}`, grp: "Legs", bi: 1, q: k === "femur" || k === "tibia" ? 2 : 3,
      g: seg[k], d, fn,
      kid: "Cockroaches are some of the fastest runners of all insects — about 1.5 metres a second!",
      meta: { Leg: `${legName} (${key === "fore" ? "prothoracic" : key === "middle" ? "mesothoracic" : "metathoracic"})`, Segment: nm },
    });
  }
}
A({ id: "anal-cercus", name: "Anal Cercus", grp: "Abdominal appendages", bi: 1, q: 2, lbl: 1, g: [tube([[0.018, 0.05, -0.31], [0.03, 0.055, -0.35], [0.042, 0.058, -0.39]], [0.004, 0.003, 0.0012]), ...Array.from({ length: 8 }, (_, i) => ell(lerp([0.02, 0.051, -0.315], [0.04, 0.057, -0.385], i / 7), [0.0036 - i * 0.0003, 0.0036 - i * 0.0003, 0.004], { seg: 8 }))], d: "A pair of jointed feelers on the tenth abdominal segment, present in both sexes.", fn: "Covered in hairs that sense the slightest air movement — this is how a cockroach escapes a swatting hand before it lands.", kid: "Cockroaches have 'tail feelers' that warn them when something is coming.", meta: { On: "10th tergum", Present: "Both sexes" } });
A({ id: "anal-style", name: "Anal Style", sex: "m", grp: "Abdominal appendages", bi: 1, q: 3, g: [tube([[0.01, 0.042, -0.3], [0.016, 0.04, -0.325]], [0.0022, 0.0012])], d: "A pair of short, unjointed spikes on the ninth sternum, found only in males.", fn: "A key feature for telling male and female cockroaches apart.", kid: "Only male cockroaches have these tiny spikes.", meta: { Present: "Males only" } });

/* =====================================================================
   SENSES
   ===================================================================== */
P({ id: "compound-eye", name: "Compound Eye", sys: "sensory", grp: "Senses", bi: 1, col: "#2A1D14", q: 1, lbl: 1, g: [sdf([S.ell(add(HEAD, [0.034, 0.012, 0.004]), [0.012, 0.024, 0.014], { e: [-30, 0, 10] })], { k: 0.002, cell: 0.0018, n: 0.0006, nf: 900 })], d: "A black, kidney-shaped eye on each side of the head, made of about 2 000 hexagonal units called ommatidia.", fn: "Gives mosaic vision — each ommatidium sees one small part of the scene. Very sensitive to movement but poor at detail.", kid: "Each eye is made of about 2 000 tiny eyes!", meta: { Units: "About 2 000 ommatidia", Vision: "Mosaic" } });
P({ id: "ocellus", name: "Ocellus (Fenestra)", sys: "sensory", grp: "Senses", bi: 1, col: "#EFE6C8", q: 3, g: [ell(add(HEAD, [0.012, 0.03, 0.022]), [0.004, 0.003, 0.002])], d: "A pale, window-like spot (fenestra) near the base of each antenna.", fn: "A simple light-sensitive spot that detects changes in light intensity.", kid: "These pale spots can tell light from dark.", meta: { Type: "Simple eye" } });

/* =====================================================================
   INTERNAL SYSTEMS
   ===================================================================== */
const gutY = 0.048;
P({ id: "pharynx-oesophagus", name: "Pharynx & Oesophagus", sys: "digestive", grp: "Foregut", col: "#E0C29A", q: 3, g: [tube([add(HEAD, [0, -0.03, 0.01]), add(HEAD, [0, -0.005, -0.012]), [0, gutY + 0.008, 0.18], [0, gutY + 0.006, 0.13]], 0.004)], d: "The narrow tube leading from the mouth back through the neck.", fn: "Carries food from the mouth to the crop.", kid: "Food goes down this thin tube first.", meta: { Region: "Foregut (lined with cuticle)" } });
P({ id: "crop", name: "Crop", sys: "digestive", grp: "Foregut", col: "#EAD2A6", q: 1, lbl: 1, g: [sdf([S.ell([0, gutY, 0.06], [0.026, 0.02, 0.07])], { k: 0.004, cell: 0.003 })], d: "A large, pear-shaped sac in the thorax and front of the abdomen.", fn: "Stores food while saliva starts digesting it.", kid: "The crop is a storage bag for food.", meta: { Region: "Foregut" } });
P({ id: "gizzard", name: "Gizzard (Proventriculus)", sys: "digestive", grp: "Foregut", col: "#B88A58", q: 2, g: [sdf([S.ell([0, gutY, -0.02], [0.013, 0.012, 0.014]), ...Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return S.sph([Math.cos(a) * 0.01, gutY + Math.sin(a) * 0.01, -0.02], 0.004); })], { k: 0.003, cell: 0.0015 })], d: "A small, thick-walled chamber behind the crop lined with six hard, tooth-like chitinous plates.", fn: "Grinds food into fine particles like a mill.", kid: "Cockroaches have teeth inside their stomach to grind food!", meta: { Teeth: "6 chitinous plates" } });
P({ id: "gastric-caeca", name: "Hepatic (Gastric) Caeca", sys: "digestive", grp: "Midgut", col: "#E9E1A0", q: 2, g: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return spin([Math.cos(a) * 0.006, gutY + Math.sin(a) * 0.006, -0.034], [Math.cos(a) * 0.016, gutY + Math.sin(a) * 0.016, 0.004], 0.0045, { f: 0.9 }); }), d: "A ring of 6–8 blind, finger-like tubes at the junction of the foregut and midgut.", fn: "Secrete digestive juices and absorb nutrients.", kid: "Eight little tubes help digest food.", meta: { Number: "6–8" } });
P({ id: "midgut", name: "Midgut (Mesenteron)", sys: "digestive", grp: "Midgut", col: "#E7B98E", q: 2, g: [tube([[0, gutY, -0.035], [0.018, gutY - 0.004, -0.07], [0.0, gutY - 0.008, -0.1], [-0.018, gutY - 0.004, -0.13], [0, gutY - 0.004, -0.16]], 0.0065)], d: "A narrow tube lined with glandular cells, between the gizzard and the hindgut.", fn: "The main site where food is digested and absorbed.", kid: "Food is broken down and soaked up here.", meta: { Region: "Midgut" } });
P({ id: "hindgut", name: "Hindgut (Ileum, Colon, Rectum)", sys: "digestive", grp: "Hindgut", col: "#C99A70", q: 2, g: [tube([[0, gutY - 0.004, -0.16], [0.012, gutY - 0.002, -0.19], [0.0, gutY, -0.22], [-0.01, gutY, -0.25], [0, gutY + 0.002, -0.28], [0, gutY + 0.004, -0.31]], [0.005, 0.006, 0.0065, 0.0065, 0.008, 0.004])], d: "The last part of the gut: a short ileum, coiled colon and wider rectum ending at the anus.", fn: "Absorbs water and salts and forms dry faecal pellets.", kid: "Water is taken back out of the food here.", meta: { Opens: "Anus, at the 10th segment" } });
P({ id: "salivary-gland", name: "Salivary Gland", sys: "digestive", grp: "Glands", bi: 1, mat: "gland", col: "#EBDDB5", q: 3, g: [sdf(Array.from({ length: 5 }, (_, i) => S.sph([0.02 + (i % 2) * 0.006, gutY + 0.004, 0.14 - i * 0.012], 0.007)), { k: 0.006, cell: 0.002 }), ell([0.012, gutY - 0.006, 0.1], [0.005, 0.004, 0.012])], d: "A pair of grape-like glands in the thorax, each with a reservoir.", fn: "Make saliva, which wets food and begins digesting starch.", kid: "Cockroaches make spit too!", meta: { Location: "Thorax" } });
P({
  id: "malpighian-tubules", name: "Malpighian Tubules", sys: "excretory", grp: "Excretory", col: "#F2D35B", q: 1, lbl: 1,
  g: Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2, r = 0.02 + (i % 3) * 0.006; const base = [0, gutY - 0.006, -0.16]; return tube([base, add(base, [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4, 0.01]), add(base, [Math.cos(a) * r, Math.sin(a) * r * 0.6, -0.01 + (i % 2) * 0.03]), add(base, [Math.cos(a + 0.6) * r * 1.2, Math.sin(a + 0.6) * r * 0.5, -0.03])], 0.0012, { rs: 5 }); }),
  d: "About 100–150 fine, yellow, thread-like tubules at the junction of the midgut and hindgut.",
  fn: "The main excretory organs: they absorb nitrogenous waste from the haemolymph and pass it into the gut as uric acid. Cockroaches are uricotelic.",
  kid: "These tiny threads work like kidneys for the cockroach.", meta: { Number: "100–150", Excretes: "Uric acid (uricotelic)" },
});
P({ id: "fat-body", name: "Fat Body", sys: "excretory", grp: "Excretory", mat: "fat", col: "#F3ECD2", q: 2, g: [sdf([...both([S.ell([0.04, 0.052, -0.08], [0.022, 0.012, 0.09]), S.ell([0.03, 0.04, -0.2], [0.018, 0.01, 0.06])])], { k: 0.01, cell: 0.004, n: 0.0025, nf: 70 })], d: "Loose, whitish lobes of tissue filling much of the body cavity.", fn: "Stores fat, protein and glycogen, and stores uric acid as waste — acting like both a liver and an extra kidney.", kid: "The fat body is the cockroach's food store.", meta: { Role: "Storage and excretion" } });
P({ id: "urecose-glands", name: "Urecose Glands", sex: "m", sys: "excretory", grp: "Excretory", col: "#F0E6C0", q: 3, g: both([ell([0.012, 0.05, -0.23], [0.006, 0.005, 0.008])]), d: "Glands associated with the male reproductive system.", fn: "Store and help excrete uric acid.", kid: "Male cockroaches have extra glands for getting rid of waste.", meta: { Present: "Males" } });
{
  const heart = [];
  for (let i = 0; i < 13; i++) heart.push(ell([0, 0.074, 0.12 - i * 0.034], [0.004, 0.0035, 0.012], { seg: 10 }));
  P({ id: "dorsal-vessel", name: "Heart (Dorsal Vessel)", sys: "circulatory", grp: "Circulation", col: "#7DBB63", q: 1, lbl: 1, g: [tube([[0, 0.068, 0.2], [0, 0.074, 0.12], [0, 0.074, -0.3]], 0.0022), ...heart],
    d: "A long, thin tube along the middle of the back, divided into 13 funnel-shaped chambers with slit-like openings (ostia) on each side.",
    fn: "Pumps colourless blood (haemolymph) forward to the head; it then flows back freely through the body cavity. This is an open circulatory system.",
    kid: "A cockroach's heart is a long tube with 13 chambers, and its blood is colourless!", meta: { Chambers: "13", Circulation: "Open", Blood: "Colourless haemolymph" } });
  P({ id: "alary-muscles", name: "Alary Muscles", sys: "circulatory", grp: "Circulation", bi: 1, mat: "muscle", q: 3, g: Array.from({ length: 10 }, (_, i) => spin([0.003, 0.073, 0.02 - i * 0.034], [0.05, 0.062, 0.02 - i * 0.034], 0.006, { f: 0.2, nz: [0, 1, 0], bias: 0.3 })), d: "Paired triangular muscles fanning out from the heart to the sides of the abdomen.", fn: "Help pump the haemolymph by expanding the heart chambers.", kid: "Wing-shaped muscles help the heart pump.", meta: { Shape: "Triangular (alary = wing-like)" } });
}
P({ id: "tracheal-system", name: "Tracheal System", sys: "respiratory", grp: "Respiration", bi: 1, col: "#DCE6EC", q: 1,
  g: [tube(Array.from({ length: 12 }, (_, i) => [0.05 - Math.max(0, i - 6) * 0.004, 0.056, 0.16 - i * 0.04]), 0.002, { rs: 6 }),
      ...Array.from({ length: 10 }, (_, i) => { const z = 0.1 - i * 0.042, xs = Math.max(0.03, 0.068 - Math.pow(i / 9, 1.6) * 0.04); return tube([[0.05 - Math.max(0, i - 5) * 0.004, 0.056, z], [xs, 0.05, z], [xs * 0.5, 0.07, z - 0.01], [0.01, 0.06, z]], 0.0009, { rs: 5 }); })],
  d: "A network of air tubes (tracheae) that branch into ever finer tracheoles reaching every cell. Air enters through ten pairs of spiracles.",
  fn: "Delivers oxygen straight to the tissues — insect blood does not carry oxygen.",
  kid: "Insects don't have lungs — air tubes carry oxygen right into their bodies.", meta: { Openings: "10 pairs of spiracles" } });
P({ id: "spiracles", name: "Spiracles", sys: "respiratory", grp: "Respiration", bi: 1, col: "#3A2A1C", q: 2, g: Array.from({ length: 10 }, (_, i) => { const z = i < 2 ? 0.12 - i * 0.055 : 0.012 - (i - 2) * 0.034; const w = i < 2 ? 0.068 : 0.074 - Math.pow((i - 2) / 9, 1.6) * 0.05; return ell([w * 0.98, 0.046, z], [0.002, 0.0035, 0.0035], { seg: 10 }); }), d: "Ten pairs of small breathing holes on the sides of the body: two on the thorax and eight on the abdomen.", fn: "Let air in and out of the tracheal system; tiny valves close them to save water.", kid: "Cockroaches breathe through little holes along their sides.", meta: { Pairs: "10 (2 thoracic, 8 abdominal)" } });
P({ id: "brain", name: "Brain (Supra-oesophageal Ganglion)", sys: "nervous", grp: "Nervous system", mat: "nerve", q: 2, lbl: 1, g: [sdf(both([S.ell(add(HEAD, [0.009, 0.01, -0.004]), [0.01, 0.008, 0.008])]), { k: 0.004, cell: 0.0015 })], d: "A bilobed mass of fused nerve ganglia above the oesophagus in the head.", fn: "Receives signals from the eyes and antennae and coordinates behaviour. Most control is spread along the body, so a headless cockroach can still move.", kid: "The brain is small — the nerve cord does lots of the work.", meta: { Formed: "3 fused ganglia" } });
P({ id: "suboesophageal-ganglion", name: "Sub-oesophageal Ganglion", sys: "nervous", grp: "Nervous system", mat: "nerve", q: 3, g: [ell(add(HEAD, [0, -0.02, -0.004]), [0.008, 0.005, 0.006]), ...both([tube([add(HEAD, [0.008, 0.004, -0.004]), add(HEAD, [0.01, -0.008, -0.006]), add(HEAD, [0.005, -0.019, -0.004])], 0.0015)])], d: "A ganglion below the oesophagus, joined to the brain by a ring of connectives around the oesophagus.", fn: "Controls the mouthparts.", kid: "This nerve knot controls the mouth.", meta: { Controls: "Mouthparts" } });
P({ id: "ventral-nerve-cord", name: "Ventral Nerve Cord", sys: "nervous", grp: "Nervous system", mat: "nerve", q: 2,
  g: [...both([tube([add(HEAD, [0.002, -0.02, -0.006]), [0.003, 0.028, 0.16], [0.003, 0.026, 0.0], [0.002, 0.03, -0.28]], 0.0012, { rs: 5 })]),
      ...[0.15, 0.095, 0.045].map((z) => ell([0, 0.027, z], [0.007, 0.004, 0.008])),
      ...[0.0, -0.05, -0.1, -0.15, -0.2, -0.25].map((z) => ell([0, 0.027, z], [0.005, 0.003, 0.005]))],
  d: "A double nerve cord running along the floor of the body, with three thoracic and six abdominal ganglia.", fn: "Each ganglion controls its own segment's legs, wings and muscles, so reflexes happen without the brain.", kid: "The main nerve runs along the cockroach's belly, not its back!", meta: { Ganglia: "3 thoracic + 6 abdominal" } });
P({ id: "testis", name: "Testis", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, col: "#EDEBDA", q: 2, g: [sdf(Array.from({ length: 4 }, (_, i) => S.sph([0.03, 0.062, -0.08 - i * 0.02], 0.009)), { k: 0.006, cell: 0.002 })], d: "A pair of lobed testes lying at the sides of the 4th–6th abdominal segments.", fn: "Produce sperm, which are bundled into packets called spermatophores.", kid: "Male cockroaches make sperm here.", meta: { Segments: "4th–6th" } });
P({ id: "vas-deferens", name: "Vas Deferens", sex: "m", sys: "reproductive", grp: "Male reproductive", bi: 1, col: "#E7DCC0", q: 3, g: [tube([[0.03, 0.058, -0.14], [0.02, 0.05, -0.2], [0.006, 0.045, -0.24]], 0.0015)], d: "A thin duct from each testis to the seminal vesicle.", fn: "Carries sperm towards the ejaculatory duct.", kid: "A tube carrying sperm.", meta: { Opens: "Seminal vesicle" } });
P({ id: "mushroom-gland", name: "Mushroom Gland", sex: "m", sys: "reproductive", grp: "Male reproductive", mat: "gland", col: "#F3E9D1", q: 2, g: [sdf(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return S.cap([0, 0.046, -0.24], [Math.cos(a) * 0.02, 0.046 + Math.sin(a) * 0.012, -0.235], 0.003); }), { k: 0.003, cell: 0.0015 })], d: "A large accessory gland in the 6th–7th segments made of many small tubules.", fn: "Produces the outer layer of the spermatophore.", kid: "It looks like a little mushroom!", meta: { Segments: "6th–7th" } });
P({ id: "ejaculatory-duct", name: "Ejaculatory Duct", sex: "m", sys: "reproductive", grp: "Male reproductive", col: "#E7DCC0", q: 3, g: [tube([[0, 0.044, -0.24], [0, 0.04, -0.28], [0, 0.036, -0.31]], 0.0025)], d: "A single tube running back to the male genital pore near the anus.", fn: "Carries sperm out to the male gonopore.", kid: "The last tube for sperm.", meta: { Opens: "Male gonopore" } });
P({ id: "phallomeres", name: "Phallomeres", sex: "m", sys: "reproductive", grp: "Male reproductive", mat: "cuticle", q: 3, g: [ell([0.006, 0.035, -0.318], [0.006, 0.004, 0.008]), ell([-0.006, 0.035, -0.318], [0.006, 0.004, 0.008])], d: "Small chitinous structures around the male gonopore — the male external genitalia.", fn: "Used to transfer the spermatophore during mating.", kid: "Male mating parts at the tip of the body.", meta: { Type: "External genitalia" } });
P({ id: "ovary", name: "Ovary", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, col: "#EBD7C0", q: 2, g: Array.from({ length: 8 }, (_, i) => tube([[0.012 + i * 0.004, 0.06, -0.03 - i * 0.004], [0.024 + i * 0.005, 0.058, -0.1], [0.012, 0.05, -0.2]], [0.003, 0.0022, 0.0014], { rs: 6 })), d: "A pair of large ovaries in the 2nd–6th abdominal segments, each made of eight tubular ovarioles containing a chain of developing eggs.", fn: "Produce eggs, which are packed 16 at a time into an egg case (ootheca).", kid: "Each ovary has 8 egg tubes.", meta: { Ovarioles: "8 per ovary", Segments: "2nd–6th" } });
P({ id: "oviduct", name: "Oviduct", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, col: "#E7D2B8", q: 3, g: [tube([[0.012, 0.05, -0.2], [0.006, 0.045, -0.23], [0.0, 0.042, -0.25]], 0.0022)], d: "A short duct from each ovary; the two join into a common oviduct opening into the genital chamber.", fn: "Carries eggs to the genital chamber (vagina).", kid: "Eggs travel down this tube.", meta: { Opens: "Genital chamber" } });
P({ id: "spermatheca", name: "Spermatheca", sex: "f", sys: "reproductive", grp: "Female reproductive", col: "#E3C9A8", q: 3, g: [ell([0.006, 0.05, -0.26], [0.005, 0.004, 0.005])], d: "A small sac in the 6th segment that opens into the genital chamber.", fn: "Stores sperm received during mating to fertilise eggs later.", kid: "Females store sperm here.", meta: { Segment: "6th" } });
P({ id: "collaterial-glands", name: "Collaterial Glands", sex: "f", sys: "reproductive", grp: "Female reproductive", bi: 1, mat: "gland", col: "#F0E4C8", q: 3, g: [sdf(Array.from({ length: 5 }, (_, i) => S.cap([0.008, 0.048, -0.27], [0.03 + i * 0.002, 0.05 + (i % 2) * 0.006, -0.25 + i * 0.008], 0.0022)), { k: 0.003, cell: 0.0014 })], d: "A pair of branched glands behind the ovaries.", fn: "Secrete the substance that hardens into the ootheca — the egg case.", kid: "These glands make the egg case.", meta: { Makes: "Ootheca" } });
P({ id: "ootheca", name: "Ootheca", sex: "f", sys: "reproductive", grp: "Female reproductive", mat: "cuticle", col: "#5B2F16", q: 2, g: [sdf([S.cap([0, 0.034, -0.315], [0, 0.028, -0.345], 0.012, 0.011), S.box([0, 0.042, -0.33], [0.002, 0.004, 0.018], { rr: 0.001 })], { k: 0.003, cell: 0.0016 })], d: "A dark brown, purse-shaped egg case carried at the tip of the female's abdomen before being dropped in a safe place.", fn: "Protects about 14–16 eggs as they develop. A female produces 9–10 oothecae in her life.", kid: "Mother cockroaches carry their eggs in a little brown purse.", meta: { Eggs: "14–16 per ootheca" } });

export default {
  id: "cockroach", name: "Cockroach", title: "Cockroach Atlas",
  blurb: "Periplaneta americana: head, thorax and abdomen, mouthparts, wings and legs, plus the internal systems.",
  sexes: true,
  camera: { dir: [0.55, 0.62, 0.56] },
  systems: [
    { id: "exoskeleton", name: "Body segments", color: "#7A4524" },
    { id: "appendages", name: "Legs, wings & antennae", color: "#A86A3A" },
    { id: "sensory", name: "Eyes", color: "#7FB2D6" },
    { id: "digestive", off: 1, name: "Digestive", color: "#D9925E" },
    { id: "circulatory", off: 1, name: "Circulatory", color: "#7DBB63" },
    { id: "respiratory", off: 1, name: "Tracheal (breathing)", color: "#9FB6C4" },
    { id: "nervous", off: 1, name: "Nervous system", color: "#E8BE3A" },
    { id: "excretory", off: 1, name: "Excretory", color: "#F2D35B" },
    { id: "reproductive", off: 1, name: "Reproductive", color: "#E57FB0" },
  ],
  presets: [
    { id: "all", name: "Outside", sys: ["exoskeleton", "appendages", "sensory"] },
    { id: "inside", name: "Inside", sys: ["digestive", "circulatory", "respiratory", "nervous", "excretory", "reproductive", "sensory"] },
    { id: "legs", name: "Legs & wings", sys: ["appendages"] },
    { id: "everything", name: "Everything", sys: ["exoskeleton", "appendages", "sensory", "digestive", "circulatory", "respiratory", "nervous", "excretory", "reproductive"] },
  ],
  parts,
};
