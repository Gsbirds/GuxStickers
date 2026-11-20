import { useEffect, useRef } from "react";

export default function Eyes({ eyes, mouse, view, paused }) {
  const pupils = useRef([]);

  useEffect(() => {
    if (paused) return;
    let raf;

    const track = () => {
      const v = view.current;
      const m = mouse.current || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      eyes.forEach((e, i) => {
        const pupil = pupils.current[i];
        if (!pupil) return;
        // Screen position comes from the pan/zoom state; measuring the DOM
        // for every eye on every frame forces a layout and drops frames.
        const cx = v.x + (e.x + e.size / 2) * v.z;
        const cy = v.y + (e.y + e.size * 0.31) * v.z;
        const angle = Math.atan2(m.y - cy, m.x - cx);
        const d = Math.min(Math.hypot(m.x - cx, m.y - cy) / 8 / v.z, e.size * 0.2);
        pupil.style.transform = `translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d}px)`;
      });

      raf = requestAnimationFrame(track);
    };

    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [eyes, mouse, view, paused]);

  return eyes.map((e, i) => (
    <div
      key={e.id}
      className="eye"
      style={{
        left: e.x,
        top: e.y,
        width: e.size,
        height: e.size * 0.62,
        "--h": e.hue,
        animationDuration: `${e.blink}s`,
        animationDelay: `${e.delay}s`,
      }}
    >
      <div className={e.slit ? "iris slit" : "iris"}>
        <div
          className="pupil"
          ref={(el) => {
            pupils.current[i] = el;
          }}
        />
      </div>
    </div>
  ));
}
