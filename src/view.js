import { artBounds } from "./layout.js";

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;
const MIN_START_ZOOM = 0.15;

// Starting view: zoomed so all the art fits, centered on screen.
export function fitView(pieces, screen) {
  const b = artBounds(pieces);
  const bw = b.x2 - b.x1;
  const bh = b.y2 - b.y1;
  const z = Math.min(1, Math.max(MIN_START_ZOOM, Math.min((screen.w * 0.94) / bw, (screen.h * 0.8) / bh)));
  return {
    z,
    x: screen.w / 2 - (b.x1 + bw / 2) * z,
    y: screen.h / 2 - (b.y1 + bh / 2) * z,
  };
}

// Smallest zoom where the whole eye area still fits on screen.
export function fitZoom(b, screen) {
  return Math.min(screen.w / (b.x2 - b.x1), screen.h / (b.y2 - b.y1));
}

// Keeps the edges of the eye area from being dragged past the screen edges.
// If the area is narrower than the screen on an axis, it stays centered.
function clampAxis(offset, z, lo, hi, size) {
  const span = (hi - lo) * z;
  if (span <= size) return size / 2 - ((lo + hi) / 2) * z;
  return Math.min(-lo * z, Math.max(size - hi * z, offset));
}

export function clampView(v, b, screen) {
  if (!b) return v;
  return {
    z: v.z,
    x: clampAxis(v.x, v.z, b.x1, b.x2, screen.w),
    y: clampAxis(v.y, v.z, b.y1, b.y2, screen.h),
  };
}

// Zooms by `factor` while keeping the world point under (cx, cy) fixed.
export function zoomAt(v, factor, cx, cy, minZoom = MIN_ZOOM) {
  const z = Math.min(MAX_ZOOM, Math.max(minZoom, v.z * factor));
  return {
    z,
    x: cx - ((cx - v.x) / v.z) * z,
    y: cy - ((cy - v.y) / v.z) * z,
  };
}

// View that puts the middle of a piece in the middle of the screen.
export function centerOn(v, piece, screen) {
  return {
    z: v.z,
    x: screen.w / 2 - (piece.x + piece.w / 2) * v.z,
    y: screen.h / 2 - (piece.y + piece.w / 2) * v.z,
  };
}
