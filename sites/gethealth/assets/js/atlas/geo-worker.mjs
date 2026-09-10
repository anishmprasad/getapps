/* GetHealth — meshing worker. Builds one part's geometry per message and
   hands the raw attribute arrays back to the main thread (transferred, not
   copied). */
import { buildGeometry } from "./geo.mjs";

self.onmessage = ({ data }) => {
  const { gen, i, g } = data;
  try {
    const geo = buildGeometry(g);
    const pos = geo.getAttribute("position").array;
    const nor = geo.getAttribute("normal").array;
    const uv = geo.getAttribute("uv").array;
    const idx = geo.index.array;
    const transfer = [...new Set([pos.buffer, nor.buffer, uv.buffer, idx.buffer])];
    self.postMessage({ gen, i, pos, nor, uv, idx }, transfer);
  } catch (e) {
    self.postMessage({ gen, i, error: String((e && e.message) || e) });
  }
};
