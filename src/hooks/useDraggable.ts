import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelLayout } from "@/types";
import { DEFAULT_LAYOUT, loadLayout, saveLayout } from "@/utils/storage";

const MIN_W = 340;
const MAX_W = 520;
const MIN_H = 320;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

/** Persisted, viewport-clamped panel position/size with drag + resize. */
export function usePanelLayout() {
  const [layout, setLayout] = useState<PanelLayout | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    loadLayout().then((l) => {
      const x = l.x < 0 ? Math.max(16, window.innerWidth - l.width - 24) : l.x;
      setLayout(fit({ ...l, x }));
    });
  }, []);

  const persist = useCallback((next: PanelLayout) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveLayout(next), 250);
  }, []);

  const update = useCallback(
    (patch: Partial<PanelLayout>) => {
      setLayout((prev) => {
        const next = fit({ ...(prev ?? DEFAULT_LAYOUT), ...patch });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Keep on-screen when the window resizes.
  useEffect(() => {
    const onResize = () => setLayout((prev) => (prev ? fit(prev) : prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Pointer-drag handler for the header. */
  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!layout || (e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      const startX = e.clientX - layout.x;
      const startY = e.clientY - layout.y;
      const move = (ev: PointerEvent) => update({ x: ev.clientX - startX, y: ev.clientY - startY });
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [layout, update],
  );

  /** Pointer-drag handler for the bottom-left resize grip. */
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (!layout) return;
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX;
      const sy = e.clientY;
      const { x, width, height } = layout;
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        const w = clamp(width - dx, MIN_W, MAX_W);
        update({ width: w, x: x + (width - w), height: clamp(height + dy, MIN_H, window.innerHeight - 24) });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [layout, update],
  );

  return { layout, update, startDrag, startResize };
}

function fit(l: PanelLayout): PanelLayout {
  const width = clamp(l.width, MIN_W, MAX_W);
  const height = clamp(l.height, MIN_H, Math.max(MIN_H, window.innerHeight - 24));
  const visibleH = l.minimized ? 44 : height;
  return {
    ...l,
    width,
    height,
    x: clamp(l.x, 8, Math.max(8, window.innerWidth - width - 8)),
    y: clamp(l.y, 8, Math.max(8, window.innerHeight - visibleH - 8)),
  };
}
