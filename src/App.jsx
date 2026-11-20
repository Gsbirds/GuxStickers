import { useEffect, useMemo, useRef, useState } from "react";
import { artBounds, buildEyes, loadPieces, roamBounds } from "./layout.js";
// import Tentacles from "./components/Tentacles.jsx";
import Eyes from "./components/Eyes.jsx";
import { AboutPage, ArtPage, Copyright } from "./components/Pages.jsx";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const MIN_START_ZOOM = 0.4;
const DRAG_THRESHOLD = 6;
const PARALLAX = 0.15;

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return [hash, setHash];
}

function fitView(pieces) {
  const b = artBounds(pieces);
  const bw = b.x2 - b.x1;
  const bh = b.y2 - b.y1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const z = Math.min(1, Math.max(MIN_START_ZOOM, Math.min((W * 0.9) / bw, (H * 0.82) / bh)));
  return {
    z,
    x: W / 2 - (b.x1 + bw / 2) * z,
    y: H / 2 - (b.y1 + bh / 2) * z,
  };
}

// Smallest zoom where the whole eye area still fits on screen.
function fitZoom(b) {
  return Math.min(window.innerWidth / (b.x2 - b.x1), window.innerHeight / (b.y2 - b.y1));
}

// Keeps the edges of the eye area from being dragged past the screen edges.
// If the area is narrower than the screen on an axis, it stays centered.
function clampAxis(offset, z, lo, hi, screen) {
  const span = (hi - lo) * z;
  if (span <= screen) return screen / 2 - ((lo + hi) / 2) * z;
  return Math.min(-lo * z, Math.max(screen - hi * z, offset));
}

function clampView(v, b) {
  if (!b) return v;
  return {
    z: v.z,
    x: clampAxis(v.x, v.z, b.x1, b.x2, window.innerWidth),
    y: clampAxis(v.y, v.z, b.y1, b.y2, window.innerHeight),
  };
}

export default function App() {
  const pieces = useMemo(loadPieces, []);
  const eyes = useMemo(() => buildEyes(pieces), [pieces]);
  const bounds = useMemo(() => pieces.length && roamBounds(pieces), [pieces]);

  const stageRef = useRef(null);
  const worldRef = useRef(null);
  const view = useRef({ x: 0, y: 0, z: 1 });
  const drag = useRef(null);
  const dragged = useRef(false);
  const mouse = useRef(null);

  const [hash, setHash] = useHash();
  const activePiece = useMemo(() => {
    const match = hash.match(/^#\/art\/(.+)$/);
    const slug = match && decodeURIComponent(match[1]);
    return pieces.find((p) => p.slug === slug) || null;
  }, [hash, pieces]);
  const showAbout = hash === "#/about";
  const pageOpen = !!activePiece || showAbout;

  const goHome = () => {
    drag.current = null;
    dragged.current = false;
    if (window.location.hash) {
      history.pushState(null, "", window.location.pathname + window.location.search);
    }
    setHash("");
  };

  const applyView = () => {
    const world = worldRef.current;
    if (!world) return;
    view.current = clampView(view.current, bounds);
    const { x, y, z } = view.current;
    world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    for (const el of world.querySelectorAll("[data-depth]")) {
      const shift = (el.dataset.depth - 1) * PARALLAX;
      el.style.setProperty("--px", `${x * shift}px`);
      el.style.setProperty("--py", `${y * shift}px`);
    }
  };

  useEffect(() => {
    if (!pieces.length) return;
    const fit = () => {
      view.current = fitView(pieces);
      applyView();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [pieces]);

  useEffect(() => {
    const onWheel = (e) => {
      if (pageOpen) return;
      e.preventDefault();
      const v = view.current;
      const minZoom = Math.max(MIN_ZOOM, fitZoom(bounds));
      const z = Math.min(MAX_ZOOM, Math.max(minZoom, v.z * Math.exp(-e.deltaY * 0.0015)));
      v.x = e.clientX - ((e.clientX - v.x) / v.z) * z;
      v.y = e.clientY - ((e.clientY - v.y) / v.z) * z;
      v.z = z;
      applyView();
    };
    const onKey = (e) => {
      if (e.key === "Escape") goHome();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [pageOpen]);

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
    dragged.current = false;
  };

  const onPointerMove = (e) => {
    mouse.current = { x: e.clientX, y: e.clientY };
    stageRef.current.style.setProperty("--mx", e.clientX + "px");
    stageRef.current.style.setProperty("--my", e.clientY + "px");

    const d = drag.current;
    if (!d) return;
    if (!dragged.current) {
      if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD) return;
      dragged.current = true;
      // Capturing on press instead would steal the click from the art.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    view.current.x += e.clientX - d.x;
    view.current.y += e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    applyView();
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const openPiece = (piece) => {
    if (!dragged.current) window.location.hash = "#/art/" + encodeURIComponent(piece.slug);
  };

  if (!pieces.length) {
    return (
      <div className="empty">
        <h1>Nothing here yet</h1>
        <p>
          Drop your PNG files into <code>src/art/</code> and they will appear.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={pageOpen ? "stage paused" : "stage"}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="squirm" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="3s"
                values="0.012 0.02;0.02 0.012;0.012 0.02"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" />
          </filter>
        </svg>

        {/* <Tentacles mouse={mouse} paused={pageOpen} /> */}
        <div className="spotlight" />
        <div className="scanlines" />

        <div className="world" ref={worldRef}>
          <Eyes eyes={eyes} mouse={mouse} view={view} paused={pageOpen} />
          {pieces.map((p) => (
            <figure
              key={p.id}
              className="piece"
              data-depth={p.depth}
              style={{
                left: p.x,
                top: p.y,
                width: p.w,
                "--rot": `${p.rot}deg`,
                "--h": p.hue,
                "--fd": `${p.floatDelay}s`,
              }}
              onClick={() => openPiece(p)}
            >
              <img src={p.thumb} alt={p.name} draggable={false} decoding="async" />
              <figcaption>{p.name}</figcaption>
            </figure>
          ))}
        </div>

        <a className="nav-about" href="#/about" onPointerDown={(e) => e.stopPropagation()}>
          about
        </a>

        <footer className="gallery-footer">
          <div className="hint">drag to wander · scroll to zoom · We are watching you.</div>
          <Copyright />
        </footer>
      </div>

      {activePiece && <ArtPage piece={activePiece} onBack={goHome} />}
      {showAbout && <AboutPage onBack={goHome} />}
    </>
  );
}
