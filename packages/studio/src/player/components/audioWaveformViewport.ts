import { TIMELINE_VIEWPORT_BUDGETS } from "../lib/timelineViewportBudgets";

export interface WaveformViewport {
  fullWidth: number;
  left: number;
  width: number;
  displayLeft?: number;
  displayWidth?: number;
  bitmapWidth?: number;
}

export function getWaveformViewport(
  fullWidth: number,
  clipLeft: number,
  viewportLeft: number,
  viewportWidth: number,
): WaveformViewport {
  if (!(viewportWidth > 0)) return { fullWidth, left: 0, width: fullWidth };
  const overscan = viewportWidth * TIMELINE_VIEWPORT_BUDGETS.timeOverscanViewportRatio;
  const left = Math.min(fullWidth, Math.max(0, Math.floor(viewportLeft - overscan - clipLeft)));
  const right = Math.min(
    fullWidth,
    Math.max(0, Math.ceil(viewportLeft + viewportWidth + overscan - clipLeft)),
  );
  return { fullWidth, left, width: Math.max(0, right - left) };
}

export function alignWaveformViewport(
  viewport: WaveformViewport,
  displayWidth: number,
  scale: number,
): WaveformViewport {
  const fullBitmapWidth = Math.ceil(viewport.fullWidth * scale);
  const pixelsPerDisplayPixel = fullBitmapWidth / displayWidth;
  const firstPixel = Math.min(fullBitmapWidth, Math.floor(viewport.left * pixelsPerDisplayPixel));
  const endPixel = Math.min(
    fullBitmapWidth,
    Math.ceil((viewport.left + viewport.width) * pixelsPerDisplayPixel),
  );
  const bitmapWidth = viewport.width > 0 ? Math.max(0, endPixel - firstPixel) : 0;
  return {
    fullWidth: viewport.fullWidth,
    left: firstPixel / scale,
    width: bitmapWidth / scale,
    displayLeft: firstPixel / pixelsPerDisplayPixel,
    displayWidth: bitmapWidth / pixelsPerDisplayPixel,
    bitmapWidth,
  };
}

export function readWaveformViewport(container: HTMLElement): WaveformViewport {
  const fullWidth = Math.max(1, container.clientWidth);
  const viewport = container.closest("[data-timeline-scroll-viewport]");
  if (!(viewport instanceof HTMLElement)) return { fullWidth, left: 0, width: fullWidth };
  const bounds = container.getBoundingClientRect();
  const visible = getWaveformViewport(
    fullWidth,
    bounds.left,
    viewport.getBoundingClientRect().left + viewport.clientLeft,
    viewport.clientWidth,
  );
  return bounds.width > 0
    ? alignWaveformViewport(visible, bounds.width, window.devicePixelRatio || 1)
    : visible;
}
