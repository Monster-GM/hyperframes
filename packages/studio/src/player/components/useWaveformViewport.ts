import { useCallback, useLayoutEffect, useRef } from "react";
import { useMountEffect } from "../../hooks/useMountEffect";

export function useWaveformViewport(draw: (canvas: HTMLCanvasElement) => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const cleanupRef = useRef<(() => void) | null>(null);
  const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    canvasRef.current = canvas;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let frame = 0;
    const paint = () => drawRef.current(canvas);
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
    };
    const viewport = container.closest("[data-timeline-scroll-viewport]");
    let canvasHeight = canvas.clientHeight;
    const resize = new ResizeObserver((entries) => {
      const height = canvas.clientHeight;
      if (height === canvasHeight && entries.every((entry) => entry.target === canvas)) return;
      canvasHeight = height;
      schedule();
    });
    resize.observe(container);
    resize.observe(canvas);
    if (viewport instanceof HTMLElement) resize.observe(viewport);
    const geometry = new MutationObserver(schedule);
    for (
      let ancestor = container.parentElement;
      ancestor && ancestor !== viewport && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      geometry.observe(ancestor, { attributes: true, attributeFilter: ["style"] });
    }
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-chrome", "data-theme", "style"],
    });
    viewport?.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    paint();
    cleanupRef.current = () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      geometry.disconnect();
      theme.disconnect();
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) draw(canvas);
  }, [draw]);
  useMountEffect(() => () => cleanupRef.current?.());
  return setCanvasRef;
}
