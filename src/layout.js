import info from "./art/info.json";

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

export const HUES = [310, 150, 185, 55, 335, 270, 20, 95];
const CELL = 700;
const PIECE_WIDTH = 400;

const EYE_COUNT = 70;
const EYE_ART_MARGIN = 70;
const EYE_GAP = 20;

// Seeded so the layout stays the same between reloads.
function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const COLUMNS = 7;

function gridColumns(n) {
  return Math.max(1, Math.min(n, COLUMNS));
}

export function loadPieces() {
  const files = Object.entries(originals).sort(([a], [b]) => a.localeCompare(b));
  const cols = gridColumns(files.length);

  return files.map(([path, src], i) => {
    const r = rng(i + 1);
    const file = path.split("/").pop();
    const slug = file.replace(/\.png$/i, "");
    const meta = { ...info._default, ...info[file] };

    return {
      id: path,
      slug,
      src,
      thumb: thumbs[path] || src,
      name: meta.title || slug.replace(/[-_]+/g, " "),
      meta,
      x: (i % cols) * CELL + (r() - 0.5) * 180,
      y: Math.floor(i / cols) * CELL + (r() - 0.5) * 180,
      w: PIECE_WIDTH,
      rot: (r() - 0.5) * 8,
      depth: 0.7 + r() * 0.6,
      hue: HUES[i % HUES.length],
      floatDelay: -r() * 8,
    };
  });
}

export function artBounds(pieces) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of pieces) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + p.w);
    y2 = Math.max(y2, p.y + p.w * 1.2);
  }
  return { x1, y1, x2, y2 };
}

const overlaps = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function eyeArea(art) {
  return {
    x1: Math.min(...art.map((b) => b.x1)) - CELL * 1.6,
    x2: Math.max(...art.map((b) => b.x2)) + CELL * 1.6,
    y1: Math.min(...art.map((b) => b.y1)) - CELL * 0.6,
    y2: Math.max(...art.map((b) => b.y2)) + CELL * 0.6,
  };
}

// The region the eyes fill. Panning is kept inside it.
export function roamBounds(pieces) {
  return eyeArea(
    pieces.map((p) => ({
      x1: p.x - EYE_ART_MARGIN,
      y1: p.y - EYE_ART_MARGIN,
      x2: p.x + p.w + EYE_ART_MARGIN,
      y2: p.y + p.w * 1.3 + EYE_ART_MARGIN,
    }))
  );
}

// Scatters eyes around the art, never on top of or underneath a piece.
export function buildEyes(pieces) {
  if (!pieces.length) return [];
  const r = rng(777);

  // Image heights aren't known until they load, so allow up to 1.3x the width.
  const art = pieces.map((p) => ({
    x1: p.x - EYE_ART_MARGIN,
    y1: p.y - EYE_ART_MARGIN,
    x2: p.x + p.w + EYE_ART_MARGIN,
    y2: p.y + p.w * 1.3 + EYE_ART_MARGIN,
  }));

  const area = eyeArea(art);
  const eyes = [];
  for (let tries = 0; tries < EYE_COUNT * 60 && eyes.length < EYE_COUNT; tries++) {
    const size = 70 + r() * 160;
    const height = size * 0.62;
    const x = area.x1 + r() * (area.x2 - area.x1 - size);
    const y = area.y1 + r() * (area.y2 - area.y1 - height);
    const box = { x1: x, y1: y, x2: x + size, y2: y + height };
    const padded = { x1: x - EYE_GAP, y1: y - EYE_GAP, x2: box.x2 + EYE_GAP, y2: box.y2 + EYE_GAP };

    if (art.some((b) => overlaps(box, b))) continue;
    if (eyes.some((e) => overlaps(padded, e.box))) continue;

    eyes.push({
      id: eyes.length,
      box,
      x,
      y,
      size,
      hue: HUES[Math.floor(r() * HUES.length)],
      slit: r() > 0.5,
      blink: 4 + r() * 6,
      delay: -r() * 8,
    });
  }
  return eyes;
}
