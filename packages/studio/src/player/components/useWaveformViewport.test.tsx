// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWaveformViewport } from "./useWaveformViewport";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function Waveform({ draw }: { draw: (canvas: HTMLCanvasElement) => void }) {
  const ref = useWaveformViewport(draw);
  return (
    <div>
      <canvas ref={ref} />
    </div>
  );
}

describe("useWaveformViewport", () => {
  it("coalesces scroll and passenger geometry changes and cancels a pending draw on unmount", async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => callbacks.delete(id));
    const viewport = document.createElement("div");
    viewport.setAttribute("data-timeline-scroll-viewport", "true");
    const passenger = document.createElement("div");
    const host = document.createElement("div");
    passenger.append(host);
    viewport.append(passenger);
    document.body.append(viewport);
    const root = createRoot(host);
    const draw = vi.fn();
    act(() => root.render(<Waveform draw={draw} />));
    draw.mockClear();

    await act(async () => {
      viewport.dispatchEvent(new Event("scroll"));
      viewport.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(callbacks.size).toBe(1);
    const pending = [...callbacks.values()];
    callbacks.clear();
    act(() => pending.forEach((callback) => callback(0)));
    expect(draw).toHaveBeenCalledTimes(1);

    draw.mockClear();
    await act(async () => {
      passenger.style.transform = "translateX(4000px)";
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(callbacks.size).toBe(1);
    const geometryCallbacks = [...callbacks.values()];
    callbacks.clear();
    act(() => geometryCallbacks.forEach((callback) => callback(0)));
    expect(draw).toHaveBeenCalledTimes(1);

    viewport.dispatchEvent(new Event("scroll"));
    expect(callbacks.size).toBe(1);
    act(() => root.unmount());
    expect(callbacks.size).toBe(0);
    viewport.dispatchEvent(new Event("scroll"));
    expect(callbacks.size).toBe(0);
  });

  it("draws new props without replacing the viewport subscription", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const first = vi.fn();
    const second = vi.fn();
    act(() => root.render(<Waveform draw={first} />));
    act(() => root.render(<Waveform draw={second} />));
    expect(second).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});
