import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

/** Arrasta o fundo, que é como se desloca o quadro. */
function arrastaOFundo(dx: number, dy: number): void {
  const surface = screen.getByTestId("viewport-surface");
  // O jsdom não implementa a API de captura de ponteiro.
  surface.setPointerCapture = vi.fn();
  surface.releasePointerCapture = vi.fn();
  surface.hasPointerCapture = vi.fn(() => true);

  fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(surface, { pointerId: 1, clientX: dx, clientY: dy });
  fireEvent.pointerUp(surface, { pointerId: 1 });
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

  it("nasce sob o cursor mesmo com o quadro afastado e deslocado", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);

    // Zoom por botão, que ancora no centro da área — e no jsdom a área mede zero, então o
    // resultado é um viewport com escala diferente de 1. O que este teste guarda é que a
    // conversão desfaz a transformação seja ela qual for.
    await user.click(screen.getByLabelText("Aumentar zoom"));
    arrastaOFundo(70, -35);
    duploCliqueNoFundo(320, 260);

    const centroX =
      Number.parseFloat(postIt(0).style.left) + Number.parseFloat(postIt(0).style.width) / 2;
    const centroY =
      Number.parseFloat(postIt(0).style.top) + Number.parseFloat(postIt(0).style.height) / 2;
    const camada = screen.getByTestId("viewport-layer");
    const transform = camada.style.transform;
    const escala = Number(transform.match(/scale\(([^)]+)\)/)?.[1]);
    const [deslocX, deslocY] = (transform.match(/translate\(([^)]+)\)/)?.[1] ?? "")
      .split(",")
      .map(Number.parseFloat);

    // O post-it é descrito em coordenadas de canvas: onde ele cai na tela é o centro dele
    // vezes a escala, mais o deslocamento — a mesma transformação da camada. Tem que dar o
    // ponto onde o cursor estava.
    expect(escala).not.toBe(1);
    expect(deslocX).toBe(70);
    expect(deslocY).toBe(-35);
    expect(centroX * escala + (deslocX ?? 0)).toBeCloseTo(320);
    expect(centroY * escala + (deslocY ?? 0)).toBeCloseTo(260);
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

describe("Whiteboard — seleção", () => {
  /**
   * Cria um post-it e sai da edição.
   *
   * O post-it novo nasce escrevendo, e no browser apertar o ponteiro em outro lugar tira o
   * foco do editor sozinho. O jsdom não faz isso por conta própria, então o teste sai da
   * edição de forma explícita — como o usuário sai, pelo Escape.
   */
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    // O Escape tira o foco, e é a perda de foco que encerra a edição.
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  /** Aperta e solta no fundo sem andar: o clique que limpa a seleção. */
  function cliqueNoFundo(): void {
    const surface = screen.getByTestId("viewport-surface");
    surface.setPointerCapture = vi.fn();
    surface.releasePointerCapture = vi.fn();
    surface.hasPointerCapture = vi.fn(() => true);

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 700, clientY: 500 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 700, clientY: 500 });
  }

  /** Shift + arrastar no fundo, de um canto de tela ao outro. */
  function retanguloDeSelecao(de: [number, number], ate: [number, number]): void {
    const surface = screen.getByTestId("viewport-surface");
    surface.setPointerCapture = vi.fn();
    surface.releasePointerCapture = vi.fn();
    surface.hasPointerCapture = vi.fn(() => true);

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      button: 0,
      shiftKey: true,
      clientX: de[0],
      clientY: de[1],
    });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
    fireEvent.pointerUp(surface, { pointerId: 1 });
  }

  function selecionados(): (string | undefined)[] {
    return postIts()
      .filter((element) => element.dataset.selected === "true")
      .map((element) => element.dataset.noteId);
  }

  it("deixa selecionado o post-it que acabou de nascer", () => {
    render(<Whiteboard />);

    duploCliqueNoFundo(200, 200);

    expect(selecionados()).toEqual([postIt(0).dataset.noteId]);
  });

  it("clicar num post-it o seleciona e desmarca os demais", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);
    criaPostIt(700, 200);

    fireEvent.pointerDown(postIt(0), { button: 0 });

    expect(selecionados()).toEqual([postIt(0).dataset.noteId]);
  });

  it("shift-clique acrescenta o segundo post-it à seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);
    criaPostIt(700, 200);

    fireEvent.pointerDown(postIt(0), { button: 0 });
    fireEvent.pointerDown(postIt(1), { button: 0, shiftKey: true });

    expect(selecionados()).toHaveLength(2);
  });

  it("clicar no fundo vazio limpa a seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);

    cliqueNoFundo();

    expect(selecionados()).toEqual([]);
  });

  it("o retângulo seleciona os post-its que ele toca, e só", () => {
    render(<Whiteboard />);
    criaPostIt(150, 150);
    criaPostIt(900, 150);
    const perto = postIt(0).dataset.noteId;

    // Os post-its têm 200 de lado, então o primeiro ocupa de 50 a 250 e o segundo, de 800 a
    // 1000. O retângulo só alcança o primeiro.
    retanguloDeSelecao([0, 0], [400, 400]);

    expect(selecionados()).toEqual([perto]);
  });

  it("traz para a frente o post-it selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);
    criaPostIt(700, 200);
    expect(Number(postIt(1).style.zIndex)).toBeGreaterThan(Number(postIt(0).style.zIndex));

    fireEvent.pointerDown(postIt(0), { button: 0 });

    // O post-it clicado vai para a frente dos demais — critério de conclusão da Epic #2.
    expect(Number(postIt(0).style.zIndex)).toBeGreaterThan(Number(postIt(1).style.zIndex));
  });

  it("navegar pelo quadro não limpa a seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);

    arrastaOFundo(120, 80);

    expect(selecionados()).toHaveLength(1);
  });
});
