import { useEffect, useRef } from "react";

const SEGMENTS = 30;

const CORNERS = [
  { anchor: () => [-8, -8], hue: 310 },
  { anchor: (w) => [w + 8, -8], hue: 185 },
  { anchor: (w, h) => [w + 8, h + 8], hue: 150 },
  { anchor: (w, h) => [-8, h + 8], hue: 270 },
];

// Moves the chain toward `target` while keeping every segment `len` long,
// then pins the base back to the anchor (two-pass FABRIK).
function reach(pts, base, target, len) {
  const n = pts.length - 1;
  pts[n].x = target.x;
  pts[n].y = target.y;
  for (let i = n - 1; i >= 0; i--) {
    const dx = pts[i].x - pts[i + 1].x;
    const dy = pts[i].y - pts[i + 1].y;
    const d = Math.hypot(dx, dy) || 1;
    pts[i].x = pts[i + 1].x + (dx / d) * len;
    pts[i].y = pts[i + 1].y + (dy / d) * len;
  }
  pts[0].x = base[0];
  pts[0].y = base[1];
  for (let i = 1; i <= n; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const d = Math.hypot(dx, dy) || 1;
    pts[i].x = pts[i - 1].x + (dx / d) * len;
    pts[i].y = pts[i - 1].y + (dy / d) * len;
  }
}

export default function Tentacles({ mouse, paused }) {
  const ref = useRef(null);

  useEffect(() => {
    if (paused) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const tentacles = CORNERS.map((c) => ({ ...c, pts: [], tip: { x: 0, y: 0 } }));
    let w = 0, h = 0, segLen = 24, scale = 1, raf;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      segLen = Math.max(8, (Math.hypot(w, h) * 0.55) / SEGMENTS);
      scale = Math.min(1.6, Math.max(0.5, Math.min(w, h) / 800));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const t of tentacles) {
        const [bx, by] = t.anchor(w, h);
        t.pts = Array.from({ length: SEGMENTS + 1 }, (_, i) => ({
          x: bx + ((w / 2 - bx) * i) / SEGMENTS,
          y: by + ((h / 2 - by) * i) / SEGMENTS,
        }));
        t.tip = { x: w / 2, y: h / 2 };
      }
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const wander = Math.min(w, h) * 0.09;
      const m = mouse.current || { x: w / 2, y: h / 2 };

      tentacles.forEach((t, k) => {
        const base = t.anchor(w, h);
        const tx = m.x + Math.sin(time * 0.0013 + k * 2) * wander;
        const ty = m.y + Math.cos(time * 0.0011 + k * 3) * wander;
        t.tip.x += (tx - t.tip.x) * 0.045;
        t.tip.y += (ty - t.tip.y) * 0.045;

        const dx = t.tip.x - base[0];
        const dy = t.tip.y - base[1];
        const dist = Math.hypot(dx, dy) || 1;
        const maxReach = SEGMENTS * segLen;
        const target = dist > maxReach
          ? { x: base[0] + (dx / dist) * maxReach, y: base[1] + (dy / dist) * maxReach }
          : t.tip;

        const p = t.pts;
        reach(p, base, target, segLen);

        const body = p.map((pt, i) => {
          const next = p[Math.min(i + 1, SEGMENTS)];
          const prev = p[Math.max(i - 1, 0)];
          const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
          const sway = Math.sin(time * 0.004 + i * 0.55 + k) * Math.min(i, 12) * 0.9 * scale;
          return { x: pt.x - Math.sin(angle) * sway, y: pt.y + Math.cos(angle) * sway };
        });

        ctx.shadowColor = `hsl(${t.hue} 100% 60%)`;
        ctx.shadowBlur = 22;
        for (let i = 0; i < SEGMENTS; i++) {
          const thick = 1 - i / SEGMENTS;
          ctx.strokeStyle = `hsl(${t.hue} 100% ${28 + thick * 10}%)`;
          ctx.lineWidth = (3 + thick * 22) * scale;
          ctx.beginPath();
          ctx.moveTo(body[i].x, body[i].y);
          ctx.lineTo(body[i + 1].x, body[i + 1].y);
          ctx.stroke();
        }

        ctx.shadowBlur = 8;
        ctx.fillStyle = `hsl(${(t.hue + 40) % 360} 100% 75%)`;
        for (let i = 4; i < SEGMENTS; i += 2) {
          const thick = 1 - i / SEGMENTS;
          ctx.beginPath();
          ctx.arc(body[i].x, body[i].y, (1 + thick * 4) * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mouse, paused]);

  return <canvas ref={ref} className="tentacles" />;
}
