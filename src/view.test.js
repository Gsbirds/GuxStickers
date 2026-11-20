import { describe, expect, it } from "vitest";
import { artBounds, layoutPieces, roamBounds } from "./layout.js";
import { centerOn, clampView, fitView, MAX_ZOOM, zoomAt } from "./view.js";

const laptop = { w: 1440, h: 900 };

const art = {};
for (let i = 1; i <= 21; i++) art[`./art/piece-${String(i).padStart(2, "0")}.png`] = `/a/${i}.png`;
const pieces = layoutPieces(art);
const bounds = roamBounds(pieces);

// Where a world point lands on screen for a given view.
const toScreen = (v, x, y) => ({ x: v.x + x * v.z, y: v.y + y * v.z });

describe("fitView", () => {
  it.each([
    ["laptop", { w: 1440, h: 900 }],
    ["big monitor", { w: 2560, h: 1440 }],
    ["small window", { w: 1024, h: 700 }],
  ])("fits all the art on a %s", (_, screen) => {
    const v = fitView(pieces, screen);
    const b = artBounds(pieces);
    const topLeft = toScreen(v, b.x1, b.y1);
    const bottomRight = toScreen(v, b.x2, b.y2);

    expect(topLeft.x).toBeGreaterThanOrEqual(0);
    expect(topLeft.y).toBeGreaterThanOrEqual(0);
    expect(bottomRight.x).toBeLessThanOrEqual(screen.w);
    expect(bottomRight.y).toBeLessThanOrEqual(screen.h);
  });

  it("never zooms in past 100%, even with one piece", () => {
    const one = layoutPieces({ "./art/a.png": "/a.png" });
    expect(fitView(one, { w: 3000, h: 2000 }).z).toBe(1);
  });
});

describe("clampView", () => {
  const z = 0.5;

  it("leaves a view that's already in bounds alone", () => {
    // At this zoom the eye area is bigger than the screen both ways, so it can pan.
    expect((bounds.x2 - bounds.x1) * z).toBeGreaterThan(laptop.w);
    expect((bounds.y2 - bounds.y1) * z).toBeGreaterThan(laptop.h);

    // Top-left corner of the area 100px off screen: allowed.
    const v = { z, x: -bounds.x1 * z - 100, y: -bounds.y1 * z - 100 };
    expect(clampView(v, bounds, laptop)).toEqual(v);
  });

  it("won't let you drag past the left or top edge of the eye area", () => {
    const v = clampView({ z, x: 99999, y: 99999 }, bounds, laptop);
    const corner = toScreen(v, bounds.x1, bounds.y1);
    expect(corner.x).toBeCloseTo(0);
    expect(corner.y).toBeCloseTo(0);
  });

  it("won't let you drag past the right or bottom edge of the eye area", () => {
    const v = clampView({ z, x: -99999, y: -99999 }, bounds, laptop);
    const corner = toScreen(v, bounds.x2, bounds.y2);
    expect(corner.x).toBeCloseTo(laptop.w);
    expect(corner.y).toBeCloseTo(laptop.h);
  });

  it("centers the area when it's smaller than the screen", () => {
    const tiny = 0.05;
    const v = clampView({ z: tiny, x: 0, y: 0 }, bounds, laptop);
    const center = toScreen(v, (bounds.x1 + bounds.x2) / 2, (bounds.y1 + bounds.y2) / 2);
    expect(center.x).toBeCloseTo(laptop.w / 2);
    expect(center.y).toBeCloseTo(laptop.h / 2);
  });

  it("does nothing when there are no bounds yet", () => {
    const v = { z: 1, x: 5, y: 5 };
    expect(clampView(v, 0, laptop)).toBe(v);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the cursor in the same place", () => {
    const v = { z: 0.5, x: 100, y: 50 };
    const cursor = { x: 600, y: 400 };
    const worldX = (cursor.x - v.x) / v.z;
    const worldY = (cursor.y - v.y) / v.z;

    const zoomed = zoomAt(v, 1.5, cursor.x, cursor.y);
    expect(zoomed.z).toBeCloseTo(0.75);
    expect(toScreen(zoomed, worldX, worldY).x).toBeCloseTo(cursor.x);
    expect(toScreen(zoomed, worldX, worldY).y).toBeCloseTo(cursor.y);
  });

  it("stays between the min and max zoom", () => {
    const v = { z: 1, x: 0, y: 0 };
    expect(zoomAt(v, 100, 0, 0).z).toBe(MAX_ZOOM);
    expect(zoomAt(v, 0.0001, 0, 0, 0.3).z).toBe(0.3);
  });
});

describe("centerOn", () => {
  it("puts the middle of a piece in the middle of the screen", () => {
    const p = pieces[10];
    const v = centerOn({ z: 0.6, x: 0, y: 0 }, p, laptop);
    const middle = toScreen(v, p.x + p.w / 2, p.y + p.w / 2);
    expect(middle.x).toBeCloseTo(laptop.w / 2);
    expect(middle.y).toBeCloseTo(laptop.h / 2);
  });
});
