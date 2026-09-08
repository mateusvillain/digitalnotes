import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test-utils/matchMedia";
import { useTouchPrimary } from "./useTouchPrimary";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useTouchPrimary", () => {
  it("reconhece um aparelho de toque", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useTouchPrimary());

    expect(result.current).toBe(true);
  });

  it("não trata um aparelho com ponteiro como toque", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useTouchPrimary());

    expect(result.current).toBe(false);
  });

  it("acompanha a mudança sem precisar recarregar", () => {
    const media = stubMatchMedia(true);
    const { result } = renderHook(() => useTouchPrimary());

    // Um teclado com trackpad acoplado ao tablet: deixa de ser um aparelho só de toque.
    act(() => media.change(false));

    expect(result.current).toBe(false);
  });

  it("para de escutar ao desmontar", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useTouchPrimary());

    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it("não quebra em ambiente sem matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);

    const { result } = renderHook(() => useTouchPrimary());

    // Sem como perguntar, a resposta segura é "tem ponteiro": esconder os controles de quem
    // tem mouse seria o erro mais caro dos dois.
    expect(result.current).toBe(false);
  });
});
