import { useEffect, useMemo, useRef, useState } from "react";
import { loadPieces } from "./art.js";
import { buildEyes, roamBounds } from "./layout.js";
import { centerOn, clampView, fitView, fitZoom, MIN_ZOOM, zoomAt } from "./view.js";
// import Tentacles from "./components/Tentacles.jsx";
import Eyes from "./components/Eyes.jsx";
import { AboutPage, ArtPage, Copyright } from "./components/Pages.jsx";

const DRAG_THRESHOLD = 6;
const PARALLAX = 0.15;
const KEY_PAN = 120;
const KEY_ZOOM = 1.2;

const screen = () => ({ w: window.innerWidth, h: window.innerHeight });

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return [hash, setHash];
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
  const returnFocus = useRef(null);

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

  const applyView = (next = view.current) => {
    const world = worldRef.current;
    if (!world) return;
    view.current = clampView(next, bounds, screen());
    const { x, y, z } = view.current;
    world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    for (const el of world.querySelectorAll("[data-depth]")) {
      const shift = (el.dataset.depth - 1) * PARALLAX;
      el.style.setProperty("--px", `${x * shift}px`);
      el.style.setProperty("--py", `${y * shift}px`);
    }
  };

  const zoomBy = (factor, cx, cy) => {
    const minZoom = Math.max(MIN_ZOOM, fitZoom(bounds, screen()));
    applyView(zoomAt(view.current, factor, cx, cy, minZoom));
  };

  useEffect(() => {
    if (!pieces.length) return;
    const fit = () => applyView(fitView(pieces, screen()));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [pieces]);

  // Remember what opened a page, and put focus back there when it closes.
  useEffect(() => {
    if (pageOpen) {
      returnFocus.current = document.activeElement;
    } else if (returnFocus.current?.isConnected) {
      returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [pageOpen]);

  useEffect(() => {
    const onWheel = (e) => {
      if (pageOpen) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };

    const onKey = (e) => {
      if (e.key === "Escape") return goHome();
      if (pageOpen || e.metaKey || e.ctrlKey || e.altKey) return;

      const { w, h } = screen();
      const v = view.current;
      const pan = { ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN] };

      if (pan[e.key]) {
        const [dx, dy] = pan[e.key];
        applyView({ ...v, x: v.x + dx, y: v.y + dy });
      } else if (e.key === "+" || e.key === "=") {
        zoomBy(KEY_ZOOM, w / 2, h / 2);
      } else if (e.key === "-" || e.key === "_") {
        zoomBy(1 / KEY_ZOOM, w / 2, h / 2);
      } else if (e.key === "0") {
        applyView(fitView(pieces, screen()));
      } else {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [pageOpen, pieces, bounds]);

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
    const v = view.current;
    applyView({ ...v, x: v.x + e.clientX - d.x, y: v.y + e.clientY - d.y });
    d.x = e.clientX;
    d.y = e.clientY;
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  // A drag that ends on a piece shouldn't open it.
  const onPieceClick = (e) => {
    if (dragged.current) e.preventDefault();
  };

  // Tabbing to a piece that's off screen pans it into view. Mouse clicks also
  // focus links, so only do this for keyboard focus.
  const onPieceFocus = (e, piece) => {
    if (e.currentTarget.matches(":focus-visible")) {
      applyView(centerOn(view.current, piece, screen()));
    }
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
        inert={pageOpen}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
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

        <h1 className="visually-hidden">Gux Stickers gallery</h1>

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
            >
              <a
                className="piece-link"
                href={"#/art/" + encodeURIComponent(p.slug)}
                draggable={false}
                onClick={onPieceClick}
                onFocus={(e) => onPieceFocus(e, p)}
              >
                <img src={p.thumb} alt={p.name} draggable={false} decoding="async" />
              </a>
              <figcaption aria-hidden="true">{p.name}</figcaption>
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
