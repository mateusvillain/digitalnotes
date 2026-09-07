import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { defined } from "@/test-utils/defined";
import { Whiteboard } from "./Whiteboard";

/**
 * Testes de ponta a ponta do quadro, no nível em que o usuário age: duplo clique no fundo,
 * digitar, sair. É aqui que os critérios da #13 e da #14 param de ser contrato entre
 * componentes e viram comportamento observável.
 */
function duploCliqueNoFundo(x: number, y: number): void {
  fireEvent.doubleClick(screen.getByTestId("viewport-surface"), { clientX: x, clientY: y });
}

function postIts(): HTMLElement[] {
  return screen.queryAllByTestId("post-it");
}

/** O n-ésimo post-it desenhado, falhando o teste se ele não existir. */
function postIt(indice: number): HTMLElement {
  return defined(postIts()[indice], `o post-it de índice ${indice}`);
}

describe("Whiteboard", () => {
  it("começa com o quadro vazio", () => {
    render(<Whiteboard />);

    expect(postIts()).toEqual([]);
  });

  it("cria um post-it no ponto do duplo clique, já pronto para escrever", () => {
    render(<Whiteboard />);

    duploCliqueNoFundo(300, 240);

    expect(postIts()).toHaveLength(1);
    const editor = screen.getByTestId("post-it-editor");
    expect(document.activeElement).toBe(editor);
  });

  it("centra o post-it novo no cursor", () => {
    render(<Whiteboard />);

    duploCliqueNoFundo(300, 240);

    expect(
      Number.parseFloat(postIt(0).style.left) + Number.parseFloat(postIt(0).style.width) / 2,
    ).toBe(300);
    expect(
      Number.parseFloat(postIt(0).style.top) + Number.parseFloat(postIt(0).style.height) / 2,
    ).toBe(240);
  });

  it("guarda o texto escrito ao sair da edição", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);

    duploCliqueNoFundo(200, 200);
    await user.keyboard("comprar pão{Escape}");

    // O texto sobreviveu ao fim da edição: está no board, desenhado em modo leitura.
    expect(screen.queryByTestId("post-it-editor")).toBeNull();
    expect(postIt(0).textContent).toBe("comprar pão");
  });

  it("reabre para edição com duplo clique, sem criar outro post-it", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);

    duploCliqueNoFundo(200, 200);
    await user.keyboard("comprar pão{Escape}");
    await user.dblClick(postIt(0));

    expect(postIts()).toHaveLength(1);
    expect((screen.getByTestId("post-it-editor") as HTMLTextAreaElement).value).toBe("comprar pão");
  });

  it("empilha cada post-it novo na frente dos anteriores", () => {
    render(<Whiteboard />);

    duploCliqueNoFundo(100, 100);
    duploCliqueNoFundo(400, 300);

    expect(Number(postIt(1).style.zIndex)).toBeGreaterThan(Number(postIt(0).style.zIndex));
  });

  it("passa a edição de um post-it para o outro sem perder o texto do anterior", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);

    duploCliqueNoFundo(100, 100);
    await user.keyboard("primeiro{Escape}");
    duploCliqueNoFundo(500, 100);
    await user.keyboard("segundo");
    await user.dblClick(postIt(0));

    expect(postIt(1).textContent).toBe("segundo");
    expect((screen.getByTestId("post-it-editor") as HTMLTextAreaElement).value).toBe("primeiro");
  });
});
