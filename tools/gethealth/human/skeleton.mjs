/**
 * Human skeletal system — all 206 adult bones plus the principal
 * cartilages (costal cartilages, intervertebral discs, menisci).
 */
import { add, sub, mul, norm, lerp, mid, alongFrame, mx, ell, bone, tube, sdf, sheet, S, both, makePart } from "../lib.mjs";
import { SPINE, V, STERNUM, L, HAND, FOOT } from "./rig.mjs";

const parts = [];
const P = (p) => parts.push(makePart({ sys: "skeletal", ...p }));

/* =====================================================================
   SKULL — 8 cranial + 14 facial bones. One skull-shaped SDF (vault,
   facial mass, cheekbones; orbits, nose and cranial cavity carved out)
   is cut into bones by region, so every bone shares one silhouette.
   ===================================================================== */
const K_ = 0.0015;
const U = (p) => p;                                   // union primitive
const Sub = (p) => ({ ...p, o: "s", k: p.k ?? 0.003 });
const Int = (p) => ({ ...p, o: "i", k: p.k ?? K_ });
const I = (c, n) => S.pl(c, n, { o: "i", k: K_ });
const skullBody = () => [
  // cranial vault: braincase + a more upright forehead
  U(S.ell([0, 1.668, -0.014], [0.071, 0.074, 0.093])),
  U(S.ell([0, 1.652, 0.022], [0.058, 0.064, 0.064])),
  U(S.ell([0, 1.628, -0.062], [0.05, 0.036, 0.042])),                       // occipital bulge / base
  // face: maxillary mass, alveolar arch, cheekbones and arches, lateral orbit rims
  U(S.ell([0, 1.583, 0.05], [0.044, 0.038, 0.036])),
  U(S.ell([0, 1.559, 0.056], [0.03, 0.011, 0.029])),
  ...both([
    U(S.sph([0.048, 1.602, 0.052], 0.015)),
    U(S.cap([0.054, 1.601, 0.046], [0.067, 1.603, -0.001], 0.0058, 0.005)),
    U(S.cap([0.051, 1.607, 0.057], [0.054, 1.636, 0.058], 0.0052, 0.006)),
    U(S.cap([0.058, 1.595, -0.03], [0.056, 1.568, -0.025], 0.0085, 0.005)),  // mastoid process
    U(S.ell([0.013, 1.583, -0.02], [0.006, 0.004, 0.009])),                  // occipital condyle
  ]),
  U(S.cap([0.0, 1.643, 0.082], [0.028, 1.646, 0.074], 0.0055)), U(S.cap([0.0, 1.643, 0.082], [-0.028, 1.646, 0.074], 0.0055)), // brow
  // cavities
  ...both([Sub(S.ell([0.033, 1.613, 0.072], [0.0185, 0.017, 0.032], { k: 0.004 }))]),       // orbits
  Sub(S.ell([0, 1.592, 0.092], [0.0115, 0.019, 0.02])),                                     // piriform aperture
  Sub(S.ell([0, 1.59, 0.048], [0.0135, 0.024, 0.042])),                                     // nasal cavity
  Sub(S.ell([0, 1.668, -0.014], [0.0645, 0.0675, 0.0865], { k: 0.002 })),                   // cranial cavity
  Sub(S.ell([0, 1.64, 0.018], [0.052, 0.058, 0.057], { k: 0.002 })),
  ...both([Sub(S.cap([0.085, 1.605, -0.012], [0.058, 1.605, -0.012], 0.0042, 0.0042, { k: 0.002 }))]), // ear canal
  Sub(S.ell([0, 1.584, -0.032], [0.013, 0.012, 0.017])),                                    // foramen magnum
];
const coronalFront = () => I([0, 1.745, 0.004], [0, -0.33, -1]);   // anterior to the coronal suture
const coronalBack = () => I([0, 1.745, 0.004], [0, 0.33, 1]);
const lambdaBack = () => I([0, 1.715, -0.075], [0, 0.45, 1]);      // posterior to the lambdoid suture
const lambdaFront = () => I([0, 1.715, -0.075], [0, -0.45, -1]);
const R = {
  temporal: (s = 1) => S.ell([0.066 * s, 1.61, -0.02], [0.03, 0.047, 0.05]),
  pterion: (s = 1) => S.ell([0.061 * s, 1.63, 0.028], [0.016, 0.02, 0.016]),
  zyg: (s = 1) => S.ell([0.054 * s, 1.609, 0.038], [0.02, 0.026, 0.036]),
  nasal: () => S.ell([0, 1.617, 0.086], [0.011, 0.015, 0.013]),
};
const faceLine = 1.623;                                          // frontal above, maxillae below
const cut = (...regions) => sdf([...skullBody(), ...regions], { k: 0.004, cell: 0.0021 });
const SKG = "Skull";

P({
  id: "frontal-bone", name: "Frontal Bone", grp: SKG, lbl: 1, q: 2,
  g: [cut(coronalFront(), I([0, faceLine, 0], [0, -1, 0]), Sub(R.zyg(1)), Sub(R.zyg(-1)), Sub(R.pterion(1)), Sub(R.pterion(-1)), Sub(R.nasal()))],
  d: "The bone of the forehead. It forms the front of the cranial vault, the roofs of both eye sockets and contains the frontal sinuses just above the nose.",
  fn: "Shields the frontal lobes of the brain, gives the forehead its shape and anchors the scalp muscles that raise the eyebrows.",
  kid: "Your forehead is one big curved bone — a crash helmet for the thinking part of your brain.",
  meta: { Type: "Flat bone", "Articulates with": "Parietals, sphenoid, ethmoid, nasals, maxillae, zygomatics, lacrimals" },
});
P({
  id: "parietal-bone", name: "Parietal Bone", grp: SKG, bi: 1, q: 2,
  g: [cut(I([0.0006, 0, 0], [-1, 0, 0]), coronalBack(), lambdaFront(), I([0, 1.625, 0], [0, -1, 0]), Sub(R.temporal(1)), Sub(R.pterion(1)))],
  d: "One of a pair of large curved plates that make up the roof and upper sides of the skull. The two meet along the sagittal suture on top of the head.",
  fn: "Protects the parietal lobes, which handle touch, spatial awareness and body position.",
  kid: "The two bones on top of your head fit together like puzzle pieces. In babies they are still apart — that's the soft spot!",
  meta: { Type: "Flat bone", "Articulates with": "Opposite parietal, frontal, occipital, temporal, sphenoid" },
});
P({
  id: "occipital-bone", name: "Occipital Bone", grp: SKG, q: 2,
  g: [cut(lambdaBack(), Sub(R.temporal(1)), Sub(R.temporal(-1)), S.sph([0, 1.64, -0.103], 0.006))],
  d: "The bone at the back and base of the skull. It contains the foramen magnum, the large opening through which the brainstem becomes the spinal cord.",
  fn: "Protects the visual cortex and cerebellum, and its two occipital condyles rest on the atlas (C1) to form the joint that lets you nod.",
  kid: "The bump at the back of your head is part of this bone. The big hole underneath lets your brain connect to your spinal cord.",
  meta: { Type: "Flat bone", "Articulates with": "Parietals, temporals, sphenoid, atlas (C1)" },
});
P({
  id: "temporal-bone", name: "Temporal Bone", grp: SKG, bi: 1, q: 2,
  g: [cut(Int(R.temporal(1)), I([0.036, 0, 0], [-1, 0, 0]), lambdaFront(), Sub(R.pterion(1)), Sub(R.zyg(1)))],
  d: "Forms the lower side of the skull around the ear. It houses the middle and inner ear and has the mastoid process — the bump you can feel behind your earlobe.",
  fn: "Contains the organs of hearing and balance, forms the socket for the jaw joint and anchors neck muscles such as the sternocleidomastoid.",
  kid: "The bones around your ears hold the tiniest parts of your hearing system, deep inside where they are safe.",
  meta: { Type: "Irregular bone", "Articulates with": "Parietal, occipital, sphenoid, zygomatic, mandible" },
});
P({
  id: "sphenoid-bone", name: "Sphenoid Bone", grp: SKG, q: 3,
  g: [
    cut(Int(R.pterion(1)), Sub(R.zyg(1))),
    cut(Int(R.pterion(-1)), Sub(R.zyg(-1))),
    sdf([S.ell([0, 1.6, 0.01], [0.022, 0.013, 0.018]), S.ell([0.028, 1.603, 0.018], [0.02, 0.006, 0.012]), S.ell([-0.028, 1.603, 0.018], [0.02, 0.006, 0.012]),
      S.cap([0.012, 1.593, 0.012], [0.014, 1.57, 0.02], 0.003), S.cap([-0.012, 1.593, 0.012], [-0.014, 1.57, 0.02], 0.003)], { k: 0.005, cell: 0.002 }),
  ],
  d: "A butterfly-shaped bone in the middle of the skull base. Only its greater wings show at the temples; its body holds the sella turcica, the saddle that cradles the pituitary gland.",
  fn: "Links the cranial and facial skeleton, forms part of each eye socket and gives passage to the optic nerves and major cranial vessels.",
  kid: "Hidden in the middle of your head is a bone shaped like a butterfly. It holds a tiny gland that controls how you grow.",
  meta: { Type: "Irregular bone", "Articulates with": "All other cranial bones, plus vomer, zygomatics, palatines" },
});
P({
  id: "ethmoid-bone", name: "Ethmoid Bone", grp: SKG, q: 3,
  g: [sdf([S.ell([0, 1.615, 0.052], [0.0125, 0.013, 0.018]), S.ell([0, 1.597, 0.058], [0.0015, 0.014, 0.02])], { k: 0.003, cell: 0.0015 })],
  d: "A light, spongy bone between the eye sockets. Its perforated cribriform plate lets the olfactory nerves pass from the nose to the brain.",
  fn: "Forms the roof of the nasal cavity, part of the nasal septum and the inner walls of the orbits; its air cells lighten the skull.",
  kid: "Smell signals travel through tiny holes in this bone to reach your brain.",
  meta: { Type: "Irregular bone", "Articulates with": "Frontal, sphenoid, nasals, maxillae, lacrimals, palatines, vomer" },
});
P({
  id: "maxilla", name: "Maxilla", grp: SKG, bi: 1, q: 2,
  g: [cut(I([0.0006, 0, 0], [-1, 0, 0]), I([0, faceLine, 0], [0, 1, 0]), I([0, 0, 0.016], [0, 0, -1]), I([0.049, 0, 0], [1, 0, 0]), Sub(R.zyg(1)), Sub(R.nasal()))],
  d: "The upper jaw bone. The two maxillae meet in the midline to hold the upper teeth, form most of the hard palate and the floor of each eye socket, and contain the large maxillary sinuses.",
  fn: "Holds the upper teeth, separates the mouth from the nose and transmits chewing forces up into the skull.",
  kid: "Your top teeth are rooted in this bone. It also makes the roof of your mouth.",
  meta: { Type: "Irregular bone", "Articulates with": "Frontal, nasal, zygomatic, lacrimal, palatine, vomer, ethmoid, opposite maxilla" },
});
P({
  id: "zygomatic-bone", name: "Zygomatic Bone", grp: SKG, bi: 1, q: 2,
  g: [cut(Int(R.zyg(1)), I([0.034, 0, 0], [-1, 0, 0]))],
  d: "The cheekbone. It forms the prominence of the cheek and the outer rim of the eye socket, and bridges back to the temporal bone as the zygomatic arch.",
  fn: "Protects the eye from the side, shapes the face and anchors the masseter, the main chewing muscle.",
  kid: "Touch the hard bump under your eye — that's your cheekbone.",
  meta: { Type: "Irregular bone", "Articulates with": "Frontal, temporal, sphenoid, maxilla" },
});
P({
  id: "nasal-bone", name: "Nasal Bone", grp: SKG, bi: 1, q: 3,
  g: [cut(Int(R.nasal()), I([0.0006, 0, 0], [-1, 0, 0]))],
  d: "A small oblong bone; the pair forms the bony bridge of the nose. The rest of the nose is shaped by cartilage.",
  fn: "Supports the upper nose and protects the nasal cavity. It is the most commonly fractured bone of the face.",
  kid: "The hard top part of your nose is made of two tiny bones — the floppy tip is cartilage.",
  meta: { Type: "Flat bone", "Articulates with": "Frontal, ethmoid, maxilla, opposite nasal" },
});
P({
  id: "lacrimal-bone", name: "Lacrimal Bone", grp: SKG, bi: 1, q: 3,
  g: [ell([0.0158, 1.614, 0.07], [0.0028, 0.0055, 0.004], { e: [0, 30, 0] })],
  d: "The smallest facial bone, a thin plate in the inner wall of the eye socket about the size of a fingernail.",
  fn: "Contains the groove for the tear sac and the canal that drains tears into the nose — which is why crying makes your nose run.",
  kid: "This bone is smaller than your fingernail and helps drain your tears into your nose.",
  meta: { Type: "Flat bone", "Articulates with": "Frontal, ethmoid, maxilla, inferior nasal concha" },
});
P({
  id: "palatine-bone", name: "Palatine Bone", grp: SKG, bi: 1, q: 3,
  g: [ell([0.009, 1.563, 0.026], [0.009, 0.0032, 0.008]), ell([0.012, 1.578, 0.024], [0.002, 0.013, 0.006])],
  d: "An L-shaped bone at the back of the nasal cavity. Its horizontal plate forms the back third of the hard palate.",
  fn: "Completes the roof of the mouth and the floor and side walls of the nasal cavity.",
  kid: "Run your tongue to the back of the roof of your mouth — that hard part is the palatine bone.",
  meta: { Type: "Irregular bone", "Articulates with": "Maxilla, sphenoid, ethmoid, vomer, inferior nasal concha" },
});
P({
  id: "inferior-nasal-concha", name: "Inferior Nasal Concha", grp: SKG, bi: 1, q: 3,
  g: [ell([0.0095, 1.581, 0.056], [0.003, 0.004, 0.018])],
  d: "A scroll-like bone projecting from the side wall of each nasal cavity.",
  fn: "Swirls inhaled air over moist lining so it is warmed, humidified and filtered before it reaches the lungs.",
  kid: "Inside your nose are curly bones that warm up air before you breathe it in.",
  meta: { Type: "Irregular bone", "Articulates with": "Maxilla, ethmoid, lacrimal, palatine" },
});
P({
  id: "vomer", name: "Vomer", grp: SKG, q: 3,
  g: [ell([0, 1.584, 0.052], [0.0015, 0.013, 0.02])],
  d: "A thin, ploughshare-shaped bone that forms the lower back part of the nasal septum.",
  fn: "Divides the nasal cavity into left and right passages together with the septal cartilage.",
  kid: "A thin bone wall splits your nose into two tunnels.",
  meta: { Type: "Flat bone", "Articulates with": "Sphenoid, ethmoid, maxillae, palatines" },
});
const jaw = [
  ...S.chain([[0.0, 1.516, 0.078], [0.021, 1.518, 0.069], [0.037, 1.524, 0.045], [0.048, 1.53, 0.008]], 0.0072),
  ...S.chain([[0.0, 1.531, 0.079], [0.019, 1.533, 0.071], [0.033, 1.537, 0.049], [0.043, 1.541, 0.022]], 0.0058),
  S.cap([0.048, 1.53, 0.007], [0.052, 1.595, -0.004], 0.007, 0.0055),
  S.cap([0.046, 1.545, 0.022], [0.048, 1.592, 0.018], 0.0055, 0.004),
  S.ell([0.053, 1.6, -0.005], [0.009, 0.0048, 0.0052]),
];
P({
  id: "mandible", name: "Mandible", grp: SKG, lbl: 1, q: 1,
  g: [sdf([...both(jaw), S.sph([0, 1.517, 0.08], 0.0078)], { k: 0.005, cell: 0.0018 })],
  d: "The lower jaw — the largest and strongest bone of the face and the only skull bone that moves freely.",
  fn: "Holds the lower teeth and moves at the temporomandibular joints for chewing, biting, speaking and yawning.",
  kid: "Your jaw is the only bone in your head that can move. Try opening and closing your mouth!",
  meta: { Type: "Irregular bone", "Articulates with": "Temporal bones (TMJ)" },
});
P({
  id: "hyoid-bone", name: "Hyoid Bone", grp: "Neck", q: 3,
  g: [tube([[-0.019, 1.493, 0.022], [-0.012, 1.491, 0.04], [0, 1.49, 0.046], [0.012, 1.491, 0.04], [0.019, 1.493, 0.022]], 0.0028)],
  d: "A horseshoe-shaped bone in the front of the neck, just above the larynx. It is the only bone in the body that does not touch another bone.",
  fn: "Anchors the tongue and the muscles of the floor of the mouth, and helps raise the larynx during swallowing and speech.",
  kid: "This floating bone in your neck isn't attached to any other bone — it's held up by muscles like a hammock.",
  meta: { Type: "Irregular bone", "Articulates with": "None (suspended by muscles and ligaments)" },
});
const ossicle = (id, name, g, d, fn) => P({ id, name, grp: "Middle ear", bi: 1, q: 3, g, d, fn, meta: { Type: "Auditory ossicle" } });
ossicle("malleus", "Malleus", [tube([[0.055, 1.617, -0.009], [0.053, 1.612, -0.01], [0.052, 1.606, -0.011]], [0.0016, 0.0009, 0.0006])],
  "The hammer: the first and largest of the three middle-ear bones, attached to the eardrum.",
  "Picks up eardrum vibrations and passes them to the incus.");
ossicle("incus", "Incus", [tube([[0.051, 1.616, -0.011], [0.049, 1.613, -0.013], [0.048, 1.609, -0.012]], [0.0015, 0.0009, 0.0006])],
  "The anvil: the middle ossicle, linking the malleus to the stapes.",
  "Relays and amplifies sound vibrations across the middle ear.");
ossicle("stapes", "Stapes", [tube([[0.047, 1.609, -0.012], [0.044, 1.609, -0.012]], [0.0006, 0.0011], { rs: 8 })],
  "The stirrup: at about 3 mm long it is the smallest bone in the body. Its footplate sits in the oval window of the inner ear.",
  "Pushes sound vibrations into the fluid of the cochlea, completing the lever system that amplifies sound about twentyfold.");

/* =====================================================================
   VERTEBRAL COLUMN
   ===================================================================== */
function vertebraPrims(s) {
  const { w, h, d, up } = s;
  const f = alongFrame(s.c, up, [0, 0, 1]);
  const at = (u, v, z) => f.at([u, v, z]);
  const tilt = (Math.atan2(up[2], up[1]) * 180) / Math.PI;
  const region = s.name[0];
  const prims = [];
  if (s.name === "C1") {
    prims.push(...S.chain([at(-0.009, 0, 0.003), at(0, 0, 0.007), at(0.009, 0, 0.003)], 0.0028));
    for (const k of [1, -1]) {
      prims.push(S.sph(at(0.011 * k, 0, -0.003), 0.0058));
      prims.push(...S.chain([at(0.011 * k, 0, -0.006), at(0.009 * k, 0, -0.017), at(0, 0, -0.021)], 0.0027));
      prims.push(S.cap(at(0.013 * k, 0, -0.003), at(0.034 * k, 0.001, -0.005), 0.0034, 0.0042));
    }
    return prims;
  }
  prims.push(S.ell(s.c, [w, h * 1.5, d], { e: [tilt, 0, 0] }));
  prims.push(S.pl(add(s.c, mul(up, h)), up, { o: "i", k: 0.002 }), S.pl(sub(s.c, mul(up, h)), mul(up, -1), { o: "i", k: 0.002 }));
  const pr = Math.max(h * 0.4, 0.0028);
  const canal = region === "C" ? 0.009 : region === "T" ? 0.0115 : 0.013;
  const back = -d - canal;
  const spLen = region === "C" ? (s.name === "C7" ? 0.022 : s.name === "C2" ? 0.015 : 0.011) : region === "T" ? 0.022 : 0.022;
  const spDown = region === "C" ? 0.004 : region === "T" ? (["T5", "T6", "T7", "T8", "T9"].includes(s.name) ? 0.026 : 0.018) : 0.004;
  const tp = region === "C" ? [w + 0.011, 0, -d * 0.6] : region === "T" ? [w + 0.016, h * 0.3, back - 0.004] : [w + 0.021, 0, -d * 1.4];
  for (const k of [1, -1]) {
    prims.push(S.cap(at(w * 0.55 * k, h * 0.15, -d * 0.8), at(w * 0.62 * k, h * 0.15, -d - canal * 0.45), pr));
    prims.push(S.cap(at(w * 0.62 * k, h * 0.15, -d - canal * 0.45), at(0, -h * 0.1, back), pr * 0.85));
    prims.push(S.cap(at(w * 0.62 * k, h * 0.2, -d - canal * 0.4), at(tp[0] * k, tp[1], tp[2]), pr * 0.8, pr * 0.95));
    prims.push(S.sph(at(w * 0.62 * k, h * 1.05, -d - canal * 0.5), pr * 0.8));
    prims.push(S.sph(at(w * 0.62 * k, -h * 0.95, -d - canal * 0.55), pr * 0.8));
  }
  prims.push(S.cap(at(0, -h * 0.1, back), at(0, -spDown, back - spLen), pr * 0.9, pr * (region === "L" ? 1.3 : 1.05)));
  if (region === "L") prims.push(S.cap(at(0, h * 0.5, back - 0.002), at(0, h * 0.4, back - spLen + 0.002), pr * 0.8));
  if (s.name === "C2") prims.push(S.cap(at(0, h, 0.001), at(0, h + 0.013, 0.003), 0.0042, 0.0035));
  return prims;
}
const VNAME = { C: "Cervical", T: "Thoracic", L: "Lumbar" };
const VERT_TEXT = {
  C1: ["Atlas (C1)", "The first cervical vertebra, a ring of bone with no body that carries the skull on two kidney-shaped facets.", "Supports the head and forms the atlanto-occipital joint, which lets you nod 'yes'."],
  C2: ["Axis (C2)", "The second cervical vertebra. Its tooth-like dens projects up through the ring of the atlas and acts as a pivot.", "The atlas and skull rotate around the dens — the joint that lets you shake your head 'no'."],
  C7: ["Vertebra Prominens (C7)", "The seventh cervical vertebra, with a long spinous process you can feel as the bump at the base of the neck.", "Anchors the nuchal ligament and neck and back muscles; a surface landmark for counting vertebrae."],
};
for (const s of SPINE) {
  const r = s.name[0], n = s.name.slice(1);
  const t = VERT_TEXT[s.name];
  const region = VNAME[r];
  const fnByRegion = {
    C: "Supports and moves the head and neck while protecting the cervical spinal cord and the vertebral arteries that run through its transverse foramina.",
    T: "Articulates with a pair of ribs to form the back of the rib cage, protects the thoracic spinal cord and allows twisting of the upper trunk.",
    L: "Carries most of the body's weight above the pelvis and allows bending forwards and backwards; protects the cauda equina nerve roots.",
  }[r];
  P({
    id: `vertebra-${s.name.toLowerCase()}`, name: t ? t[0] : `${region} Vertebra ${s.name}`, grp: "Vertebral column", q: t ? 2 : 3,
    g: [sdf(vertebraPrims(s), { k: 0.0032, cell: r === "C" ? 0.0011 : 0.0014 })],
    d: t ? t[1] : `The ${ordinal(+n)} ${region.toLowerCase()} vertebra. ${r === "L" ? "Lumbar vertebrae have the largest bodies in the spine because they bear the most weight." : r === "T" ? "Thoracic vertebrae have facets on their bodies and transverse processes for the ribs and long, downward-sloping spinous processes." : "Cervical vertebrae are small and light, with a hole in each transverse process for the vertebral artery."}`,
    fn: t ? t[2] : fnByRegion,
    kid: r === "C" ? "Your neck has 7 bones — the same number as a giraffe's!" : r === "T" ? "Each of these 12 back bones holds on to a pair of ribs." : "These 5 big bones in your lower back carry the weight of your whole upper body.",
    meta: { Type: "Irregular bone", Region: `${region} spine`, "Articulates with": `${adjacentNames(s.name)}${r === "T" ? `, ${ordinal(+n)} pair of ribs` : ""}` },
  });
}
function ordinal(n) { return ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"][n] || `${n}th`; }
function adjacentNames(name) {
  const i = SPINE.findIndex((s) => s.name === name);
  const above = i === 0 ? "Occipital bone" : SPINE[i - 1].name;
  const below = i === SPINE.length - 1 ? "Sacrum" : SPINE[i + 1].name;
  return `${above}, ${below}`;
}

P({
  id: "sacrum", name: "Sacrum", grp: "Vertebral column", lbl: 1, q: 2,
  g: [sdf([
    S.ell([0, 0.95, -0.034], [0.026, 0.012, 0.016]),
    S.ell([0.033, 0.953, -0.042], [0.02, 0.014, 0.016]), S.ell([-0.033, 0.953, -0.042], [0.02, 0.014, 0.016]),
    S.ell([0, 0.927, -0.047], [0.022, 0.012, 0.011]), S.ell([0, 0.906, -0.057], [0.017, 0.011, 0.009]),
    S.ell([0, 0.888, -0.064], [0.012, 0.01, 0.008]), S.ell([0, 0.874, -0.067], [0.008, 0.009, 0.007]),
    ...both(S.chain([[0.045, 0.955, -0.046], [0.028, 0.918, -0.058], [0.012, 0.882, -0.068]], 0.009)),
    ...S.chain([[0, 0.945, -0.056], [0, 0.9, -0.073]], 0.003),
  ], { k: 0.008, cell: 0.0022 })],
  d: "A large triangular bone formed by five fused vertebrae (S1–S5) at the base of the spine, wedged between the two hip bones.",
  fn: "Transfers the weight of the upper body to the pelvis through the sacroiliac joints and forms the back wall of the pelvic cavity.",
  kid: "Five bones grow together into one strong triangle that connects your spine to your hips.",
  meta: { Type: "Irregular bone (5 fused vertebrae)", "Articulates with": "L5, coccyx, both hip bones" },
});
P({
  id: "coccyx", name: "Coccyx", grp: "Vertebral column", q: 2,
  g: [sdf(S.chain([[0, 0.866, -0.066], [0, 0.857, -0.062], [0, 0.849, -0.054], [0, 0.844, -0.047]], [0.0062, 0.0048, 0.0036, 0.0026]), { k: 0.002, cell: 0.0012 })],
  d: "The tailbone: three to five small fused vertebrae at the very bottom of the spine.",
  fn: "An attachment point for pelvic-floor muscles, tendons and ligaments, and it helps bear weight when you sit leaning back.",
  kid: "Your tailbone is what's left of a tail our distant ancestors had.",
  meta: { Type: "Irregular bone (3–5 fused vertebrae)", "Articulates with": "Sacrum" },
});

/* intervertebral discs */
const DISC_SEQ = [...SPINE.slice(1), { name: "S1", c: [0, 0.962, -0.03], w: 0.024, h: 0, d: 0.017, up: [0, 1, 0] }];
for (let i = 1; i < DISC_SEQ.length; i++) {
  const a = DISC_SEQ[i - 1], b = DISC_SEQ[i];
  const top = sub(a.c, mul(a.up, a.h)), bot = add(b.c, mul(b.up, b.h));
  const c = mid(top, bot), gap = Math.max(a.c[1] - a.h - (b.c[1] + b.h), 0.003);
  const upv = norm(sub(top, bot));
  const tilt = (Math.atan2(upv[2], upv[1]) * 180) / Math.PI;
  P({
    id: `disc-${a.name.toLowerCase()}-${b.name.toLowerCase()}`, name: `Intervertebral Disc ${a.name}–${b.name}`, grp: "Cartilage & joints", mat: "cartilage", q: 3,
    g: [ell(c, [(a.w + b.w) / 2 * 1.02, gap / 2, (a.d + b.d) / 2 * 1.02], { e: [tilt, 0, 0], seg: 24 })],
    d: `The fibrocartilage cushion between ${a.name} and ${b.name}: a tough outer ring (annulus fibrosus) around a gel-like core (nucleus pulposus).`,
    fn: "Absorbs shock, spreads load evenly across the vertebrae and allows the spine to bend and twist.",
    kid: "Squishy discs between your back bones work like shock absorbers when you jump.",
    meta: { Type: "Fibrocartilaginous joint (symphysis)" },
  });
}

/* =====================================================================
   THORAX — sternum, ribs, costal cartilages
   ===================================================================== */
{
  const upv = norm(sub(STERNUM.top, STERNUM.xs));
  const half = [[0, 0.194], [0.008, 0.19], [0.022, 0.192], [0.029, 0.176], [0.024, 0.158], [0.013, 0.15], [0.015, 0.11], [0.018, 0.06], [0.016, 0.02], [0.01, 0.0], [0.007, -0.016], [0.004, -0.032], [0, -0.038]];
  const outline = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  P({
    id: "sternum", name: "Sternum", grp: "Thorax", lbl: 1, q: 1,
    g: [sheet(outline, 0.011, { c: STERNUM.xs, ux: [1, 0, 0], uy: upv, sm: 0, back: 0.5 })],
    d: "The breastbone: a flat bone in the centre of the chest made of the manubrium, body and xiphoid process.",
    fn: "Forms the front of the rib cage, protects the heart, lungs and great vessels, and anchors the clavicles and first seven pairs of ribs. Its marrow makes blood cells throughout life.",
    kid: "The flat bone in the middle of your chest is a shield for your heart.",
    meta: { Type: "Flat bone", "Articulates with": "Clavicles, costal cartilages of ribs 1–7" },
  });
}
const RIBS = [
  // W, lateral z, end (costochondral junction), sternal/joining point
  [0.058, 0.012, [0.036, 1.425, 0.05], [0.019, 1.426, 0.066]],
  [0.086, 0.002, [0.047, 1.386, 0.074], [0.018, 1.392, 0.081]],
  [0.104, -0.004, [0.057, 1.35, 0.089], [0.017, 1.362, 0.087]],
  [0.118, -0.006, [0.067, 1.314, 0.098], [0.016, 1.333, 0.093]],
  [0.127, -0.007, [0.078, 1.279, 0.102], [0.015, 1.304, 0.098]],
  [0.133, -0.008, [0.088, 1.245, 0.101], [0.014, 1.275, 0.101]],
  [0.136, -0.01, [0.098, 1.212, 0.095], [0.013, 1.248, 0.103]],
  [0.137, -0.013, [0.109, 1.18, 0.083], [0.058, 1.218, 0.1]],
  [0.135, -0.017, [0.118, 1.15, 0.066], [0.084, 1.186, 0.09]],
  [0.13, -0.022, [0.123, 1.126, 0.047], [0.101, 1.155, 0.076]],
  [0.12, -0.03, [0.117, 1.103, 0.008], null],
  [0.1, -0.044, [0.093, 1.106, -0.03], null],
];
export const RIB_PATHS = [];
RIBS.forEach(([W, zl, E, J], i) => {
  const n = i + 1, s = V[`T${n}`], y0 = s.c[1] + s.h * 0.5, zb = s.c[2];
  const H = [s.w + 0.003, y0, zb - s.d * 0.3];
  const Tb = [s.w + 0.017, y0 - 0.001, zb - s.d - 0.012];
  const A = [0.034 + W * 0.26, y0 - 0.008, zb - s.d - 0.024];
  const PL = [W * 0.86, y0 - 0.026 - n * 0.001, zb + 0.004 + (zl + 0.03) * 0.3];
  const Lm = [W, y0 - 0.045 - n * 0.0015, zl];
  const path = n <= 10
    ? [H, Tb, A, PL, Lm, [lerp(Lm, E, 0.5)[0] + 0.01 + (n < 3 ? -0.006 : 0), lerp(Lm, E, 0.5)[1], lerp(Lm, E, 0.55)[2] + 0.018], E]
    : [H, Tb, A, PL, E];
  RIB_PATHS.push(path);
  const kind = n <= 7 ? "true" : n <= 10 ? "false" : "floating";
  P({
    id: `rib-${n}`, name: `Rib ${n}`, grp: "Thorax", bi: 1, q: n === 1 || n === 12 ? 2 : 3, lbl: n === 6 ? 1 : 0,
    g: [tube(path, n === 1 ? 0.0048 : 0.0034, { fa: n === 1 ? 0.55 : 1.8, up: [0, 1, 0], sl: 0.004 })],
    d: `The ${ordinal(n)} rib — a ${kind} rib. ${kind === "true" ? "True ribs (1–7) attach directly to the sternum through their own costal cartilage." : kind === "false" ? "False ribs (8–10) reach the sternum only indirectly, by joining the costal cartilage of the rib above." : "Floating ribs (11–12) have no front attachment at all; their tips end in the muscles of the flank."}`,
    fn: n === 1 ? "The shortest, flattest and most curved rib; it frames the top of the chest where major vessels and nerves pass to the arm." : "Protects the heart, lungs, liver and spleen and moves up and out with the intercostal muscles every time you breathe in.",
    kid: "You have 12 pairs of ribs — 24 bones that make a cage to protect your heart and lungs.",
    meta: { Type: "Flat bone", Class: `${kind[0].toUpperCase()}${kind.slice(1)} rib`, "Articulates with": `T${n}${n > 1 && n < 11 ? ` and T${n - 1}` : ""}${J && n <= 7 ? ", sternum (via cartilage)" : ""}` },
  });
  const cart = J ? [E, lerp(E, J, 0.5).map((q, k) => q + (k === 2 ? 0.006 : k === 0 ? 0.004 : 0)), J] : [E, add(E, n === 11 ? [-0.002, -0.004, 0.012] : [-0.006, -0.003, 0.008])];
  P({
    id: `costal-cartilage-${n}`, name: `Costal Cartilage ${n}`, grp: "Cartilage & joints", bi: 1, mat: "cartilage", q: 3,
    g: [tube(cart, 0.0036, { fa: 1.4, up: [0, 1, 0] })],
    d: `The bar of hyaline cartilage that extends rib ${n} ${J ? (n <= 7 ? "to the sternum" : `forward to join the cartilage of rib ${n - 1}`) : "as a short pointed tip"}.`,
    fn: "Gives the rib cage the springiness it needs to expand when you inhale and to absorb blows to the chest.",
    kid: "The bendy ends of your ribs let your chest spring outwards when you breathe in.",
    meta: { Type: "Hyaline cartilage" },
  });
});

/* =====================================================================
   PECTORAL GIRDLE & UPPER LIMB (left; mirrored)
   ===================================================================== */
P({
  id: "clavicle", name: "Clavicle", grp: "Shoulder girdle", bi: 1, lbl: 1, q: 1,
  g: [tube([[0.02, 1.438, 0.07], [0.06, 1.442, 0.076], [0.11, 1.449, 0.056], [0.152, 1.453, 0.022], [0.176, 1.451, -0.004]], [0.0072, 0.0056, 0.005, 0.0052, 0.0062], { fa: 0.8, up: [0, 0, 1] })],
  d: "The collarbone: an S-shaped strut running from the sternum to the acromion of the scapula.",
  fn: "Holds the arm away from the body so it can swing freely, and transmits force from the arm to the trunk. It is the only bony link between the arm and the torso.",
  kid: "Your collarbone is like a bridge that holds your shoulder out to the side.",
  meta: { Type: "Long bone", "Articulates with": "Sternum, scapula (acromion)" },
});
{
  const ux = norm([0.86, 0, 0.5]);
  const sh = [[0.0, 1.44], [0.035, 1.438], [0.07, 1.43], [0.083, 1.418], [0.095, 1.398], [0.082, 1.36], [0.055, 1.3], [0.03, 1.268], [0.012, 1.255], [-0.004, 1.3], [-0.006, 1.38]];
  P({
    id: "scapula", name: "Scapula", grp: "Shoulder girdle", bi: 1, lbl: 1, q: 1,
    g: [
      sheet(sh, 0.006, { c: [0.074, 0, -0.1], ux, uy: [0, 1, 0], bend: -0.22, back: 0.6 }),
      tube([[0.078, 1.402, -0.109], [0.125, 1.422, -0.09], [0.168, 1.446, -0.045], [0.186, 1.447, -0.016]], [0.0035, 0.0055, 0.007, 0.0065], { fa: 0.6, up: [0, 1, 0] }),
      ell([0.163, 1.395, -0.036], [0.008, 0.016, 0.012], { e: [0, 35, 0] }),
      tube([[0.14, 1.418, -0.036], [0.146, 1.43, -0.008], [0.151, 1.418, 0.016]], [0.0055, 0.0045, 0.004]),
    ],
    d: "The shoulder blade: a flat, triangular bone on the upper back. Its ridge (the spine) ends in the acromion, the point of the shoulder, and its shallow glenoid cavity forms the socket of the shoulder joint.",
    fn: "Anchors 17 muscles, including the rotator cuff, and glides over the ribs to give the arm its huge range of movement.",
    kid: "Shoulder blades slide around on your back so you can reach up, out and behind you.",
    meta: { Type: "Flat bone", "Articulates with": "Humerus, clavicle" },
  });
}
P({
  id: "humerus", name: "Humerus", grp: "Arm", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.sph(L.shoulder, 0.0235), S.sph([0.196, 1.4, -0.018], 0.012), S.sph([0.186, 1.39, -0.006], 0.008),
    ...S.chain([[0.186, 1.378, -0.025], [0.205, 1.28, -0.029], [0.226, 1.155, -0.031]], [0.0135, 0.0105, 0.0112]),
    S.ell([0.236, 1.118, -0.031], [0.026, 0.012, 0.0095]),
    S.sph([0.25, 1.108, -0.022], 0.0088), S.sph([0.228, 1.105, -0.028], 0.0098),
    S.sph([0.21, 1.118, -0.034], 0.0075), S.sph([0.262, 1.119, -0.03], 0.006),
  ], { k: 0.008, cell: 0.0022 })],
  d: "The long bone of the upper arm, from the ball of the shoulder joint to the hinge of the elbow.",
  fn: "A lever for the powerful shoulder and elbow muscles. The radial nerve spirals around its shaft and the ulnar nerve runs behind its medial epicondyle — the 'funny bone'.",
  kid: "When you bump your 'funny bone' you're actually squashing a nerve that runs past the end of this bone.",
  meta: { Type: "Long bone", "Articulates with": "Scapula, radius, ulna" },
});
P({
  id: "ulna", name: "Ulna", grp: "Forearm", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.cap([0.222, 1.128, -0.046], [0.226, 1.105, -0.04], 0.009, 0.0085),
    S.sph([0.228, 1.098, -0.025], 0.0058),
    ...S.chain([[0.228, 1.1, -0.036], [0.25, 0.98, -0.022], [0.275, 0.862, -0.01]], [0.0085, 0.0062, 0.0048]),
    S.sph([0.276, 0.856, -0.008], 0.0072),
    S.cap([0.276, 0.855, -0.012], [0.278, 0.845, -0.014], 0.0032, 0.0022),
  ], { k: 0.006, cell: 0.0017 })],
  d: "The medial bone of the forearm, on the little-finger side. Its hook-shaped upper end, the olecranon, is the point of your elbow.",
  fn: "Forms the main hinge of the elbow with the humerus and provides a stable axis around which the radius rotates.",
  kid: "The pointy part of your elbow is the top of the ulna.",
  meta: { Type: "Long bone", "Articulates with": "Humerus, radius" },
});
P({
  id: "radius", name: "Radius", grp: "Forearm", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    { t: "rcyl", a: [0.25, 1.097, -0.024], b: [0.251, 1.087, -0.023], r: 0.0102, rr: 0.002 },
    ...S.chain([[0.251, 1.088, -0.023], [0.257, 1.062, -0.02], [0.28, 0.95, -0.004], [0.302, 0.868, 0.01]], [0.0058, 0.0072, 0.0072, 0.011]),
    S.sph([0.254, 1.066, -0.016], 0.005),
    S.ell([0.302, 0.859, 0.012], [0.016, 0.0088, 0.011]),
    S.sph([0.316, 0.849, 0.012], 0.0038),
  ], { k: 0.005, cell: 0.0017 })],
  d: "The lateral bone of the forearm, on the thumb side. Its disc-shaped head spins against the ulna and its broad lower end forms most of the wrist joint.",
  fn: "Rotates around the ulna to turn the palm up (supination) and down (pronation). Its lower end is the most commonly broken bone in adults.",
  kid: "Twist your hand palm up, then palm down — the radius is rolling over the ulna.",
  meta: { Type: "Long bone", "Articulates with": "Humerus, ulna, scaphoid, lunate" },
});

/* ---- hand ---- */
const H_ = (u, v, w) => HAND.at([u, v, w]);
const CARPALS = [
  ["scaphoid", "Scaphoid", [0.012, 0.009, 0.001], [0.006, 0.0075, 0.005], "The boat-shaped carpal on the thumb side of the wrist and the most frequently fractured wrist bone — usually from falling on an outstretched hand."],
  ["lunate", "Lunate", [0.0, 0.008, 0.0], [0.0055, 0.0065, 0.0055], "The crescent-shaped carpal in the centre of the proximal row, sitting directly against the radius."],
  ["triquetrum", "Triquetrum", [-0.0115, 0.01, -0.001], [0.005, 0.006, 0.0045], "The pyramid-shaped carpal on the little-finger side of the proximal row."],
  ["pisiform", "Pisiform", [-0.013, 0.012, 0.0085], [0.0035, 0.0045, 0.0035], "A pea-sized sesamoid bone embedded in the tendon of flexor carpi ulnaris; you can feel it at the heel of the hand."],
  ["trapezium", "Trapezium", [0.018, 0.025, 0.004], [0.0055, 0.006, 0.005], "The carpal at the base of the thumb. Its saddle-shaped joint with the first metacarpal lets the thumb oppose the fingers."],
  ["trapezoid", "Trapezoid", [0.008, 0.026, 0.0], [0.0045, 0.0055, 0.0045], "The smallest carpal of the distal row, wedged between the trapezium and capitate."],
  ["capitate", "Capitate", [-0.002, 0.024, 0.0], [0.006, 0.009, 0.0065], "The largest carpal bone, at the centre of the wrist. It is the first carpal to ossify in childhood."],
  ["hamate", "Hamate", [-0.0125, 0.024, 0.001], [0.0055, 0.008, 0.006], "The wedge-shaped carpal with a hook (hamulus) that forms one wall of the carpal tunnel."],
];
for (const [id, name, c, r, d] of CARPALS) {
  P({
    id, name, grp: "Hand", bi: 1, q: 3, g: [ell(H_(...c), r, { e: [10, 0, 0] })],
    d, fn: "Together the eight carpals form a flexible bridge between forearm and hand, letting the wrist bend, extend and tilt while roofing the carpal tunnel.",
    kid: "Your wrist is made of 8 little bones shaped like pebbles.", meta: { Type: id === "pisiform" ? "Sesamoid bone" : "Short bone", Group: "Carpal bone" },
  });
}
const FINGERS = ["Index", "Middle", "Ring", "Little"];
const FINGER_NUM = ["Second", "Third", "Fourth", "Fifth"];
const MC = { u0: [0.0105, 0.0005, -0.0095, -0.0185], u1: [0.0135, 0.002, -0.0105, -0.0215], L: [0.066, 0.063, 0.057, 0.052], r: [0.0041, 0.0041, 0.0035, 0.0034] };
const PH = { p: [0.04, 0.044, 0.041, 0.032], m: [0.024, 0.028, 0.026, 0.018], d: [0.017, 0.018, 0.018, 0.016] };
const flex = (v0, w0, len, ang) => [v0 + len * Math.cos(ang), w0 + len * Math.sin(ang)];
for (let i = 0; i < 4; i++) {
  const v0 = 0.036, v1 = v0 + MC.L[i];
  const a = H_(MC.u0[i], v0, 0), b = H_(MC.u1[i], v1, 0.002);
  P({
    id: `metacarpal-${i + 2}`, name: `${FINGER_NUM[i]} Metacarpal`, grp: "Hand", bi: 1, q: 3,
    g: [bone(a, b, MC.r[i], { ha: MC.r[i] * 1.6, hb: MC.r[i] * 1.55 })],
    d: `The long bone in the palm leading to the ${FINGERS[i].toLowerCase()} finger. Its rounded head forms the knuckle when you make a fist.`,
    fn: "Forms the skeleton of the palm and the base of the finger's knuckle joint (metacarpophalangeal joint).",
    kid: "Make a fist — the knuckles that pop up are the ends of these bones.",
    meta: { Type: "Long bone", Group: "Metacarpal" },
  });
  // phalanges curl gently towards the palm
  let v = v1 + 0.004, w = 0.002, ang = 0.06;
  const segs = [["proximal", PH.p[i], 0.0038], ["middle", PH.m[i], 0.0032], ["distal", PH.d[i], 0.0027]];
  for (const [kind, len, r] of segs) {
    const [v2, w2] = flex(v, w, len, ang);
    const u = MC.u1[i] + (i - 1.5) * 0.0012 * (kind === "proximal" ? 1 : kind === "middle" ? 2 : 3);
    P({
      id: `hand-${kind}-phalanx-${i + 2}`, name: `${cap(kind)} Phalanx of ${FINGERS[i]} Finger`, grp: "Hand", bi: 1, q: 3,
      g: [bone(H_(MC.u1[i] + (i - 1.5) * 0.0012 * (kind === "proximal" ? 0 : kind === "middle" ? 1 : 2), v, w), H_(u, v2, w2), r, { ha: r * 1.45, hb: r * (kind === "distal" ? 1.25 : 1.35) })],
      d: `The ${kind} bone of the ${FINGERS[i].toLowerCase()} finger.${kind === "distal" ? " Its flared tip (tuft) supports the fingertip pad and nail." : ""}`,
      fn: kind === "distal" ? "Supports the sensitive fingertip and the nail bed." : "Forms the finger's hinge joints, bent by the flexor tendons and straightened by the extensor tendons.",
      kid: "Each finger has 3 bones — except your thumb, which has 2.",
      meta: { Type: "Long bone", Group: "Phalanx" },
    });
    v = v2 + 0.002; w = w2; ang += 0.1;
  }
}
{ // thumb
  const dir = norm([0.36, 0.88, 0.32]);
  const at = (t) => H_(0.019 + dir[0] * t, 0.029 + dir[1] * t, 0.006 + dir[2] * t);
  P({
    id: "metacarpal-1", name: "First Metacarpal", grp: "Hand", bi: 1, q: 3,
    g: [bone(at(0), at(0.044), 0.0048, { ha: 0.0072, hb: 0.0068 })],
    d: "The short, stout metacarpal of the thumb. Its saddle joint with the trapezium is what makes the human thumb opposable.",
    fn: "Lets the thumb swing across the palm to touch each fingertip — the basis of precision grip.",
    kid: "Your thumb can touch all your other fingers. Very few animals can do that!",
    meta: { Type: "Long bone", Group: "Metacarpal" },
  });
  P({
    id: "hand-proximal-phalanx-1", name: "Proximal Phalanx of Thumb", grp: "Hand", bi: 1, q: 3,
    g: [bone(at(0.049), at(0.079), 0.004, { ha: 0.0058, hb: 0.0052 })],
    d: "The first of the two bones of the thumb.", fn: "Carries the thumb's knuckle hinge and the attachment of the short thumb muscles.",
    kid: "Your thumb has only two bones.", meta: { Type: "Long bone", Group: "Phalanx" },
  });
  P({
    id: "hand-distal-phalanx-1", name: "Distal Phalanx of Thumb", grp: "Hand", bi: 1, q: 3,
    g: [bone(at(0.083), at(0.105), 0.0035, { ha: 0.005, hb: 0.0045 })],
    d: "The tip bone of the thumb, under the thumbnail.", fn: "Supports the thumb pad used in pinching and gripping.",
    kid: "The thumb's tip bone sits right under your thumbnail.", meta: { Type: "Long bone", Group: "Phalanx" },
  });
}

/* =====================================================================
   PELVIC GIRDLE & LOWER LIMB (left; mirrored)
   ===================================================================== */
P({
  id: "hip-bone", name: "Hip Bone", grp: "Pelvis", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.ell([0.086, 0.99, -0.004], [0.074, 0.05, 0.0075], { e: [8, -59, -14] }),
    ...S.chain([L.asis, [0.125, 1.018, 0.035], L.crest, [0.1, 1.03, -0.045], [0.06, 1.012, -0.066], L.psis], 0.0055),
    S.cap([0.078, 0.975, -0.018], [0.086, 0.932, 0.014], 0.019, 0.02),
    S.sph(add(L.hip, [-0.01, 0.008, -0.004]), 0.027),
    S.cap([0.075, 0.915, 0.04], [0.02, 0.886, 0.074], 0.0085, 0.0075),
    S.ell([0.013, 0.876, 0.074], [0.011, 0.017, 0.009], { e: [0, -20, 0] }),
    S.cap([0.017, 0.862, 0.068], L.ischialTub, 0.0065, 0.009),
    S.cap([0.078, 0.905, 0.004], L.ischialTub, 0.011, 0.012),
    S.ell(add(L.ischialTub, [0.002, -0.002, 0]), [0.012, 0.013, 0.011]),
    S.sph(L.hip, 0.0245, { o: "s", k: 0.002 }),
    S.sph(add(L.hip, [0.03, -0.018, 0.018]), 0.024, { o: "s", k: 0.003 }),
  ], { k: 0.008, cell: 0.0025 })],
  d: "Also called the os coxae or innominate bone: the ilium, ischium and pubis fuse during the teenage years to form one large bone on each side of the pelvis.",
  fn: "Transfers body weight from the spine to the legs, protects the pelvic organs and anchors the powerful hip and trunk muscles. Its cup, the acetabulum, is the socket of the hip joint.",
  kid: "When you put your hands on your hips, you're touching the top edge of these bones.",
  meta: { Type: "Flat/irregular bone (3 fused bones)", "Articulates with": "Sacrum, femur, opposite hip bone (pubic symphysis)" },
});
P({
  id: "pubic-symphysis", name: "Pubic Symphysis", grp: "Cartilage & joints", mat: "cartilage", q: 3,
  g: [ell([0, 0.876, 0.075], [0.0035, 0.016, 0.008])],
  d: "The fibrocartilage joint that joins the two hip bones at the front of the pelvis.",
  fn: "Holds the pelvic ring together while allowing slight movement; it loosens during pregnancy to widen the birth canal.",
  kid: "The front of your hips is joined by a tough cushion of cartilage.", meta: { Type: "Secondary cartilaginous joint" },
});
P({
  id: "femur", name: "Femur", grp: "Thigh", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.sph(L.hip, 0.0235),
    S.cap(L.hip, [0.118, 0.897, 0.012], 0.0145, 0.0155),
    S.ell([0.13, 0.905, 0.002], [0.013, 0.018, 0.014]),
    S.sph([0.103, 0.858, -0.006], 0.0075),
    ...S.chain([[0.122, 0.885, 0.008], [0.113, 0.72, 0.016], [0.1, 0.565, 0.006]], [0.0145, 0.0125, 0.0145]),
    S.ell([0.076, 0.516, -0.004], [0.0155, 0.021, 0.026]),
    S.ell([0.109, 0.518, -0.002], [0.0155, 0.02, 0.025]),
    S.ell([0.093, 0.525, 0.012], [0.028, 0.02, 0.014]),
  ], { k: 0.01, cell: 0.0028 })],
  d: "The thigh bone — the longest, heaviest and strongest bone in the body, about a quarter of your height.",
  fn: "Carries the body's weight from the hip to the knee and anchors the thigh muscles used for standing, walking and running. Its marrow is a major site of blood-cell production in children.",
  kid: "Your thigh bone is the longest bone in your body — and stronger than concrete for its weight!",
  meta: { Type: "Long bone", "Articulates with": "Hip bone, tibia, patella" },
});
P({
  id: "patella", name: "Patella", grp: "Knee", bi: 1, lbl: 1, q: 1,
  g: [ell([0.094, 0.512, 0.036], [0.021, 0.024, 0.0095], { e: [-8, 0, 0] })],
  d: "The kneecap: the largest sesamoid bone in the body, embedded in the tendon of the quadriceps.",
  fn: "Protects the front of the knee and acts like a pulley, increasing the leverage of the quadriceps when you straighten your leg.",
  kid: "Babies are born with kneecaps made of soft cartilage that only turn to bone at around 3 to 5 years old.",
  meta: { Type: "Sesamoid bone", "Articulates with": "Femur" },
});
P({
  id: "tibia", name: "Tibia", grp: "Leg", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.ell([0.092, 0.478, 0.0], [0.036, 0.013, 0.026]),
    ...S.chain([[0.092, 0.466, 0.004], [0.089, 0.3, 0.01], [0.084, 0.12, 0.002]], [0.02, 0.0115, 0.0132]),
    S.sph([0.094, 0.448, 0.026], 0.0078),
    S.ell([0.083, 0.093, -0.006], [0.019, 0.014, 0.018]),
    ...S.chain([[0.069, 0.1, -0.004], [0.066, 0.066, -0.006]], [0.009, 0.006]),
  ], { k: 0.01, cell: 0.0026 })],
  d: "The shinbone: the larger, weight-bearing bone of the lower leg. Its front edge lies just under the skin, which is why knocks to the shin hurt so much.",
  fn: "Transmits body weight from the knee to the ankle. Its lower end forms the inner ankle bump (medial malleolus).",
  kid: "Your shinbone carries your weight down to your feet.",
  meta: { Type: "Long bone", "Articulates with": "Femur, fibula, talus" },
});
P({
  id: "fibula", name: "Fibula", grp: "Leg", bi: 1, lbl: 1, q: 1,
  g: [sdf([
    S.sph([0.121, 0.458, -0.02], 0.0095),
    ...S.chain([[0.121, 0.455, -0.02], [0.118, 0.28, -0.018], [0.113, 0.1, -0.022]], [0.006, 0.0052, 0.0064]),
    ...S.chain([[0.113, 0.1, -0.022], [0.114, 0.064, -0.022]], [0.008, 0.0055]),
  ], { k: 0.006, cell: 0.0018 })],
  d: "The slender outer bone of the lower leg. It carries little weight; its lower end forms the outer ankle bump (lateral malleolus).",
  fn: "Stabilises the ankle joint and anchors the muscles that turn the foot outwards. Surgeons can remove part of it to rebuild a jaw without losing the ability to walk.",
  kid: "The thin bone on the outside of your leg helps keep your ankle steady.",
  meta: { Type: "Long bone", "Articulates with": "Tibia, talus" },
});
const MEN = (cx, R, open) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = open + 0.5 + (i / 10) * (Math.PI * 2 - 1.0); pts.push([cx + Math.cos(a) * R, 0.4935, Math.sin(a) * R * 1.3]); }
  return pts;
};
P({
  id: "medial-meniscus", name: "Medial Meniscus", grp: "Cartilage & joints", bi: 1, mat: "cartilage", q: 3,
  g: [tube(MEN(0.078, 0.013, 0), [0.0025, 0.0035, 0.004, 0.0035, 0.0025], { fa: 0.7, up: [0, 1, 0] })],
  d: "A C-shaped wedge of fibrocartilage on the inner half of the tibial plateau. It is firmly attached to the joint capsule, so it is torn more often than the lateral meniscus.",
  fn: "Deepens the knee socket, spreads load across the joint and absorbs shock.",
  kid: "Rubbery crescents in your knee cushion every step.", meta: { Type: "Fibrocartilage" },
});
P({
  id: "lateral-meniscus", name: "Lateral Meniscus", grp: "Cartilage & joints", bi: 1, mat: "cartilage", q: 3,
  g: [tube(MEN(0.107, 0.0105, Math.PI), [0.0025, 0.0033, 0.0036, 0.0033, 0.0025], { fa: 0.7, up: [0, 1, 0] })],
  d: "A nearly circular fibrocartilage ring on the outer half of the tibial plateau, more mobile than its medial partner.",
  fn: "Cushions and stabilises the lateral side of the knee.",
  kid: "Each knee has two cushions shaped like the letter C.", meta: { Type: "Fibrocartilage" },
});

/* ---- foot ---- */
const F_ = (u, v, w) => FOOT.at([u, v, w]);
const TARSALS = [
  ["talus", "Talus", [sdf([S.ell(F_(0, 0.064, 0.002), [0.0145, 0.012, 0.02]), S.cap(F_(-0.002, 0.06, 0.012), F_(-0.009, 0.056, 0.032), 0.0095, 0.0085)], { k: 0.004, cell: 0.0015 })],
    "The ankle bone that sits between the tibia and fibula above and the calcaneus below. No muscles attach to it.",
    "Transfers the entire body weight from the leg to the foot and forms the hinge of the ankle joint."],
  ["calcaneus", "Calcaneus", [sdf([...S.chain([F_(0.004, 0.04, 0.004), F_(0.006, 0.03, -0.042)], [0.014, 0.016]), S.ell(F_(0.006, 0.027, -0.05), [0.013, 0.018, 0.012]), S.sph(F_(-0.012, 0.045, 0.002), 0.006), S.ell(F_(0.01, 0.034, 0.022), [0.012, 0.012, 0.012])], { k: 0.005, cell: 0.0018 })],
    "The heel bone — the largest bone of the foot. The Achilles tendon attaches to the back of it.",
    "Takes the impact of each heel strike and acts as a lever for the calf muscles when you rise on your toes."],
  ["navicular", "Navicular", [ell(F_(-0.012, 0.056, 0.043), [0.013, 0.011, 0.0068], { e: [0, 10, 0] })],
    "A boat-shaped tarsal bone on the inner side of the foot, in front of the talus.", "A keystone of the medial longitudinal arch of the foot."],
  ["cuboid", "Cuboid", [ell(F_(0.017, 0.034, 0.048), [0.011, 0.011, 0.013])],
    "A cube-shaped tarsal on the outer side of the foot.", "Supports the lateral arch and carries a groove for the fibularis longus tendon."],
  ["medial-cuneiform", "Medial Cuneiform", [ell(F_(-0.019, 0.045, 0.059), [0.0075, 0.013, 0.01])],
    "The largest of the three wedge-shaped cuneiforms, at the base of the big toe's metatarsal.", "Helps form the transverse arch of the foot."],
  ["intermediate-cuneiform", "Intermediate Cuneiform", [ell(F_(-0.006, 0.051, 0.058), [0.0055, 0.01, 0.008])],
    "The smallest cuneiform, wedged between the medial and lateral cuneiforms.", "Locks the second metatarsal in place, stiffening the midfoot."],
  ["lateral-cuneiform", "Lateral Cuneiform", [ell(F_(0.005, 0.047, 0.059), [0.0058, 0.011, 0.009])],
    "The middle-sized cuneiform, between the intermediate cuneiform and the cuboid.", "Supports the third metatarsal and the transverse arch."],
];
for (const [id, name, g, d, fn] of TARSALS) P({ id, name, grp: "Foot", bi: 1, q: id === "calcaneus" || id === "talus" ? 2 : 3, g, d, fn, kid: "Seven tarsal bones make up your ankle and the back half of your foot.", meta: { Type: "Short bone", Group: "Tarsal bone" } });
const MT = [
  [[-0.018, 0.04, 0.068], [-0.024, 0.017, 0.13], 0.0055],
  [[-0.006, 0.045, 0.068], [-0.009, 0.014, 0.138], 0.0036],
  [[0.004, 0.042, 0.068], [0.004, 0.013, 0.132], 0.0035],
  [[0.013, 0.036, 0.064], [0.017, 0.013, 0.123], 0.0034],
  [[0.024, 0.03, 0.058], [0.031, 0.012, 0.112], 0.0037],
];
const TOES = ["Big Toe", "Second Toe", "Third Toe", "Fourth Toe", "Little Toe"];
const TOE_NUM = ["First", "Second", "Third", "Fourth", "Fifth"];
const TPH = { p: [0.03, 0.026, 0.022, 0.019, 0.017], m: [0, 0.012, 0.011, 0.009, 0.008], d: [0.024, 0.01, 0.009, 0.009, 0.008] };
MT.forEach(([a, b, r], i) => {
  P({
    id: `metatarsal-${i + 1}`, name: `${TOE_NUM[i]} Metatarsal`, grp: "Foot", bi: 1, q: 3,
    g: [bone(F_(...a), F_(...b), r, { ha: r * 1.65, hb: r * 1.6 })],
    d: `The long bone of the forefoot leading to the ${TOES[i].toLowerCase()}.${i === 0 ? " It is the shortest and thickest metatarsal and carries about a third of body weight during push-off." : i === 4 ? " Its base has a tuberosity where fibularis brevis attaches — a common site of fracture when the ankle is rolled." : ""}`,
    fn: "Forms the arches of the foot and the ball of the foot you push off from when walking.",
    kid: "The long bones in the middle of your foot make a springy arch.", meta: { Type: "Long bone", Group: "Metatarsal" },
  });
  let w = b[2] + 0.004, v = b[1] - 0.001;
  const segs = [["proximal", TPH.p[i]], ["middle", TPH.m[i]], ["distal", TPH.d[i]]].filter(([, l]) => l > 0);
  const u = b[0] + (i - 2) * 0.001;
  for (const [kind, l] of segs) {
    const rr = (i === 0 ? 0.0046 : 0.0029) * (kind === "distal" ? 0.85 : 1);
    P({
      id: `foot-${kind}-phalanx-${i + 1}`, name: `${cap(kind)} Phalanx of ${TOES[i]}`, grp: "Foot", bi: 1, q: 3,
      g: [bone(F_(u, v, w), F_(u + (i - 2) * 0.0008, v - 0.0015, w + l), rr, { ha: rr * 1.4, hb: rr * 1.3 })],
      d: `The ${kind} bone of the ${TOES[i].toLowerCase()}.${i === 0 ? " The big toe has only two phalanges." : ""}`,
      fn: "Toes spread the load at push-off and help you balance.",
      kid: "You have 14 toe bones in each foot — the same number as finger bones in each hand.", meta: { Type: "Long bone", Group: "Phalanx" },
    });
    w += l + 0.002; v -= 0.0015;
  }
});

function cap(s) { return s[0].toUpperCase() + s.slice(1); }

export default parts;
