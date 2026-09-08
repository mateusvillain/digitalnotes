import { render, screen, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedBoard } from "./SharedBoard";
import { loadBoard, saveBoard } from "@/lib/board/localStore";
import { SCHEMA_VERSION, type Board } from "@/lib/board/types";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const originalIndexedDB = globalThis.indexedDB;

/**
 * Fronteira de erro mínima.
 *
 * `notFound()` sinaliza lançando, e é a rota do Next que captura em produção. No teste,
 * sem alguém para capturar, o React derruba a árvore e o erro vaza como falha do processo.
 */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function boardWith(text: string): Board {
  return {
    version: SCHEMA_VERSION,
    notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text, z: 1 }],
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  notFound.mockClear();
});

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
  vi.restoreAllMocks();
});

describe("SharedBoard", () => {
  it("mostra o board do link depois de buscá-lo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: boardWith("veio do link") }), { status: 200 }),
    );

    render(<SharedBoard id="abcdefghijkl" />);

    expect(await screen.findByText("veio do link")).toBeDefined();
  });

  it("não mostra um quadro vazio antes de o board chegar", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<SharedBoard id="abcdefghijkl" />);

    // Enquanto carrega há um aviso, e não a superfície do quadro: montar o whiteboard
    // antes faria os post-its aparecerem num segundo salto.
    expect(screen.getByRole("status").textContent).toBe("Abrindo o whiteboard…");
    expect(screen.queryByRole("heading", { name: "digitalnotes" })).toBeNull();
  });

  it("aciona a fronteira de não encontrado quando o link não vale", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));

    // O `notFound()` do Next lança para acionar a rota de erro; o erro não é o assunto
    // deste teste, e sim a chamada.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Boundary>
        <SharedBoard id="abcdefghijkl" />
      </Boundary>,
    );

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("não deixa o board do link sobrescrever o autosave local", async () => {
    await saveBoard(boardWith("trabalho local"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: boardWith("veio do link") }), { status: 200 }),
    );

    render(<SharedBoard id="abcdefghijkl" />);
    await screen.findByText("veio do link");

    // O IndexedDB é a cópia de trabalho da rota raiz: abrir um link não mexe nele.
    await waitFor(async () => {
      expect((await loadBoard())?.notes[0]?.text).toBe("trabalho local");
    });
  });

  it("não escreve no backend ao abrir o link", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ content: boardWith("veio do link") }), { status: 200 }),
      );

    render(<SharedBoard id="abcdefghijkl" />);
    await screen.findByText("veio do link");

    // Abrir é sempre leitura: o registro remoto original nunca é tocado.
    for (const [, init] of fetchSpy.mock.calls) {
      expect((init as RequestInit | undefined)?.method ?? "GET").toBe("GET");
    }
  });
});
