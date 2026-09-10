/** Human species definition: systems, presets and every part. */
import skeleton from "./skeleton.mjs";

const systems = [
  { id: "skeletal", name: "Skeleton", color: "#E6D9BF" },
  { id: "muscular", name: "Muscles", color: "#C4515C" },
  { id: "heart", name: "Heart", color: "#B8323F" },
  { id: "arteries", name: "Arteries", color: "#D8313D" },
  { id: "veins", name: "Veins", color: "#3E63C9" },
  { id: "respiratory", name: "Respiratory", color: "#E891A0" },
  { id: "digestive", name: "Digestive", color: "#D9925E" },
  { id: "nervous", name: "Nervous system", color: "#E8BE3A" },
  { id: "sensory", name: "Sensory organs", color: "#7FB2D6" },
  { id: "endocrine", name: "Endocrine glands", color: "#B889E0" },
  { id: "urinary", name: "Urinary", color: "#E0A73F" },
  { id: "reproductive", name: "Reproductive", color: "#E57FB0" },
  { id: "lymphatic", name: "Lymphatic & immune", color: "#72B85E" },
  { id: "integumentary", name: "Skin", color: "#E6B896", off: 1 },
];

const parts = [...skeleton].filter((p) => systems.some((s) => s.id === p.sys));

export default {
  id: "human",
  name: "Human",
  title: "Human Atlas",
  blurb: "Adult human anatomy — every bone, the major muscles, organs, vessels and nerves.",
  sexes: true,
  camera: { target: [0, 0.93, 0], dist: 3.1, fov: 30 },
  systems,
  presets: [
    { id: "all", name: "All", sys: systems.filter((s) => !s.off).map((s) => s.id) },
    { id: "skeleton", name: "Skeleton", sys: ["skeletal"] },
    { id: "organs", name: "Organs", sys: ["heart", "respiratory", "digestive", "urinary", "endocrine", "reproductive", "lymphatic", "sensory", "nervous"] },
    { id: "blood", name: "Circulation", sys: ["heart", "arteries", "veins"] },
  ],
  parts,
};
