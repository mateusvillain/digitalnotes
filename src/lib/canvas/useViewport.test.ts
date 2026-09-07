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

  it("não deixa rastro na URL nem no armazenamento local", () => {
    // O PRD trata o viewport como estado efêmero. Quando a #20 e a #22 passarem a escrever
    // na URL e no localStorage, é este teste que denuncia se o viewport for junto.
    const urlAntes = window.location.href;
    const { result } = renderHook(() => useViewport());

    act(() => result.current.pan(50, 50));
    act(() => result.current.zoomBy(2, { x: 0, y: 0 }));

    expect(window.location.href).toBe(urlAntes);
    expect(Object.keys(window.localStorage)).toHaveLength(0);
    expect(Object.keys(window.sessionStorage)).toHaveLength(0);
  });

  it("reset volta para 100% na origem depois de pan e zoom", () => {
    const { result } = renderHook(() => useViewport());

    act(() => result.current.pan(120, -80));
    act(() => result.current.zoomBy(2.5, { x: 10, y: 10 }));
    act(() => result.current.reset());

    expect(result.current.viewport).toEqual(IDENTITY_VIEWPORT);
  });
});
