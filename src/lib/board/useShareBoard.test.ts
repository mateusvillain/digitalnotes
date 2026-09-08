import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION, createEmptyBoard, type Board } from "./types";
import { useShareBoard } from "./useShareBoard";

const board: Board = {
  version: SCHEMA_VERSION,
  notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text: "para enviar", z: 1 }],
};

function respondWith(body: unknown, status = 201) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useShareBoard", () => {
  it("começa parado e não toca no backend sozinho", () => {
    const fetchSpy = respondWith({ id: "abc", url: "https://site/board/abc" });

    const { result } = renderHook(() => useShareBoard(() => board));

    expect(result.current.state).toEqual({ status: "idle" });
    // Desenhar não publica: só o clique explícito manda o board para fora da máquina.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envia o board atual e devolve o link público", async () => {
    const fetchSpy = respondWith({ id: "abc", url: "https://site/board/abc" });
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "shared",
        url: "https://site/board/abc",
      });
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: board }),
    });
  });

  it("envia o board do instante do clique, não o de quando a ação foi criada", async () => {
    const fetchSpy = respondWith({ id: "abc", url: "https://site/board/abc" });
    let current = createEmptyBoard();
    const { result } = renderHook(() => useShareBoard(() => current));

    current = board;
    act(() => result.current.share());

    await waitFor(() => expect(result.current.state.status).toBe("shared"));
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect((init as RequestInit).body).toBe(JSON.stringify({ content: board }));
  });

  it("gera um link novo a cada compartilhamento, sem reaproveitar o anterior", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "um", url: "https://site/board/um" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "dois", url: "https://site/board/dois" }), {
          status: 201,
        }),
      );
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());
    await waitFor(() =>
      expect(result.current.state).toHaveProperty("url", "https://site/board/um"),
    );

    act(() => result.current.share());
    await waitFor(() =>
      expect(result.current.state).toHaveProperty("url", "https://site/board/dois"),
    );
  });

  it("passa por 'gerando' antes de ter o link", async () => {
    respondWith({ id: "abc", url: "https://site/board/abc" });
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());

    expect(result.current.state).toEqual({ status: "sharing" });
    await waitFor(() => expect(result.current.state.status).toBe("shared"));
  });

  it.each([
    ["backend fora do ar", () => respondWith({ error: "..." }, 500)],
    ["resposta sem url", () => respondWith({ id: "abc" })],
    ["resposta ilegível", () => respondWith("não é json")],
    [
      "rede fora",
      () => vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("failed to fetch")),
    ],
  ])("sinaliza falha sem perder o board: %s", async (_caso, arrange) => {
    arrange();
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());

    await waitFor(() => expect(result.current.state).toEqual({ status: "error" }));
  });

  it("permite tentar de novo depois de falhar", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "abc", url: "https://site/board/abc" }), {
          status: 201,
        }),
      );
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    act(() => result.current.share());
    await waitFor(() => expect(result.current.state.status).toBe("shared"));
  });

  it("fecha o link exibido quando pedem", async () => {
    respondWith({ id: "abc", url: "https://site/board/abc" });
    const { result } = renderHook(() => useShareBoard(() => board));

    act(() => result.current.share());
    await waitFor(() => expect(result.current.state.status).toBe("shared"));

    act(() => result.current.dismiss());

    expect(result.current.state).toEqual({ status: "idle" });
  });
});
