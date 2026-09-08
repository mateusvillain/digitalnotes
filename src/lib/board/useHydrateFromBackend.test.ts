import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "./types";
import { useHydrateFromBackend } from "./useHydrateFromBackend";

const board = {
  version: SCHEMA_VERSION,
  notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text: "compartilhada", z: 1 }],
};

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHydrateFromBackend", () => {
  it("começa carregando, sem decidir nada antes da resposta", () => {
    respondWith({ content: board });

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));

    expect(result.current).toEqual({ status: "loading" });
  });

  it("devolve o board do backend quando o link é válido", async () => {
    const fetchSpy = respondWith({ content: board });

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));

    await waitFor(() => expect(result.current).toEqual({ status: "ready", board }));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/boards/abcdefghijkl",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("escapa o identificador antes de montar a URL", async () => {
    const fetchSpy = respondWith({ content: board });

    renderHook(() => useHydrateFromBackend("id/../outro"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/boards/id%2F..%2Foutro", expect.anything());
    });
  });

  it.each([
    ["404 do backend", () => respondWith({ error: "Board não encontrado." }, 404)],
    ["500 do backend", () => respondWith({ error: "Não foi possível buscar o board." }, 500)],
    ["resposta que não é JSON", () => respondWith("não é json")],
    ["resposta sem content", () => respondWith({})],
    ["content que não passa no contrato", () => respondWith({ content: { notes: "x" } })],
    [
      "versão de schema futura",
      () => respondWith({ content: { ...board, version: SCHEMA_VERSION + 1 } }),
    ],
    [
      "rede fora",
      () => vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("failed to fetch")),
    ],
  ])("termina em not-found: %s", async (_caso, arrange) => {
    arrange();

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));

    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));
  });

  it("não aplica a resposta de um id que não é mais o atual", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ content: board }), { status: 200 }));

    const { unmount } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));
    unmount();

    // O cleanup aborta a busca em andamento, em vez de deixá-la escrever num estado que
    // ninguém mais mostra.
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect((init as RequestInit | undefined)?.signal?.aborted).toBe(true);
  });
});
