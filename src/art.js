import info from "./art/info.json";
import { layoutPieces } from "./layout.js";

const originals = import.meta.glob("./art/*.{png,PNG}", {
  eager: true,
  query: "?url",
  import: "default",
});

// The originals are ~3300px wide, far more than the gallery needs.
const thumbs = import.meta.glob("./art/*.{png,PNG}", {
  eager: true,
  query: "?w=900&format=webp",
  import: "default",
});

export function loadPieces() {
  return layoutPieces(originals, thumbs, info);
}
