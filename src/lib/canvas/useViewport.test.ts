import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IDENTITY_VIEWPORT, MAX_SCALE, screenToCanvas } from "./coords";
import { ZOOM_STEP, useViewport } from "./useViewport";

describe("useViewport", () => {
  it("começa em 100% na origem", () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.viewport).toEqual(IDENTITY_VIEWPORT);
  });

  it("acumula pans sucessivos", () => {
    const { result } = renderHook(() => useViewport());

    act(() => result.current.pan(10, 20));
    act(() => result.current.pan(-4, 5));

    expect(result.current.viewport).toMatchObject({ x: 6, y: 25 });
  });

  it("zoom por fator mantém o ponto ancorado", () => {
    const anchor = { x: 400, y: 300 };
    const { result } = renderHook(() => useViewport());
    const antes = screenToCanvas(anchor, result.current.viewport);

    act(() => result.current.zoomBy(ZOOM_STEP, anchor));

    expect(result.current.viewport.scale).toBeCloseTo(ZOOM_STEP, 10);
    expect(screenToCanvas(anchor, result.current.viewport).x).toBeCloseTo(antes.x, 10);
  });

  it("não passa do limite de escala por mais que se insista", () => {
    const { result } = renderHook(() => useViewport());

    for (let i = 0; i < 20; i += 1) {
      act(() => result.current.zoomBy(ZOOM_STEP, { x: 0, y: 0 }));
    }

    expect(result.current.viewport.scale).toBe(MAX_SCALE);
  });

  it("reset volta para 100% na origem depois de pan e zoom", () => {
    const { result } = renderHook(() => useViewport());

    act(() => result.current.pan(120, -80));
    act(() => result.current.zoomTo(2.5, { x: 10, y: 10 }));
    act(() => result.current.reset());

    expect(result.current.viewport).toEqual(IDENTITY_VIEWPORT);
  });
});
