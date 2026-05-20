"use client";

import { useEffect, useState, type CSSProperties } from "react";

type TrailMark = {
  id: number;
  x: number;
  y: number;
  rotate: number;
  glyph: string;
};

const TRAIL_LIFETIME_MS = 900;
const TRAIL_INTERVAL_MS = 55;
const MAX_TRAIL_MARKS = 20;
const SPARKLE_GLYPHS = ["✨", "⭐", "✦"];

export default function CursorTrail() {
  const [marks, setMarks] = useState<TrailMark[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const timeouts: number[] = [];
    let lastPlacedAt = 0;
    let stepIndex = 0;

    const placeMark = (x: number, y: number) => {
      const now = performance.now();
      if (now - lastPlacedAt < TRAIL_INTERVAL_MS) return;
      lastPlacedAt = now;
      stepIndex += 1;

      const leftStep = stepIndex % 2 === 0;
      const id = now + Math.random();
      const mark: TrailMark = {
        id,
        x: x + (leftStep ? -11 : 11),
        y: y + (leftStep ? 6 : -4),
        rotate: leftStep ? -18 : 18,
        glyph: SPARKLE_GLYPHS[stepIndex % SPARKLE_GLYPHS.length],
      };

      setMarks((prev) => [...prev.slice(-(MAX_TRAIL_MARKS - 1)), mark]);

      const timeoutId = window.setTimeout(() => {
        setMarks((prev) => prev.filter((item) => item.id !== id));
      }, TRAIL_LIFETIME_MS);
      timeouts.push(timeoutId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      placeMark(event.clientX, event.clientY);
    };

    const onMouseMove = (event: MouseEvent) => {
      placeMark(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mousemove", onMouseMove);
      for (const timeoutId of timeouts) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div aria-hidden className="cursor-trail-layer">
      {marks.map((mark) => (
        <span
          key={mark.id}
          className="cursor-sparkle"
          style={
            {
              left: `${mark.x}px`,
              top: `${mark.y}px`,
              "--sparkle-rotate": `${mark.rotate}deg`,
            } as CSSProperties
          }
        >
          {mark.glyph}
        </span>
      ))}
    </div>
  );
}
