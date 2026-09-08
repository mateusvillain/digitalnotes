import { act, renderHook, waitFor } from "@testing-library/react";
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

  it("trata 404 como board inexistente", async () => {
    respondWith({ error: "Board não encontrado." }, 404);

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));

    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));
  });

  it.each([
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
  ])("não afirma que o board não existe quando a falha não é 404: %s", async (_caso, arrange) => {
    arrange();

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));

    // Dizer "não existe" para um documento que pode muito bem existir seria mentira, e
    // ainda esconderia a única ação que resolve.
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("tenta de novo quando pedem, e chega ao board se o backend voltar", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: board }), { status: 200 }));

    const { result } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));
    await waitFor(() => expect(result.current.status).toBe("error"));

    const state = result.current;
    if (state.status !== "error") throw new Error("esperava o estado de falha");
    act(() => state.retry());

    await waitFor(() => expect(result.current).toEqual({ status: "ready", board }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("volta a carregar ao trocar de link, sem mostrar o board anterior", async () => {
    respondWith({ content: board });

    const { result, rerender } = renderHook(({ id }) => useHydrateFromBackend(id), {
      initialProps: { id: "abcdefghijkl" },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ id: "mnopqrstuvwx" });

    // Sem isto, o board do link anterior continuaria na tela sob a URL nova.
    expect(result.current).toEqual({ status: "loading" });
  });

  it("não escreve estado depois de desmontar", async () => {
    let respond: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() => useHydrateFromBackend("abcdefghijkl"));
    unmount();
    // A resposta chega depois do desmonte: aplicá-la avisaria o React de uma atualização
    // em componente que não existe mais.
    respond?.(new Response(JSON.stringify({ content: board }), { status: 200 }));
    await waitFor(() => expect(consoleError).not.toHaveBeenCalled());
  });
});
