/**
 * GetHealth lab-test inventory.
 *
 * Each marker: canonical unit and adult reference range (sex-specific where
 * it differs), alternative units with conversion factors to the canonical
 * unit (value_canonical = value * f + (o || 0)), the organs it relates to
 * (human part ids — expanded to both sides at runtime), and plain-language
 * text on what it measures and what high or low results can mean.
 *
 * Ranges are typical adult values drawn from common laboratory practice.
 * Individual labs differ; when a report prints its own range, the scanner
 * prefers it (except where clinical decision bands apply, e.g. HbA1c).
 * This is educational material, not a diagnostic tool.
 */

const panels = [
  { id: "cbc", name: "Complete blood count" },
  { id: "lft", name: "Liver function" },
  { id: "kft", name: "Kidney function & electrolytes" },
  { id: "lipid", name: "Lipid profile" },
  { id: "sugar", name: "Diabetes & blood sugar" },
  { id: "thyroid", name: "Thyroid" },
  { id: "vitamins", name: "Vitamins, iron & minerals" },
  { id: "cardiac", name: "Heart & inflammation" },
  { id: "hormones", name: "Hormones" },
  { id: "urine", name: "Urine routine" },
  { id: "clotting", name: "Clotting" },
  { id: "markers", name: "Infection, immunity & tumour markers" },
];

const MARROW = ["sternum", "hip-bone", "femur"];
const LIVER = ["liver-right-lobe", "liver-left-lobe"];
const HEART = ["left-ventricle", "right-ventricle", "left-atrium", "right-atrium"];
const ARTERIES = ["coronary-arteries", "ascending-aorta", "aortic-arch", "abdominal-aorta", "common-carotid-artery"];
const MUSCLE = ["gastrocnemius", "rectus-femoris", "biceps-brachii", "deltoid"];
const BONES = ["femur", "tibia", "vertebra-l1", "hip-bone"];
const PARATHYROID = ["superior-parathyroid", "inferior-parathyroid"];
const LUNGS = ["right-superior-lobe", "right-middle-lobe", "right-inferior-lobe", "left-superior-lobe", "left-inferior-lobe"];
const JOINTS = ["capitate", "metacarpal-2", "metacarpal-3", "patella"];

/* [id, name, short, panel, unit, ref, organs, purpose, low, high, extra]
   ref: [lo, hi] or { m: [lo, hi], f: [lo, hi] } */
const M = [];
const add = (id, name, short, panel, unit, ref, organs, purpose, low, high, extra = {}) =>
  M.push({ id, name, short, panel, unit, ref, organs, purpose, low, high, ...extra });

/* ---------------------------------------------------------------- CBC */
add("hemoglobin", "Haemoglobin", "Hb", "cbc", "g/dL", { m: [13.0, 17.0], f: [12.0, 15.5] }, [...MARROW, "kidney", "spleen"],
  "The iron-rich protein inside red blood cells that carries oxygen from the lungs to every tissue.",
  "Anaemia — commonly from iron deficiency, low vitamin B12 or folate, blood loss (including heavy periods), chronic kidney disease or long-term illness. Can cause tiredness, breathlessness and pale skin.",
  "Dehydration, smoking, living at high altitude, long-term lung or heart disease, or rarely a marrow condition (polycythaemia).",
  { aka: ["haemoglobin", "hemoglobin", "hb", "hgb"], alt: [{ u: "g/l", f: 0.1 }, { u: "mmol/l", f: 1.611 }], mag: [0.1] });
add("rbc", "Red blood cell count", "RBC", "cbc", "10^6/µL", { m: [4.5, 5.9], f: [4.0, 5.2] }, [...MARROW, "kidney"],
  "The number of red blood cells in a volume of blood.",
  "Anaemia, blood loss, nutritional deficiency or marrow suppression.",
  "Dehydration, lung disease, high altitude or polycythaemia. A high count with small cells can suggest thalassaemia trait.",
  { aka: ["rbc count", "red blood cell count", "total rbc", "total rbc count", "red cell count", "erythrocyte count", "rbc"], alt: [{ u: "10^12/l", f: 1 }], mag: [0.000001] });
add("hematocrit", "Haematocrit (PCV)", "HCT", "cbc", "%", { m: [40, 52], f: [36, 46] }, MARROW,
  "The percentage of your blood volume made up of red cells.",
  "Anaemia or overhydration.", "Dehydration or excess red cell production.",
  { aka: ["haematocrit", "hematocrit", "hct", "pcv", "packed cell volume"], alt: [{ u: "l/l", f: 100 }], mag: [100] });
add("mcv", "Mean corpuscular volume", "MCV", "cbc", "fL", [80, 100], MARROW,
  "The average size of your red blood cells — a clue to the cause of anaemia.",
  "Small cells (microcytic): usually iron deficiency or thalassaemia trait.",
  "Large cells (macrocytic): vitamin B12 or folate deficiency, alcohol, liver disease, an underactive thyroid or some medicines.",
  { aka: ["mcv", "mean corpuscular volume", "mean cell volume"] });
add("mch", "Mean corpuscular haemoglobin", "MCH", "cbc", "pg", [27, 33], MARROW,
  "The average amount of haemoglobin in each red cell.", "Iron deficiency or thalassaemia.", "B12 or folate deficiency.",
  { aka: ["mch", "mean corpuscular hemoglobin", "mean corpuscular haemoglobin", "mean cell hemoglobin"] });
add("mchc", "Mean corpuscular haemoglobin concentration", "MCHC", "cbc", "g/dL", [32, 36], MARROW,
  "How concentrated the haemoglobin is inside red cells.", "Iron deficiency.", "Hereditary spherocytosis or a sample artefact.",
  { aka: ["mchc"], alt: [{ u: "g/l", f: 0.1 }] });
add("rdw", "Red cell distribution width", "RDW", "cbc", "%", [11.5, 14.5], MARROW,
  "How much your red cells vary in size.", "Rarely significant.", "Mixed or developing deficiencies (iron, B12, folate), recent bleeding or transfusion.",
  { aka: ["rdw", "rdw-cv", "rdw cv", "red cell distribution width"], loOk: true });
add("wbc", "White blood cell count", "WBC", "cbc", "10^3/µL", [4.0, 11.0], [...MARROW, "spleen", "thymus", "cervical-lymph-nodes"],
  "The total number of infection-fighting white cells.",
  "Some viral infections, autoimmune conditions, certain medicines or marrow problems. A low count raises infection risk.",
  "Infection, inflammation, stress, steroid medicines, smoking or, rarely, leukaemia.",
  { aka: ["wbc", "wbc count", "total wbc count", "total leucocyte count", "total leukocyte count", "tlc", "white blood cell count", "white cell count", "leucocytes", "leukocytes"], alt: [{ u: "10^9/l", f: 1 }, { u: "/ul", f: 0.001 }, { u: "cells/ul", f: 0.001 }, { u: "/cumm", f: 0.001 }], mag: [0.001] });
add("neutrophils", "Neutrophils", "Neut %", "cbc", "%", [40, 75], MARROW,
  "The most common white cell, the first responder to bacterial infection.",
  "Viral infections, some medicines (including chemotherapy), B12/folate deficiency or autoimmune disease.",
  "Bacterial infection, inflammation, stress, steroids or recent exercise.",
  { aka: ["neutrophils", "neutrophil", "polymorphs", "segmented neutrophils", "neutrophils %"] });
add("lymphocytes", "Lymphocytes", "Lymph %", "cbc", "%", [20, 45], ["thymus", "spleen", "cervical-lymph-nodes", "axillary-lymph-nodes"],
  "White cells that make antibodies (B cells) and kill infected cells (T cells).",
  "Stress, steroids, some viral infections (including HIV) or immune deficiency.",
  "Viral infections such as flu or glandular fever, whooping cough, or rarely lymphoma or leukaemia.",
  { aka: ["lymphocytes", "lymphocyte", "lymphs"] });
add("monocytes", "Monocytes", "Mono %", "cbc", "%", [2, 10], ["spleen", ...MARROW],
  "White cells that become macrophages, which engulf germs and debris.", "Usually not significant.", "Chronic infections (such as TB), recovery from infection, inflammatory disease.",
  { aka: ["monocytes", "monocyte"], loOk: true });
add("eosinophils", "Eosinophils", "Eos %", "cbc", "%", [1, 6], ["right-inferior-lobe", "left-inferior-lobe", "skin", "jejunum"],
  "White cells involved in allergy and fighting parasites.", "Usually not significant.",
  "Allergies, asthma, eczema, parasitic worm infections or some medicines.",
  { aka: ["eosinophils", "eosinophil", "eos"], loOk: true });
add("basophils", "Basophils", "Baso %", "cbc", "%", [0, 2], MARROW,
  "The rarest white cell, releasing histamine in allergic reactions.", "Not significant.", "Allergic reactions or, rarely, marrow disorders.",
  { aka: ["basophils", "basophil", "baso"] });
add("anc", "Absolute neutrophil count", "ANC", "cbc", "10^3/µL", [2.0, 7.5], MARROW,
  "The actual number of neutrophils — more useful than the percentage for judging infection risk.",
  "Neutropenia: a higher risk of bacterial infection, especially below 1.0.", "Bacterial infection, inflammation or steroid treatment.",
  { aka: ["absolute neutrophil count", "anc", "absolute neutrophils"], alt: [{ u: "10^9/l", f: 1 }, { u: "/ul", f: 0.001 }, { u: "/cumm", f: 0.001 }], mag: [0.001] });
add("platelets", "Platelet count", "PLT", "cbc", "10^3/µL", [150, 450], [...MARROW, "spleen", ...LIVER],
  "Tiny cell fragments that plug leaks and start blood clotting.",
  "Viral infections (dengue is a classic cause), immune thrombocytopenia, liver disease, an enlarged spleen or some medicines. Very low counts cause easy bruising and bleeding.",
  "Inflammation, infection, iron deficiency, after surgery or bleeding, or rarely a marrow disorder.",
  { aka: ["platelet count", "platelets", "plt", "thrombocytes", "platelet"], alt: [{ u: "10^9/l", f: 1 }, { u: "lakhs/cumm", f: 100 }, { u: "lakh/cumm", f: 100 }, { u: "lakhs", f: 100 }, { u: "/ul", f: 0.001 }, { u: "/cumm", f: 0.001 }], mag: [0.001, 100] });
add("mpv", "Mean platelet volume", "MPV", "cbc", "fL", [7.5, 11.5], MARROW,
  "The average size of platelets; young platelets are larger.", "Marrow under-production.", "Platelets being used up and replaced quickly.",
  { aka: ["mpv", "mean platelet volume"] });
add("esr", "Erythrocyte sedimentation rate", "ESR", "cbc", "mm/hr", { m: [0, 15], f: [0, 20] }, [],
  "How fast red cells settle in a tube — a non-specific sign of inflammation.", "Not significant.",
  "Infection, inflammatory or autoimmune disease (such as rheumatoid arthritis), anaemia, pregnancy or older age. It points to inflammation somewhere but not where.",
  { aka: ["esr", "erythrocyte sedimentation rate", "sed rate"] });
add("reticulocytes", "Reticulocyte count", "Retic", "cbc", "%", [0.5, 2.5], MARROW,
  "Young red cells — shows how actively the marrow is making new ones.", "The marrow isn't keeping up (deficiency or marrow problem).", "The marrow is responding to blood loss or red-cell breakdown.",
  { aka: ["reticulocyte count", "reticulocytes", "retic count"] });

/* ---------------------------------------------------------------- Liver */
add("bilirubin-total", "Bilirubin (total)", "T. Bili", "lft", "mg/dL", [0.2, 1.2], [...LIVER, "gallbladder", "bile-ducts", "spleen"],
  "A yellow pigment made when old red cells are broken down, processed by the liver and cleared in bile.", "Not significant.",
  "Liver inflammation, blocked bile ducts (gallstones), faster red-cell breakdown or harmless Gilbert's syndrome. High levels cause jaundice.",
  { aka: ["total bilirubin", "bilirubin total", "bilirubin, total", "s. bilirubin", "serum bilirubin", "bilirubin"], alt: [{ u: "umol/l", f: 0.0585 }] });
add("bilirubin-direct", "Bilirubin (direct)", "D. Bili", "lft", "mg/dL", [0, 0.3], [...LIVER, "bile-ducts", "gallbladder"],
  "The conjugated bilirubin the liver has already processed.", "Not significant.", "The liver can't pass bilirubin into bile — liver disease or a blocked bile duct.",
  { aka: ["direct bilirubin", "bilirubin direct", "bilirubin, direct", "conjugated bilirubin"], alt: [{ u: "umol/l", f: 0.0585 }] });
add("bilirubin-indirect", "Bilirubin (indirect)", "I. Bili", "lft", "mg/dL", [0.2, 0.9], ["spleen", ...LIVER],
  "Unconjugated bilirubin on its way to the liver.", "Not significant.", "Red cells breaking down faster than usual, or Gilbert's syndrome.",
  { aka: ["indirect bilirubin", "bilirubin indirect", "bilirubin, indirect", "unconjugated bilirubin"], alt: [{ u: "umol/l", f: 0.0585 }], loOk: true });
add("alt", "ALT (SGPT)", "ALT", "lft", "U/L", { m: [7, 55], f: [7, 45] }, LIVER,
  "An enzyme found mainly inside liver cells; it leaks into the blood when they are damaged.", "Not significant.",
  "Liver cell injury — fatty liver, viral hepatitis, alcohol, some medicines or supplements. Mild rises are common and often temporary.",
  { aka: ["alt", "sgpt", "alt (sgpt)", "sgpt (alt)", "alanine aminotransferase", "alanine transaminase"] });
add("ast", "AST (SGOT)", "AST", "lft", "U/L", [8, 40], [...LIVER, "left-ventricle", ...MUSCLE],
  "An enzyme found in the liver, heart and muscles.", "Not significant.",
  "Liver injury, muscle damage (including hard exercise) or heart muscle injury. An AST higher than ALT can point to alcohol-related liver disease.",
  { aka: ["ast", "sgot", "ast (sgot)", "sgot (ast)", "aspartate aminotransferase", "aspartate transaminase"] });
add("alp", "Alkaline phosphatase", "ALP", "lft", "U/L", [40, 130], [...LIVER, "bile-ducts", ...BONES],
  "An enzyme from the bile ducts and bone.", "Rarely: zinc or magnesium deficiency, hypothyroidism.",
  "Blocked bile flow, or high bone turnover (growth in teenagers, healing fractures, vitamin D deficiency, bone disease). Normal in pregnancy.",
  { aka: ["alp", "alkaline phosphatase", "alk phos", "alk. phosphatase"] });
add("ggt", "Gamma-glutamyl transferase", "GGT", "lft", "U/L", { m: [8, 61], f: [5, 36] }, [...LIVER, "bile-ducts", "pancreas"],
  "A liver and bile-duct enzyme that is sensitive to alcohol.", "Not significant.",
  "Alcohol use, fatty liver, blocked bile ducts or certain medicines. A high GGT with a high ALP points to the bile ducts rather than bone.",
  { aka: ["ggt", "gamma gt", "gamma-gt", "ggtp", "gamma glutamyl transferase", "gamma-glutamyl transferase"] });
add("total-protein", "Total protein", "TP", "lft", "g/dL", [6.0, 8.3], [...LIVER, "cervical-lymph-nodes"],
  "All the proteins in blood plasma — mainly albumin and globulins.", "Liver disease, protein loss through the kidneys or gut, or malnutrition.", "Dehydration or chronic inflammation; rarely myeloma.",
  { aka: ["total protein", "total proteins", "serum protein", "s. protein", "protein total"], alt: [{ u: "g/l", f: 0.1 }], mag: [0.1] });
add("albumin", "Albumin", "Alb", "lft", "g/dL", [3.5, 5.0], [...LIVER, "kidney"],
  "The main protein made by the liver; it keeps fluid inside blood vessels and carries hormones and drugs.",
  "Liver disease, kidney protein loss (nephrotic syndrome), malnutrition or inflammation. Low albumin can cause swollen ankles.", "Usually dehydration.",
  { aka: ["albumin", "serum albumin", "s. albumin"], alt: [{ u: "g/l", f: 0.1 }], mag: [0.1] });
add("globulin", "Globulin", "Glob", "lft", "g/dL", [2.0, 3.5], [...LIVER, "cervical-lymph-nodes", "spleen"],
  "Proteins including antibodies and transport proteins.", "Immune deficiency or liver disease.", "Chronic infection or inflammation, autoimmune disease or, rarely, myeloma.",
  { aka: ["globulin", "serum globulin"], alt: [{ u: "g/l", f: 0.1 }] });
add("ag-ratio", "Albumin/globulin ratio", "A/G", "lft", "ratio", [1.0, 2.2], LIVER,
  "The balance between albumin and globulins.", "Liver disease, kidney protein loss or high antibody levels.", "Usually not significant.",
  { aka: ["a/g ratio", "a:g ratio", "albumin/globulin ratio", "albumin globulin ratio", "ag ratio"] });
add("ldh", "Lactate dehydrogenase", "LDH", "lft", "U/L", [140, 280], [...HEART, ...LIVER, ...MUSCLE],
  "An enzyme in almost every tissue — raised whenever cells are damaged.", "Not significant.", "Tissue damage anywhere: red-cell breakdown, liver, muscle, heart or lung injury.",
  { aka: ["ldh", "lactate dehydrogenase", "ld"] });
add("ammonia", "Ammonia", "NH₃", "lft", "µmol/L", [15, 45], LIVER,
  "A waste product of protein breakdown that the liver turns into urea.", "Not significant.", "Severe liver disease, where it can affect the brain (hepatic encephalopathy).",
  { aka: ["ammonia", "blood ammonia"] });

/* ---------------------------------------------------------------- Kidney & electrolytes */
add("creatinine", "Creatinine", "Creat", "kft", "mg/dL", { m: [0.7, 1.3], f: [0.6, 1.1] }, ["kidney", ...MUSCLE],
  "A waste product from muscle that the kidneys filter out. The best single blood test of kidney filtering.",
  "Low muscle mass or pregnancy — usually not a concern.",
  "Reduced kidney function (acute or chronic), dehydration, very high muscle mass, high-protein diets or some medicines.",
  { aka: ["creatinine", "serum creatinine", "s. creatinine", "creat"], alt: [{ u: "umol/l", f: 0.0113 }], mag: [0.0113] });
add("urea", "Urea", "Urea", "kft", "mg/dL", [15, 45], ["kidney", ...LIVER],
  "A waste product made by the liver from protein and cleared by the kidneys.", "Low protein intake, liver disease or pregnancy.",
  "Dehydration, reduced kidney function, a high-protein diet or bleeding in the stomach.",
  { aka: ["urea", "blood urea", "serum urea", "s. urea"], alt: [{ u: "mmol/l", f: 6.006 }] });
add("bun", "Blood urea nitrogen", "BUN", "kft", "mg/dL", [7, 20], ["kidney", ...LIVER],
  "The nitrogen part of urea; the US equivalent of the urea test.", "Low protein intake or liver disease.", "Dehydration or reduced kidney function.",
  { aka: ["bun", "blood urea nitrogen", "urea nitrogen"], alt: [{ u: "mmol/l", f: 2.8 }] });
add("uric-acid", "Uric acid", "UA", "kft", "mg/dL", { m: [3.4, 7.0], f: [2.4, 6.0] }, ["kidney", "metatarsal-1"],
  "A waste product from the breakdown of purines in food and cells.", "Not usually significant.",
  "Gout (painful crystal arthritis, often in the big toe), kidney stones, kidney disease, alcohol, a purine-rich diet or some diuretics.",
  { aka: ["uric acid", "serum uric acid", "s. uric acid", "urate"], alt: [{ u: "umol/l", f: 0.0168 }, { u: "mmol/l", f: 16.8 }] });
add("egfr", "eGFR", "eGFR", "kft", "mL/min/1.73m²", [90, 200], ["kidney"],
  "Estimated glomerular filtration rate: how much blood your kidneys filter per minute, calculated from creatinine, age and sex.",
  "Reduced kidney function: 60–89 mildly reduced, 30–59 moderate chronic kidney disease, below 15 kidney failure. One low result should be repeated.", "Normal.",
  { aka: ["egfr", "estimated gfr", "e-gfr", "gfr"], hiOk: true, bands: [[0, 15, "Kidney failure range", "low"], [15, 30, "Severely reduced", "low"], [30, 60, "Moderately reduced", "low"], [60, 90, "Mildly reduced", "low"], [90, 1e9, "Normal", "normal"]] });
add("sodium", "Sodium", "Na⁺", "kft", "mmol/L", [135, 145], ["kidney", "adrenal-gland", "pituitary-gland"],
  "The main salt in body fluid; it controls water balance and nerve and muscle function.",
  "Hyponatraemia: too much water relative to salt — some diuretics, heart, liver or kidney failure, heavy sweating, vomiting or excess ADH. Can cause confusion.",
  "Dehydration, not drinking enough, or rarely diabetes insipidus.",
  { aka: ["sodium", "serum sodium", "s. sodium", "na", "na+"], alt: [{ u: "meq/l", f: 1 }] });
add("potassium", "Potassium", "K⁺", "kft", "mmol/L", [3.5, 5.1], ["kidney", "adrenal-gland", "left-ventricle"],
  "A salt essential for heart rhythm and muscle function.",
  "Vomiting, diarrhoea or diuretics. Can cause muscle weakness and heart rhythm problems.",
  "Kidney disease, some blood-pressure medicines or a haemolysed (damaged) sample. Very high levels are dangerous for the heart.",
  { aka: ["potassium", "serum potassium", "s. potassium", "k", "k+"], alt: [{ u: "meq/l", f: 1 }] });
add("chloride", "Chloride", "Cl⁻", "kft", "mmol/L", [98, 107], ["kidney"],
  "A salt that works with sodium to keep fluid and acid–base balance.", "Vomiting or some acid–base disorders.", "Dehydration or some kidney and acid–base disorders.",
  { aka: ["chloride", "serum chloride", "s. chloride", "cl", "cl-"], alt: [{ u: "meq/l", f: 1 }] });
add("bicarbonate", "Bicarbonate", "HCO₃⁻", "kft", "mmol/L", [22, 29], ["kidney", ...LUNGS],
  "The main buffer that keeps blood acidity in range.", "Metabolic acidosis — kidney disease, uncontrolled diabetes (ketoacidosis) or severe diarrhoea.", "Vomiting, diuretics or long-term lung disease.",
  { aka: ["bicarbonate", "hco3", "total co2", "tco2"], alt: [{ u: "meq/l", f: 1 }] });
add("calcium", "Calcium", "Ca", "kft", "mg/dL", [8.6, 10.3], [...PARATHYROID, "kidney", "duodenum", ...BONES],
  "The mineral that builds bones and teeth and lets nerves, muscles and the heart work.",
  "Vitamin D deficiency, low parathyroid hormone, kidney disease or low albumin. Can cause tingling and cramps.",
  "Overactive parathyroid glands, too much vitamin D or calcium supplements, or some cancers.",
  { aka: ["calcium", "serum calcium", "s. calcium", "total calcium", "ca"], alt: [{ u: "mmol/l", f: 4.008 }] });
add("ionized-calcium", "Ionised calcium", "iCa", "kft", "mg/dL", [4.6, 5.3], [...PARATHYROID, "kidney"],
  "The free, active form of calcium in the blood.", "Low parathyroid activity or vitamin D deficiency.", "Overactive parathyroid glands.",
  { aka: ["ionized calcium", "ionised calcium", "ica", "free calcium"], alt: [{ u: "mmol/l", f: 4.008 }] });
add("phosphorus", "Phosphorus", "PO₄", "kft", "mg/dL", [2.5, 4.5], ["kidney", ...PARATHYROID, ...BONES],
  "A mineral that pairs with calcium in bone and powers cell energy.", "Malnutrition, alcohol or overactive parathyroid.", "Kidney disease or underactive parathyroid.",
  { aka: ["phosphorus", "phosphate", "inorganic phosphorus", "serum phosphorus"], alt: [{ u: "mmol/l", f: 3.097 }] });
add("magnesium", "Magnesium", "Mg", "kft", "mg/dL", [1.7, 2.2], ["kidney", "left-ventricle"],
  "A mineral needed for muscles, nerves, heart rhythm and hundreds of enzymes.", "Poor diet, alcohol, diarrhoea or diuretics; can cause cramps and palpitations.", "Kidney disease or supplements/antacids.",
  { aka: ["magnesium", "serum magnesium", "s. magnesium", "mg"], alt: [{ u: "mmol/l", f: 2.43 }, { u: "meq/l", f: 1.215 }] });

/* ---------------------------------------------------------------- Lipids */
const LIPID_ORG = [...ARTERIES, ...LIVER];
add("cholesterol-total", "Total cholesterol", "TC", "lipid", "mg/dL", [0, 200], LIPID_ORG,
  "All the cholesterol in your blood — a building block for cells and hormones that can also clog arteries.", "Rarely significant.",
  "A higher risk of fatty deposits in the arteries (atherosclerosis), heart attack and stroke — interpret together with LDL and HDL.",
  { aka: ["total cholesterol", "cholesterol total", "cholesterol, total", "serum cholesterol", "s. cholesterol", "cholesterol"], alt: [{ u: "mmol/l", f: 38.67 }], bands: [[0, 200, "Desirable", "normal"], [200, 240, "Borderline high", "high"], [240, 1e9, "High", "high"]] });
add("ldl", "LDL cholesterol", "LDL", "lipid", "mg/dL", [0, 100], LIPID_ORG,
  "'Bad' cholesterol: the particles that deposit cholesterol in artery walls.", "Not a concern.",
  "The main target for preventing heart attacks and strokes. Diet, exercise, weight and sometimes statin medicines lower it.",
  { aka: ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol", "low density lipoprotein", "ldl direct"], alt: [{ u: "mmol/l", f: 38.67 }], bands: [[0, 100, "Optimal", "normal"], [100, 130, "Near optimal", "normal"], [130, 160, "Borderline high", "high"], [160, 190, "High", "high"], [190, 1e9, "Very high", "high"]] });
add("hdl", "HDL cholesterol", "HDL", "lipid", "mg/dL", { m: [40, 100], f: [50, 100] }, LIPID_ORG,
  "'Good' cholesterol: it carries cholesterol away from arteries back to the liver.", "A higher heart risk. Exercise, stopping smoking and losing weight raise HDL.", "Generally protective.",
  { aka: ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol", "high density lipoprotein", "hdl direct"], alt: [{ u: "mmol/l", f: 38.67 }], hiOk: true });
add("triglycerides", "Triglycerides", "TG", "lipid", "mg/dL", [0, 150], [...LIVER, "pancreas", ...ARTERIES],
  "Fats carried in the blood from food and made by the liver from excess sugar and alcohol.", "Not a concern.",
  "Higher heart risk, often with excess weight, sugar, alcohol or diabetes. Very high levels (above 500–1000) can inflame the pancreas.",
  { aka: ["triglycerides", "triglyceride", "tg", "trigs", "s. triglycerides"], alt: [{ u: "mmol/l", f: 88.57 }], bands: [[0, 150, "Normal", "normal"], [150, 200, "Borderline high", "high"], [200, 500, "High", "high"], [500, 1e9, "Very high", "high"]] });
add("vldl", "VLDL cholesterol", "VLDL", "lipid", "mg/dL", [5, 40], LIVER,
  "Very-low-density lipoprotein, which mainly carries triglycerides.", "Not a concern.", "Usually goes with high triglycerides.",
  { aka: ["vldl", "vldl cholesterol", "vldl-c"], alt: [{ u: "mmol/l", f: 38.67 }], loOk: true });
add("non-hdl", "Non-HDL cholesterol", "Non-HDL", "lipid", "mg/dL", [0, 130], ARTERIES,
  "Total cholesterol minus HDL — all the artery-clogging particles together.", "Not a concern.", "Higher cardiovascular risk.",
  { aka: ["non-hdl cholesterol", "non hdl cholesterol", "non-hdl", "non hdl"], alt: [{ u: "mmol/l", f: 38.67 }] });
add("chol-hdl-ratio", "Cholesterol/HDL ratio", "TC/HDL", "lipid", "ratio", [0, 4.5], ARTERIES,
  "A risk ratio: lower is better (ideally under 3.5).", "Good.", "Higher cardiovascular risk.",
  { aka: ["cholesterol/hdl ratio", "chol/hdl ratio", "tc/hdl ratio", "total cholesterol/hdl ratio", "tc/hdl"] });
add("ldl-hdl-ratio", "LDL/HDL ratio", "LDL/HDL", "lipid", "ratio", [0, 3.0], ARTERIES,
  "Another risk ratio; lower is better.", "Good.", "Higher cardiovascular risk.",
  { aka: ["ldl/hdl ratio", "ldl hdl ratio"] });
add("lipoprotein-a", "Lipoprotein(a)", "Lp(a)", "lipid", "mg/dL", [0, 30], ARTERIES,
  "A mostly inherited cholesterol particle that raises heart risk independently of LDL.", "Not a concern.", "An inherited extra risk factor for heart disease and stroke.",
  { aka: ["lipoprotein (a)", "lipoprotein(a)", "lp(a)", "lpa"] });

/* ---------------------------------------------------------------- Diabetes */
add("glucose-fasting", "Fasting glucose", "FBS", "sugar", "mg/dL", [70, 99], ["pancreas", ...LIVER],
  "Blood sugar after at least 8 hours without food.", "Hypoglycaemia — too much diabetes medicine, missed meals, alcohol or rarely a hormone problem. Causes shakiness, sweating and confusion.",
  "100–125 suggests prediabetes and 126 or more on two occasions suggests diabetes.",
  { aka: ["fasting blood sugar", "fasting blood glucose", "fasting plasma glucose", "fasting glucose", "glucose fasting", "glucose (fasting)", "blood sugar fasting", "fbs", "fbg", "fpg"], alt: [{ u: "mmol/l", f: 18.016 }], bands: [[0, 70, "Low", "low"], [70, 100, "Normal", "normal"], [100, 126, "Prediabetes range", "high"], [126, 1e9, "Diabetes range", "high"]] });
add("glucose-pp", "Post-meal glucose (2 h)", "PPBS", "sugar", "mg/dL", [70, 140], ["pancreas"],
  "Blood sugar two hours after a meal or glucose drink.", "Usually not significant after meals.", "140–199 suggests prediabetes and 200 or more suggests diabetes.",
  { aka: ["post prandial blood sugar", "postprandial blood sugar", "post prandial glucose", "postprandial glucose", "pp blood sugar", "ppbs", "ppbg", "glucose pp", "glucose (pp)", "2 hr glucose", "2 hour glucose"], alt: [{ u: "mmol/l", f: 18.016 }], bands: [[0, 70, "Low", "low"], [70, 140, "Normal", "normal"], [140, 200, "Prediabetes range", "high"], [200, 1e9, "Diabetes range", "high"]] });
add("glucose-random", "Random glucose", "RBS", "sugar", "mg/dL", [70, 140], ["pancreas"],
  "Blood sugar at any time of day.", "Hypoglycaemia.", "Above 200 with symptoms suggests diabetes; otherwise repeat as a fasting test or HbA1c.",
  { aka: ["random blood sugar", "random blood glucose", "random glucose", "glucose random", "rbs", "rbg", "blood glucose", "glucose"], alt: [{ u: "mmol/l", f: 18.016 }] });
add("hba1c", "HbA1c", "HbA1c", "sugar", "%", [4.0, 5.6], ["pancreas", "kidney", "eyeball"],
  "Glycated haemoglobin: the average blood sugar over the past 2–3 months.", "Rarely significant; can be falsely low with anaemia or recent blood loss.",
  "5.7–6.4% is the prediabetes range and 6.5% or above the diabetes range. In diabetes, lower HbA1c protects the eyes, kidneys, nerves and heart.",
  { aka: ["hba1c", "hb a1c", "hbalc", "hbatc", "hba1-c", "glycated haemoglobin", "glycated hemoglobin", "glycosylated haemoglobin", "glycosylated hemoglobin", "a1c"], alt: [{ u: "mmol/mol", f: 0.09148, o: 2.152 }], bands: [[0, 5.7, "Normal", "normal"], [5.7, 6.5, "Prediabetes range", "high"], [6.5, 1e9, "Diabetes range", "high"]] });
add("insulin", "Fasting insulin", "Insulin", "sugar", "µIU/mL", [2, 25], ["pancreas"],
  "The hormone that moves sugar into cells.", "Type 1 diabetes or advanced type 2 diabetes.", "Insulin resistance — common with excess weight, PCOS and prediabetes.",
  { aka: ["insulin", "fasting insulin", "insulin fasting", "serum insulin"], alt: [{ u: "pmol/l", f: 0.144 }, { u: "miu/l", f: 1 }] });
add("c-peptide", "C-peptide", "C-pep", "sugar", "ng/mL", [0.8, 3.1], ["pancreas"],
  "Released with insulin in equal amounts — shows how much insulin the pancreas itself is making.", "The pancreas makes little insulin (type 1 diabetes).", "Insulin resistance or kidney disease.",
  { aka: ["c-peptide", "c peptide"] });

/* ---------------------------------------------------------------- Thyroid */
const THY = ["thyroid-gland", "pituitary-gland"];
add("tsh", "TSH", "TSH", "thyroid", "µIU/mL", [0.4, 4.5], THY,
  "Thyroid-stimulating hormone from the pituitary. It rises when the thyroid is underactive and falls when it is overactive.",
  "An overactive thyroid (hyperthyroidism, e.g. Graves' disease), too much thyroxine medicine, or rarely a pituitary problem.",
  "An underactive thyroid (hypothyroidism, often Hashimoto's). Causes tiredness, weight gain, feeling cold and constipation.",
  { aka: ["tsh", "thyroid stimulating hormone", "thyrotropin", "ultrasensitive tsh", "tsh ultrasensitive", "tsh 3rd generation", "s. tsh"], alt: [{ u: "miu/l", f: 1 }, { u: "uiu/ml", f: 1 }, { u: "miu/ml", f: 1000 }] });
add("t3", "Total T3", "T3", "thyroid", "ng/dL", [80, 200], ["thyroid-gland"],
  "Triiodothyronine, the most active thyroid hormone.", "Underactive thyroid or severe illness.", "Overactive thyroid.",
  { aka: ["total t3", "t3 total", "t3", "triiodothyronine", "total triiodothyronine"], alt: [{ u: "nmol/l", f: 65.1 }, { u: "ng/ml", f: 100 }] });
add("t4", "Total T4", "T4", "thyroid", "µg/dL", [5.0, 12.0], ["thyroid-gland"],
  "Thyroxine, the main hormone released by the thyroid.", "Underactive thyroid.", "Overactive thyroid, or high binding proteins (pregnancy, the pill).",
  { aka: ["total t4", "t4 total", "t4", "thyroxine", "total thyroxine"], alt: [{ u: "nmol/l", f: 0.0777 }] });
add("ft3", "Free T3", "FT3", "thyroid", "pg/mL", [2.3, 4.2], ["thyroid-gland"],
  "The unbound, active part of T3.", "Underactive thyroid.", "Overactive thyroid.",
  { aka: ["free t3", "ft3", "free triiodothyronine"], alt: [{ u: "pmol/l", f: 0.651 }] });
add("ft4", "Free T4", "FT4", "thyroid", "ng/dL", [0.8, 1.8], ["thyroid-gland"],
  "The unbound, active part of T4 — the best measure of thyroid output.", "Underactive thyroid.", "Overactive thyroid or too much thyroxine medicine.",
  { aka: ["free t4", "ft4", "free thyroxine"], alt: [{ u: "pmol/l", f: 0.0777 }] });
add("anti-tpo", "Anti-TPO antibodies", "Anti-TPO", "thyroid", "IU/mL", [0, 35], ["thyroid-gland"],
  "Antibodies against the thyroid's own enzyme.", "Not significant.", "Autoimmune thyroid disease (Hashimoto's or Graves'), which may affect thyroid function now or later.",
  { aka: ["anti tpo", "anti-tpo", "anti thyroid peroxidase", "thyroid peroxidase antibodies", "tpo antibodies", "atpo"] });

/* ---------------------------------------------------------------- Vitamins, iron, minerals */
add("vitamin-d", "Vitamin D (25-OH)", "Vit D", "vitamins", "ng/mL", [30, 100], ["skin", ...LIVER, "kidney", ...PARATHYROID, ...BONES],
  "The storage form of vitamin D, made in the skin in sunlight and activated by the liver and kidneys. It controls calcium absorption and bone strength.",
  "Very common, especially with little sun exposure or darker skin. Can cause weak, aching bones and muscle weakness; 20–29 is insufficient and under 20 deficient.",
  "Usually from high-dose supplements; above 100–150 risks high calcium.",
  { aka: ["vitamin d", "vit d", "vitamin d3", "25-oh vitamin d", "25 oh vitamin d", "25-hydroxy vitamin d", "25 hydroxy vitamin d", "25(oh)d", "25(oh) vitamin d", "vitamin d total", "cholecalciferol"], alt: [{ u: "nmol/l", f: 0.4 }], bands: [[0, 20, "Deficient", "low"], [20, 30, "Insufficient", "low"], [30, 100, "Sufficient", "normal"], [100, 1e9, "Possible excess", "high"]] });
add("vitamin-b12", "Vitamin B12", "B12", "vitamins", "pg/mL", [200, 900], ["stomach", "ileum", "spinal-cord", "sciatic-nerve", "sternum", ...LIVER],
  "A vitamin needed to make red cells and keep nerves healthy. Absorbing it needs intrinsic factor from the stomach and a healthy ileum.",
  "Vegetarian or vegan diets, pernicious anaemia, stomach or gut disease, or long-term metformin or acid-reducing medicines. Causes anaemia with large red cells and numbness or tingling.",
  "Usually supplements; occasionally liver disease.",
  { aka: ["vitamin b12", "vit b12", "b12", "cobalamin", "cyanocobalamin", "serum b12"], alt: [{ u: "pmol/l", f: 1.355 }] });
add("folate", "Folate", "Folate", "vitamins", "ng/mL", [2.7, 17], ["jejunum", "sternum"],
  "Folic acid (vitamin B9), needed for making DNA and red cells and vital in early pregnancy.",
  "Poor diet, alcohol, gut disease or some medicines; causes anaemia with large red cells.", "Usually supplements.",
  { aka: ["folate", "folic acid", "serum folate", "vitamin b9"], alt: [{ u: "nmol/l", f: 0.441 }], hiOk: true });
add("iron", "Serum iron", "Fe", "vitamins", "µg/dL", { m: [65, 175], f: [50, 170] }, ["duodenum", ...LIVER, "spleen", "sternum"],
  "The iron circulating in the blood, bound to transferrin. It swings a lot through the day.", "Iron deficiency or chronic inflammation.", "Iron overload (haemochromatosis), supplements or liver damage.",
  { aka: ["iron", "serum iron", "s. iron", "fe"], alt: [{ u: "umol/l", f: 5.585 }] });
add("ferritin", "Ferritin", "Ferritin", "vitamins", "ng/mL", { m: [30, 400], f: [15, 150] }, [...LIVER, "spleen"],
  "The body's iron store. The earliest and most reliable sign of iron deficiency.",
  "Iron deficiency, even before anaemia develops — usually from diet, heavy periods or blood loss from the gut.",
  "Inflammation or infection (ferritin rises with inflammation), liver disease, alcohol or iron overload.",
  { aka: ["ferritin", "serum ferritin", "s. ferritin"], alt: [{ u: "ug/l", f: 1 }] });
add("tibc", "Total iron-binding capacity", "TIBC", "vitamins", "µg/dL", [250, 450], LIVER,
  "How much iron the blood's transport protein could carry. It rises when iron stores are low.", "Chronic inflammation or malnutrition.", "Iron deficiency or pregnancy.",
  { aka: ["tibc", "total iron binding capacity", "iron binding capacity"], alt: [{ u: "umol/l", f: 5.585 }] });
add("transferrin-saturation", "Transferrin saturation", "TSAT", "vitamins", "%", [20, 50], [...LIVER, "sternum"],
  "The percentage of transferrin that is carrying iron.", "Iron deficiency.", "Iron overload (haemochromatosis).",
  { aka: ["transferrin saturation", "tsat", "iron saturation", "% transferrin saturation"] });
add("zinc", "Zinc", "Zn", "vitamins", "µg/dL", [60, 120], ["skin", "jejunum"],
  "A trace mineral for immunity, wound healing, taste and growth.", "Poor diet, gut disease or alcohol.", "Excess supplements.",
  { aka: ["zinc", "serum zinc"], alt: [{ u: "umol/l", f: 6.54 }] });

/* ---------------------------------------------------------------- Heart & inflammation */
add("troponin-i", "Troponin I", "Trop I", "cardiac", "ng/mL", [0, 0.04], [...HEART, "coronary-arteries"],
  "A protein released only when heart muscle cells are damaged.", "Normal.",
  "Heart muscle injury — most importantly a heart attack. A raised troponin with chest pain needs emergency care.",
  { aka: ["troponin i", "trop i", "troponin-i", "hs troponin i", "hs-troponin i", "high sensitivity troponin i", "ctni"], alt: [{ u: "ng/l", f: 0.001 }, { u: "pg/ml", f: 0.001 }] });
add("troponin-t", "Troponin T", "Trop T", "cardiac", "ng/mL", [0, 0.014], [...HEART, "coronary-arteries"],
  "A heart-muscle protein used to detect heart attacks.", "Normal.", "Heart muscle injury; also mildly raised in kidney disease.",
  { aka: ["troponin t", "trop t", "troponin-t", "hs troponin t", "hs-troponin t", "ctnt"], alt: [{ u: "ng/l", f: 0.001 }, { u: "pg/ml", f: 0.001 }] });
add("ck-mb", "CK-MB", "CK-MB", "cardiac", "ng/mL", [0, 5], HEART,
  "The heart form of creatine kinase, an older marker of heart damage.", "Normal.", "Heart muscle injury (troponin is now preferred).",
  { aka: ["ck-mb", "ck mb", "ckmb", "cpk-mb"] });
add("ck", "Creatine kinase", "CK", "cardiac", "U/L", { m: [39, 308], f: [26, 192] }, [...MUSCLE, "left-ventricle"],
  "An enzyme that leaks from damaged muscle.", "Low muscle mass.", "Muscle injury or very hard exercise, statin side effects, muscle disease, or heart damage.",
  { aka: ["ck", "cpk", "creatine kinase", "creatine phosphokinase", "ck total"] });
add("bnp", "BNP", "BNP", "cardiac", "pg/mL", [0, 100], ["left-ventricle", "right-ventricle"],
  "B-type natriuretic peptide, released when the heart's ventricles are stretched.", "Normal.", "Heart failure — the higher, the more strain on the heart. Also rises with kidney disease and age.",
  { aka: ["bnp", "b-type natriuretic peptide", "brain natriuretic peptide"] });
add("nt-probnp", "NT-proBNP", "NT-proBNP", "cardiac", "pg/mL", [0, 125], ["left-ventricle", "right-ventricle"],
  "A fragment released with BNP — a sensitive test for heart strain.", "Normal.", "Heart failure or strain; cut-offs rise with age.",
  { aka: ["nt-probnp", "nt probnp", "nt-pro bnp", "n-terminal pro bnp"] });
add("hs-crp", "hs-CRP", "hs-CRP", "cardiac", "mg/L", [0, 3], ["coronary-arteries", ...LIVER],
  "A high-sensitivity test for low-grade inflammation, used to refine heart risk.", "Low cardiovascular risk (under 1).", "1–3 average and above 3 higher cardiovascular risk — if there's no infection at the time.",
  { aka: ["hs-crp", "hs crp", "hscrp", "high sensitivity crp", "high sensitivity c-reactive protein", "cardio crp"], bands: [[0, 1, "Low risk", "normal"], [1, 3, "Average risk", "normal"], [3, 10, "Higher risk", "high"], [10, 1e9, "Acute inflammation likely", "high"]] });
add("crp", "C-reactive protein", "CRP", "cardiac", "mg/L", [0, 5], LIVER,
  "A protein the liver makes quickly in response to inflammation or infection.", "Normal.",
  "Infection (especially bacterial), injury or inflammatory disease. Very high values usually mean significant infection.",
  { aka: ["crp", "c-reactive protein", "c reactive protein", "crp quantitative", "crp (quantitative)"], alt: [{ u: "mg/dl", f: 10 }] });
add("homocysteine", "Homocysteine", "Hcy", "cardiac", "µmol/L", [5, 15], [...ARTERIES, "femoral-vein"],
  "An amino acid that builds up when B12, folate or B6 are low.", "Not significant.", "B12 or folate deficiency, kidney disease or inherited conditions; linked to artery disease and clots.",
  { aka: ["homocysteine", "serum homocysteine"], loOk: true });

/* ---------------------------------------------------------------- Pancreas enzymes (grouped with liver/GI) */
add("amylase", "Amylase", "Amylase", "lft", "U/L", [30, 110], ["pancreas", "parotid-gland"],
  "A starch-digesting enzyme from the pancreas and salivary glands.", "Rarely significant.", "Acute pancreatitis, blocked pancreatic duct, or salivary gland problems such as mumps.",
  { aka: ["amylase", "serum amylase", "s. amylase"] });
add("lipase", "Lipase", "Lipase", "lft", "U/L", [10, 140], ["pancreas"],
  "A fat-digesting enzyme made almost only by the pancreas.", "Not significant.", "Acute pancreatitis (usually over 3× the upper limit), gallstones or pancreatic duct blockage.",
  { aka: ["lipase", "serum lipase", "s. lipase"] });

/* ---------------------------------------------------------------- Hormones */
add("cortisol", "Cortisol (morning)", "Cortisol", "hormones", "µg/dL", [6, 23], ["adrenal-gland", "pituitary-gland"],
  "The main stress hormone, made by the adrenal glands; highest in the morning.", "Adrenal insufficiency (Addison's disease) or pituitary problems — tiredness, low blood pressure.", "Stress, steroid medicines or Cushing's syndrome.",
  { aka: ["cortisol", "serum cortisol", "morning cortisol", "cortisol am", "cortisol (morning)"], alt: [{ u: "nmol/l", f: 0.03625 }] });
add("testosterone", "Testosterone (total)", "Testo", "hormones", "ng/dL", { m: [300, 1000], f: [15, 70] }, ["testis", "ovary", "adrenal-gland"],
  "The main male sex hormone, also present in smaller amounts in women.", "In men: low energy, libido and muscle mass (hypogonadism).", "In women: polycystic ovary syndrome (PCOS) or adrenal causes; in men, supplements.",
  { aka: ["testosterone", "total testosterone", "testosterone total", "serum testosterone"], alt: [{ u: "nmol/l", f: 28.84 }, { u: "ng/ml", f: 100 }] });
add("estradiol", "Oestradiol (E2)", "E2", "hormones", "pg/mL", { m: [10, 40], f: [30, 400] }, ["ovary"],
  "The main oestrogen; in women it varies widely across the menstrual cycle.", "Menopause, low ovarian function or low body weight.", "Ovulation, pregnancy, some medicines or ovarian cysts.",
  { aka: ["estradiol", "oestradiol", "e2", "serum estradiol"], alt: [{ u: "pmol/l", f: 0.2724 }] });
add("progesterone", "Progesterone", "Prog", "hormones", "ng/mL", { m: [0.1, 0.5], f: [0.1, 25] }, ["ovary", "uterus"],
  "A hormone from the ovary after ovulation that prepares the womb for pregnancy.", "No ovulation in that cycle, or early pregnancy problems.", "Ovulation has happened, or pregnancy.",
  { aka: ["progesterone", "serum progesterone"], alt: [{ u: "nmol/l", f: 0.3145 }] });
add("lh", "Luteinising hormone", "LH", "hormones", "mIU/mL", { m: [1.7, 8.6], f: [2.4, 12.6] }, ["pituitary-gland", "ovary", "testis"],
  "A pituitary hormone that triggers ovulation and testosterone production.", "Pituitary or hypothalamus problems.", "Menopause, PCOS or failing testes/ovaries; peaks at ovulation.",
  { aka: ["lh", "luteinizing hormone", "luteinising hormone"], alt: [{ u: "iu/l", f: 1 }] });
add("fsh", "Follicle-stimulating hormone", "FSH", "hormones", "mIU/mL", { m: [1.5, 12.4], f: [3.5, 12.5] }, ["pituitary-gland", "ovary", "testis"],
  "A pituitary hormone that grows egg follicles and supports sperm production.", "Pituitary problems.", "Menopause or reduced ovarian/testicular function.",
  { aka: ["fsh", "follicle stimulating hormone", "follicle-stimulating hormone"], alt: [{ u: "iu/l", f: 1 }] });
add("prolactin", "Prolactin", "PRL", "hormones", "ng/mL", { m: [4, 15], f: [4, 23] }, ["pituitary-gland", "mammary-gland"],
  "The pituitary hormone that makes milk.", "Rarely significant.", "Pregnancy and breastfeeding, stress, some medicines, an underactive thyroid or a pituitary tumour (prolactinoma).",
  { aka: ["prolactin", "serum prolactin", "prl"], alt: [{ u: "miu/l", f: 0.0472 }] });
add("psa", "PSA (total)", "PSA", "hormones", "ng/mL", [0, 4], ["prostate"], "Prostate-specific antigen, a protein made by the prostate.",
  "Normal.", "Prostate enlargement, infection or inflammation, recent ejaculation or cycling — and sometimes prostate cancer. Needs a doctor's interpretation.",
  { aka: ["psa", "total psa", "psa total", "prostate specific antigen", "prostate-specific antigen"], sex: "m" });
add("amh", "Anti-Müllerian hormone", "AMH", "hormones", "ng/mL", { f: [1.0, 3.5], m: [1.3, 14.8] }, ["ovary"],
  "A hormone from small ovarian follicles — an estimate of egg reserve.", "Lower ovarian reserve (falls naturally with age).", "Polycystic ovary syndrome.",
  { aka: ["amh", "anti mullerian hormone", "anti-mullerian hormone", "anti-müllerian hormone"], alt: [{ u: "pmol/l", f: 0.14 }] });
add("beta-hcg", "Beta hCG", "β-hCG", "hormones", "mIU/mL", [0, 5], ["uterus", "ovary"],
  "The pregnancy hormone made by the placenta.", "Normal (not pregnant).", "Pregnancy — or rarely certain tumours.",
  { aka: ["beta hcg", "b-hcg", "β-hcg", "beta-hcg", "hcg", "serum hcg", "total beta hcg"], alt: [{ u: "iu/l", f: 1 }] });
add("dhea-s", "DHEA-S", "DHEA-S", "hormones", "µg/dL", { m: [80, 560], f: [35, 430] }, ["adrenal-gland"],
  "An adrenal androgen that declines with age.", "Adrenal insufficiency.", "PCOS or adrenal overactivity.",
  { aka: ["dhea-s", "dheas", "dhea sulfate", "dhea sulphate", "dehydroepiandrosterone sulfate"], alt: [{ u: "umol/l", f: 36.85 }] });
add("pth", "Parathyroid hormone", "PTH", "hormones", "pg/mL", [15, 65], [...PARATHYROID, "kidney", ...BONES],
  "The hormone that raises blood calcium by drawing on bone and saving calcium in the kidneys.", "Underactive parathyroid glands (often after neck surgery).", "Overactive parathyroid glands, or a response to low vitamin D or kidney disease.",
  { aka: ["pth", "parathyroid hormone", "intact pth", "ipth", "parathormone"], alt: [{ u: "pmol/l", f: 9.43 }] });
add("acth", "ACTH", "ACTH", "hormones", "pg/mL", [7, 63], ["pituitary-gland", "adrenal-gland"],
  "The pituitary hormone that tells the adrenal glands to make cortisol.", "Pituitary problem or steroid use.", "Addison's disease or Cushing's disease.",
  { aka: ["acth", "adrenocorticotropic hormone"], alt: [{ u: "pmol/l", f: 4.51 }] });

/* ---------------------------------------------------------------- Urine */
const UT = ["kidney", "bladder", "ureter"];
add("urine-ph", "Urine pH", "U pH", "urine", "", [4.5, 8.0], ["kidney"],
  "How acidic or alkaline the urine is.", "Acidic urine: high-protein diets, uncontrolled diabetes, dehydration.", "Alkaline urine: vegetarian diets, some infections, kidney stones of certain types.",
  { aka: ["urine ph", "ph"] });
add("urine-sg", "Urine specific gravity", "U SG", "urine", "", [1.005, 1.03], ["kidney"],
  "How concentrated the urine is.", "Very dilute urine: drinking a lot, diuretics or kidneys that can't concentrate.", "Concentrated urine: dehydration.",
  { aka: ["specific gravity", "sp. gravity", "sp gravity", "urine specific gravity"] });
add("urine-protein", "Urine protein", "U Prot", "urine", "", "neg", ["kidney"],
  "Protein in urine. Healthy kidneys keep protein in the blood.", "—", "Kidney filter damage (from diabetes, high blood pressure, kidney disease), fever, hard exercise or infection.",
  { aka: ["urine protein", "protein", "albumin (urine)", "urine albumin", "proteins"], qual: true });
add("urine-glucose", "Urine glucose", "U Glu", "urine", "", "neg", ["kidney", "pancreas"],
  "Sugar in urine; it spills over when blood sugar is high.", "—", "High blood sugar (diabetes), pregnancy or some diabetes medicines (SGLT2 inhibitors).",
  { aka: ["urine glucose", "urine sugar", "glucose (urine)", "glucose", "sugar (urine)"], qual: true });
add("urine-ketones", "Urine ketones", "U Ket", "urine", "", "neg", ["pancreas", ...LIVER],
  "Ketones appear when the body burns fat for fuel.", "—", "Fasting, low-carb diets, vomiting — or dangerous diabetic ketoacidosis in people with diabetes.",
  { aka: ["ketones", "ketone bodies", "urine ketones", "acetone"], qual: true });
add("urine-blood", "Urine blood", "U Blood", "urine", "", "neg", UT,
  "Blood or haemoglobin in the urine, often invisible to the eye.", "—", "Infection, kidney stones, periods, hard exercise, kidney disease or, less often, bladder or kidney tumours.",
  { aka: ["occult blood", "urine blood", "blood (urine)", "haemoglobin (urine)", "hemoglobin (urine)"], qual: true });
add("urine-bilirubin", "Urine bilirubin", "U Bili", "urine", "", "neg", [...LIVER, "bile-ducts"],
  "Bilirubin in urine — normally absent.", "—", "Liver disease or blocked bile ducts (urine looks dark).",
  { aka: ["bilirubin (urine)", "urine bilirubin", "bile pigments", "bile salts", "bilirubin"], qual: true });
add("urine-nitrite", "Urine nitrite", "U Nitrite", "urine", "", "neg", UT,
  "Made by many bacteria from nitrates in urine.", "—", "A bacterial urinary tract infection is likely.",
  { aka: ["nitrite", "nitrites", "urine nitrite"], qual: true });
add("urine-pus-cells", "Urine pus cells", "Pus cells", "urine", "/hpf", [0, 5], UT,
  "White blood cells in the urine.", "Normal.", "Urinary tract infection or inflammation (a few more is normal in women).",
  { aka: ["pus cells", "pus cell", "wbc (urine)", "leucocytes (urine)", "urine wbc", "leukocytes urine"] });
add("urine-rbc", "Urine red cells", "U RBC", "urine", "/hpf", [0, 2], UT,
  "Red blood cells seen under the microscope.", "Normal.", "Infection, stones, exercise, periods or kidney disease.",
  { aka: ["rbc (urine)", "red blood cells (urine)", "urine rbc", "rbcs"] });
add("urine-epithelial", "Urine epithelial cells", "Epith", "urine", "/hpf", [0, 5], ["bladder", "ureter"],
  "Cells shed from the lining of the urinary tract.", "Normal.", "Usually a contaminated sample; sometimes inflammation.",
  { aka: ["epithelial cells", "epithelial cell", "squamous epithelial cells"] });
add("microalbumin", "Urine microalbumin", "Microalb", "urine", "mg/L", [0, 30], ["kidney"],
  "Tiny amounts of albumin in urine — the earliest sign of kidney damage from diabetes or high blood pressure.", "Normal.", "Early kidney damage; controlling blood sugar and pressure can reverse it.",
  { aka: ["microalbumin", "urine microalbumin", "micro albumin", "microalbumin (urine)"] });
add("acr", "Albumin/creatinine ratio", "ACR", "urine", "mg/g", [0, 30], ["kidney"],
  "Urine albumin corrected for concentration — the standard kidney-damage screen.", "Normal.", "30–300 moderately and above 300 severely increased albuminuria.",
  { aka: ["albumin creatinine ratio", "albumin/creatinine ratio", "acr", "uacr", "microalbumin/creatinine ratio"], alt: [{ u: "mg/mmol", f: 8.84 }] });

/* ---------------------------------------------------------------- Clotting */
add("pt", "Prothrombin time", "PT", "clotting", "s", [11, 13.5], LIVER,
  "How long blood takes to clot through the 'extrinsic' pathway, which depends on liver-made clotting factors and vitamin K.", "Not significant.", "Warfarin, liver disease, vitamin K deficiency or clotting factor problems.",
  { aka: ["prothrombin time", "pt", "pt (patient)", "pt patient", "pt test"] });
add("inr", "INR", "INR", "clotting", "", [0.8, 1.2], LIVER,
  "A standardised version of the prothrombin time. People on warfarin are usually aimed at 2–3.", "Not significant.", "Warfarin (expected), liver disease or vitamin K deficiency.",
  { aka: ["inr", "international normalized ratio", "international normalised ratio"] });
add("aptt", "aPTT", "aPTT", "clotting", "s", [25, 35], LIVER,
  "Clotting time through the 'intrinsic' pathway.", "Not significant.", "Heparin, haemophilia, von Willebrand disease or lupus anticoagulant.",
  { aka: ["aptt", "ptt", "activated partial thromboplastin time", "partial thromboplastin time"] });
add("d-dimer", "D-dimer", "D-dimer", "clotting", "µg/mL FEU", [0, 0.5], ["femoral-vein", ...LUNGS],
  "A fragment released when a blood clot breaks down.", "Normal — helps rule out a clot.", "Possible clot (deep vein thrombosis or pulmonary embolism), but also infection, pregnancy, surgery and older age.",
  { aka: ["d-dimer", "d dimer", "ddimer"], alt: [{ u: "ng/ml", f: 0.001 }, { u: "mg/l", f: 1 }] });
add("fibrinogen", "Fibrinogen", "Fib", "clotting", "mg/dL", [200, 400], LIVER,
  "The liver-made protein that forms the mesh of a clot.", "Liver disease or clotting being used up (DIC).", "Inflammation, pregnancy or smoking.",
  { aka: ["fibrinogen", "plasma fibrinogen"], alt: [{ u: "g/l", f: 100 }] });

/* ---------------------------------------------------------------- Infection, immunity, tumour markers */
add("hbsag", "Hepatitis B surface antigen", "HBsAg", "markers", "", "neg", LIVER,
  "A protein from the hepatitis B virus.", "—", "Current hepatitis B infection. Needs follow-up with a doctor.",
  { aka: ["hbsag", "hepatitis b surface antigen", "australia antigen"], qual: true });
add("anti-hcv", "Hepatitis C antibody", "Anti-HCV", "markers", "", "neg", LIVER,
  "Antibodies to the hepatitis C virus.", "—", "Past or current hepatitis C; a follow-up viral load test tells which.",
  { aka: ["anti hcv", "anti-hcv", "hcv antibody", "hepatitis c antibody"], qual: true });
add("rf", "Rheumatoid factor", "RF", "markers", "IU/mL", [0, 14], JOINTS,
  "An antibody often present in rheumatoid arthritis.", "Normal.", "Rheumatoid arthritis, other autoimmune diseases, chronic infection — or healthy older people.",
  { aka: ["rheumatoid factor", "rf", "ra factor", "ra test"] });
add("anti-ccp", "Anti-CCP antibodies", "Anti-CCP", "markers", "U/mL", [0, 20], JOINTS,
  "A very specific antibody test for rheumatoid arthritis.", "Normal.", "Rheumatoid arthritis is likely, sometimes years before symptoms.",
  { aka: ["anti ccp", "anti-ccp", "ccp antibodies", "anti cyclic citrullinated peptide"] });
add("aso", "ASO titre", "ASO", "markers", "IU/mL", [0, 200], ["mitral-valve", "palatine-tonsil"],
  "Antibodies after a streptococcal throat infection.", "Normal.", "A recent strep infection; relevant to rheumatic fever, which can damage heart valves.",
  { aka: ["aso", "aso titre", "aso titer", "antistreptolysin o"] });
add("procalcitonin", "Procalcitonin", "PCT", "markers", "ng/mL", [0, 0.5], [],
  "A marker that rises sharply in bacterial infection.", "Normal.", "Significant bacterial infection or sepsis.",
  { aka: ["procalcitonin", "pct"] });
add("cea", "CEA", "CEA", "markers", "ng/mL", [0, 3], ["transverse-colon", "ascending-colon", "descending-colon", "rectum"],
  "Carcinoembryonic antigen, used to monitor some cancers (especially bowel).", "Normal.", "Smoking, inflammation and some cancers. Not a screening test on its own.",
  { aka: ["cea", "carcinoembryonic antigen"] });
add("ca-125", "CA-125", "CA-125", "markers", "U/mL", [0, 35], ["ovary"],
  "A protein used to monitor ovarian cancer treatment.", "Normal.", "Periods, endometriosis, fibroids, pregnancy — and ovarian cancer. Not a screening test on its own.",
  { aka: ["ca 125", "ca-125", "ca125", "cancer antigen 125"], sex: "f" });
add("ca-19-9", "CA 19-9", "CA 19-9", "markers", "U/mL", [0, 37], ["pancreas", "bile-ducts"],
  "A marker used to monitor pancreatic and bile-duct cancers.", "Normal.", "Bile-duct blockage, pancreatitis — and some cancers.",
  { aka: ["ca 19-9", "ca19-9", "ca 19.9", "ca 199"] });
add("afp", "Alpha-fetoprotein", "AFP", "markers", "ng/mL", [0, 10], [...LIVER, "testis"],
  "A protein made by the fetal liver; in adults it is used to monitor some liver and testicular tumours.", "Normal.", "Pregnancy, liver disease — or liver or testicular tumours.",
  { aka: ["afp", "alpha fetoprotein", "alpha-fetoprotein"], alt: [{ u: "iu/ml", f: 1.21 }] });

/* ---------------------------------------------------------------- output */
const markers = M.map((m) => {
  const out = { ...m };
  if (!Array.isArray(m.ref) && typeof m.ref === "object") { out.ref = undefined; out.refM = m.ref.m; out.refF = m.ref.f; }
  if (m.ref === "neg") { out.ref = undefined; }
  if (!out.aka) out.aka = [m.name.toLowerCase()];
  return out;
});
const ids = new Set();
for (const m of markers) { if (ids.has(m.id)) throw new Error(`duplicate marker ${m.id}`); ids.add(m.id); }

export default {
  version: 1,
  note: "Typical adult reference ranges for education. Laboratories differ — always use the range printed on your own report and discuss results with a doctor.",
  panels,
  markers,
};
