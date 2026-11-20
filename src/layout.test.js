import { describe, expect, it } from "vitest";
import { buildEyes, COLUMNS, layoutPieces, roamBounds } from "./layout.js";

const CELL = 700;

function fakeArt(count) {
  const files = {};
  for (let i = 1; i <= count; i++) {
    const name = `./art/piece-${String(i).padStart(2, "0")}.png`;
    files[name] = `/assets/piece-${i}.png`;
  }
  return files;
}

// The space a piece can take up, using the same 1.3x height allowance as the eye placement.
const artBox = (p) => ({ x1: p.x, y1: p.y, x2: p.x + p.w, y2: p.y + p.w * 1.3 });
const eyeBox = (e) => ({ x1: e.x, y1: e.y, x2: e.x + e.size, y2: e.y + e.size * 0.62 });
const overlaps = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

describe("layoutPieces", () => {
  const pieces = layoutPieces(fakeArt(21));

  it("makes one piece per file", () => {
    expect(pieces).toHaveLength(21);
    expect(new Set(pieces.map((p) => p.slug)).size).toBe(21);
  });

  it(`lays 21 pieces out ${COLUMNS} wide and 3 tall`, () => {
    const cols = new Set(pieces.map((p) => Math.round(p.x / CELL)));
    const rows = new Set(pieces.map((p) => Math.round(p.y / CELL)));
    expect(cols.size).toBe(COLUMNS);
    expect(rows.size).toBe(3);
  });

  it("gives every piece the same width", () => {
    expect(new Set(pieces.map((p) => p.w)).size).toBe(1);
  });

  it("produces the same layout every time", () => {
    expect(layoutPieces(fakeArt(21))).toEqual(pieces);
  });

  it("uses fewer columns when there are fewer pieces than COLUMNS", () => {
    const few = layoutPieces(fakeArt(3));
    expect(new Set(few.map((p) => Math.round(p.y / CELL))).size).toBe(1);
  });

  it("takes titles from info.json and falls back to the file name", () => {
    const info = {
      _default: { artist: "Gabby Burgard", availability: "Patreon and Etsy" },
      "piece-01.png": { title: "Eye Beast", price: "$25" },
    };
    const [first, second] = layoutPieces(fakeArt(2), {}, info);

    expect(first.name).toBe("Eye Beast");
    expect(first.meta).toMatchObject({ artist: "Gabby Burgard", price: "$25" });
    expect(second.name).toBe("piece 02");
    expect(second.meta.availability).toBe("Patreon and Etsy");
  });

  it("uses the thumbnail when there is one and the original otherwise", () => {
    const art = fakeArt(2);
    const [first, second] = layoutPieces(art, { "./art/piece-01.png": "/assets/thumb-1.webp" });
    expect(first.thumb).toBe("/assets/thumb-1.webp");
    expect(second.thumb).toBe(second.src);
  });

  it("returns an empty list when there is no art", () => {
    expect(layoutPieces({})).toEqual([]);
  });
});

describe("buildEyes", () => {
  const pieces = layoutPieces(fakeArt(21));
  const eyes = buildEyes(pieces);

  it("places a good number of eyes", () => {
    expect(eyes.length).toBeGreaterThan(30);
    expect(eyes.length).toBeLessThanOrEqual(70);
  });

  it("never puts an eye on top of or under a piece", () => {
    for (const e of eyes) {
      for (const p of pieces) {
        expect(overlaps(eyeBox(e), artBox(p))).toBe(false);
      }
    }
  });

  it("doesn't stack eyes on each other", () => {
    for (let i = 0; i < eyes.length; i++) {
      for (let j = i + 1; j < eyes.length; j++) {
        expect(overlaps(eyeBox(eyes[i]), eyeBox(eyes[j]))).toBe(false);
      }
    }
  });

  it("keeps every eye inside the area you can pan around", () => {
    const b = roamBounds(pieces);
    for (const e of eyes) {
      const box = eyeBox(e);
      expect(box.x1).toBeGreaterThanOrEqual(b.x1);
      expect(box.y1).toBeGreaterThanOrEqual(b.y1);
      expect(box.x2).toBeLessThanOrEqual(b.x2);
      expect(box.y2).toBeLessThanOrEqual(b.y2);
    }
  });

  it("produces the same eyes every time", () => {
    expect(buildEyes(pieces)).toEqual(eyes);
  });

  it("returns no eyes when there is no art", () => {
    expect(buildEyes([])).toEqual([]);
  });
});
