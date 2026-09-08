import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defined } from "@/test-utils/defined";
import { stubMatchMedia } from "@/test-utils/matchMedia";
import { NOTE_SIZE, SCHEMA_VERSION } from "@/lib/board/types";
import { MAX_SCALE, MIN_SCALE, scaleAsPercent } from "@/lib/canvas/coords";
import { Whiteboard } from "./Whiteboard";
import { UI } from "@/lib/i18n/ui";

/**
 * Testes de ponta a ponta do quadro, no nível em que o usuário age: duplo clique no fundo,
 * digitar, sair. É aqui que os critérios da #13 e da #14 param de ser contrato entre
 * componentes e viram comportamento observável.
 */
function duploCliqueNoFundo(x: number, y: number): void {
  fireEvent.doubleClick(screen.getByTestId("viewport-surface"), { clientX: x, clientY: y });
}

/** Segura espaço e arrasta: o gesto que desloca o quadro. */
function navegaOQuadro(dx: number, dy: number): void {
  const surface = screen.getByTestId("viewport-surface");

  fireEvent.keyDown(document, { key: " " });
  fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(surface, { pointerId: 1, clientX: dx, clientY: dy });
  fireEvent.pointerUp(surface, { pointerId: 1, clientX: dx, clientY: dy });
  fireEvent.keyUp(document, { key: " " });
}

/** Rola a roda sobre o quadro. O listener é nativo, então o evento também precisa ser. */
function rola(init: WheelEventInit): void {
  screen
    .getByTestId("viewport-surface")
    .dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init }));
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
    await user.click(screen.getByLabelText(UI.en.zoom.in));
    navegaOQuadro(70, -35);
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

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 700, clientY: 500 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 700, clientY: 500 });
  }

  /** Shift + arrastar no fundo, de um canto de tela ao outro. */
  function retanguloDeSelecao(de: [number, number], ate: [number, number]): void {
    const surface = screen.getByTestId("viewport-surface");

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
    cliqueNoFundo();

    // Os post-its têm 200 de lado, então o primeiro ocupa de 50 a 250 e o segundo, de 800 a
    // 1000. O retângulo só alcança o primeiro.
    retanguloDeSelecao([0, 0], [400, 400]);

    expect(selecionados()).toEqual([perto]);
  });

  it("o retângulo soma ao que já estava selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(150, 150);
    criaPostIt(900, 150);

    // O segundo continua selecionado desde que nasceu; o retângulo alcança só o primeiro.
    retanguloDeSelecao([0, 0], [400, 400]);

    // O Shift acrescenta à seleção no clique; abrir o retângulo com ele e substituir tudo
    // seria o mesmo modificador com dois significados.
    expect(selecionados()).toHaveLength(2);
  });

  it("encolher o retângulo desmarca quem ele deixou de tocar", () => {
    render(<Whiteboard />);
    criaPostIt(150, 150);
    criaPostIt(900, 150);
    const perto = postIt(0).dataset.noteId;
    cliqueNoFundo();

    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      button: 0,
      shiftKey: true,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 1100, clientY: 400 });
    expect(selecionados()).toHaveLength(2);

    // Recalcula a partir do que havia antes do gesto, e não do quadro anterior: sem isso o
    // retângulo só cresceria.
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 400, clientY: 400 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 400, clientY: 400 });

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

  it("navegar pelo quadro com espaço não limpa a seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);

    navegaOQuadro(120, 80);

    expect(selecionados()).toHaveLength(1);
  });

  it("navegar pela roda não limpa a seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);

    rola({ deltaY: 120 });

    expect(selecionados()).toHaveLength(1);
  });
});

describe("Whiteboard — arraste", () => {
  /** Cria um post-it e sai da edição, como no bloco de seleção. */
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  /** Arrasta um post-it pelo deslocamento pedido, em pixels de tela. */
  function arrastaPostIt(indice: number, dx: number, dy: number): void {
    const element = postIt(indice);
    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: dx, clientY: dy });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: dx, clientY: dy });
  }

  function posicao(indice: number): { x: number; y: number } {
    const element = postIt(indice);
    return {
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    };
  }

  it("move o post-it, e não o quadro", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const antes = posicao(0);
    const camadaAntes = screen.getByTestId("viewport-layer").style.transform;

    arrastaPostIt(0, 120, 80);

    expect(posicao(0)).toEqual({ x: antes.x + 120, y: antes.y + 80 });
    // O quadro ficou onde estava: o gesto começou no post-it, não no fundo.
    expect(screen.getByTestId("viewport-layer").style.transform).toBe(camadaAntes);
  });

  it("acompanha o cursor com precisão em qualquer zoom", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const antes = posicao(0);

    await user.click(screen.getByLabelText(UI.en.zoom.in));
    const escala = Number(
      screen.getByTestId("viewport-layer").style.transform.match(/scale\(([^)]+)\)/)?.[1],
    );
    arrastaPostIt(0, 100, 0);

    // Cem pixels de tela valem menos de cem unidades de canvas quando o quadro está
    // aproximado; sem dividir pela escala, o post-it andaria mais que o cursor.
    expect(escala).toBeGreaterThan(1);
    expect(posicao(0).x).toBe(antes.x + Math.round(100 / escala));
  });

  it("não grava nada enquanto o gesto acontece", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const antes = posicao(0);
    const element = postIt(0);

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 120, clientY: 80 });

    // Durante o arraste o post-it se move por transform; a posição só muda ao soltar.
    expect(posicao(0)).toEqual(antes);
    expect(postIt(0).style.transform).toBe("translate(120px, 80px)");
  });

  it("move junto os post-its selecionados", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);
    criaPostIt(700, 200);
    fireEvent.pointerDown(postIt(0), { button: 0 });
    fireEvent.pointerDown(postIt(1), { button: 0, shiftKey: true });
    const antesPrimeiro = posicao(0);
    const antesSegundo = posicao(1);

    arrastaPostIt(0, 60, 40);

    expect(posicao(0)).toEqual({ x: antesPrimeiro.x + 60, y: antesPrimeiro.y + 40 });
    expect(posicao(1)).toEqual({ x: antesSegundo.x + 60, y: antesSegundo.y + 40 });
  });

  it("arrastar não abre a edição de texto", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);

    arrastaPostIt(0, 150, 150);

    expect(screen.queryByTestId("post-it-editor")).toBeNull();
  });
});

describe("Whiteboard — redimensionamento", () => {
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  function alca(): HTMLElement {
    return screen.getByTestId("resize-handle");
  }

  function tamanho(): { w: number; h: number } {
    const element = postIt(0);
    return {
      w: Number.parseFloat(element.style.width),
      h: Number.parseFloat(element.style.height),
    };
  }

  function posicao(): { x: number; y: number } {
    const element = postIt(0);
    return {
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    };
  }

  /** Puxa a alça pelo deslocamento pedido, em pixels de tela. */
  function puxaAlca(dx: number, dy: number, solta = true): void {
    const handle = alca();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: dx, clientY: dy });
    if (solta) fireEvent.pointerUp(handle, { pointerId: 1, clientX: dx, clientY: dy });
  }

  it("mostra a alça no post-it selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    expect(alca().dataset.visible).toBe("true");
  });

  it("esconde a alça enquanto se escreve", () => {
    render(<Whiteboard />);
    duploCliqueNoFundo(400, 400);

    // Ali o post-it é um campo de texto, não uma caixa a ajustar.
    expect(screen.queryByTestId("resize-handle")).toBeNull();
  });

  it("altera largura e altura acompanhando o cursor", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = tamanho();

    puxaAlca(70, 30);

    expect(tamanho()).toEqual({ w: antes.w + 70, h: antes.h + 30 });
  });

  it("acompanha o cursor também com o quadro aproximado", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = tamanho();

    await user.click(screen.getByLabelText(UI.en.zoom.in));
    const escala = Number(
      screen.getByTestId("viewport-layer").style.transform.match(/scale\(([^)]+)\)/)?.[1],
    );
    puxaAlca(100, 0);

    expect(escala).toBeGreaterThan(1);
    expect(tamanho().w).toBe(antes.w + Math.round(100 / escala));
  });

  it("não grava nada enquanto a alça está sendo puxada", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = tamanho();

    puxaAlca(70, 30, false);
    expect(tamanho()).toEqual({ w: antes.w + 70, h: antes.h + 30 });

    // O que se vê já é o tamanho novo; o que está gravado só muda ao soltar. O teste do
    // hook cobre a store; aqui o que importa é que o gesto termine no mesmo lugar.
    fireEvent.pointerUp(alca(), { pointerId: 1, clientX: 70, clientY: 30 });
    expect(tamanho()).toEqual({ w: antes.w + 70, h: antes.h + 30 });
  });

  it("não deixa encolher além do mínimo", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    puxaAlca(-5000, -5000);

    expect(tamanho()).toEqual({ w: NOTE_SIZE.minWidth, h: NOTE_SIZE.minHeight });
  });

  it("não move o post-it ao redimensionar", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = posicao();

    puxaAlca(120, 90);

    expect(posicao()).toEqual(antes);
  });

  it("acompanha o cursor também com o quadro afastado", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = tamanho();

    await user.click(screen.getByLabelText(UI.en.zoom.out));
    const escala = Number(
      screen.getByTestId("viewport-layer").style.transform.match(/scale\(([^)]+)\)/)?.[1],
    );
    puxaAlca(100, 0);

    // Afastado, cada pixel de tela vale mais de um de canvas: o post-it cresce **mais** que
    // os cem pixels do cursor. É o lado da conversão em que o arredondamento é mais grosso.
    expect(escala).toBeLessThan(1);
    expect(tamanho().w).toBe(antes.w + Math.round(100 / escala));
  });

  it("duplo clique na alça não abre o editor", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    fireEvent.doubleClick(alca(), { button: 0 });

    // A alça é para ajustar o tamanho; abrir o editor ali cobriria justamente o que se
    // estava ajustando.
    expect(screen.queryByTestId("post-it-editor")).toBeNull();
  });

  it("puxar a alça não arrasta o post-it junto", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = posicao();

    puxaAlca(150, 150, false);

    expect(postIt(0).dataset.dragging).toBe("false");
    expect(posicao()).toEqual(antes);
  });
});

describe("Whiteboard — cor do post-it", () => {
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  /** Aperta e solta no fundo sem andar: o clique que limpa a seleção. */
  function cliqueNoFundoLimpando(): void {
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 900, clientY: 600 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 900, clientY: 600 });
  }

  function seletor(): HTMLElement | null {
    return screen.queryByTestId("color-picker");
  }

  /** A cor de fundo desenhada no n-ésimo post-it. */
  function corDe(indice: number): string {
    return postIt(indice).style.backgroundColor;
  }

  function escolheCor(nome: string): void {
    fireEvent.click(screen.getByRole("radio", { name: nome }));
  }

  it("não mostra o seletor sem seleção", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    cliqueNoFundoLimpando();

    expect(seletor()).toBeNull();
  });

  it("mostra o seletor para o post-it selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    expect(seletor()).not.toBeNull();
  });

  it("indica a cor atual do post-it", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    // O post-it nasce amarelo, que é o índice 0 da paleta.
    expect(
      screen.getByRole("radio", { name: UI.en.note.colors.yellow }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("escolher uma cor pinta o post-it na hora", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = corDe(0);

    escolheCor(UI.en.note.colors.green);

    expect(corDe(0)).not.toBe(antes);
    expect(corDe(0)).toBe("var(--color-note-green)");
  });

  it("a cor escolhida passa a ser a indicada", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    escolheCor(UI.en.note.colors.purple);

    expect(
      screen.getByRole("radio", { name: UI.en.note.colors.purple }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("pinta todos os post-its selecionados", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(700, 300);
    fireEvent.pointerDown(postIt(0), { button: 0, shiftKey: true });

    escolheCor(UI.en.note.colors.blue);

    expect(corDe(0)).toBe("var(--color-note-blue)");
    expect(corDe(1)).toBe("var(--color-note-blue)");
  });

  it("não indica cor quando os selecionados divergem", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    escolheCor(UI.en.note.colors.pink);
    criaPostIt(700, 300);
    fireEvent.pointerDown(postIt(0), { button: 0, shiftKey: true });

    // Um rosa e um amarelo: não há uma cor atual a marcar.
    const marcadas = screen
      .getAllByRole("radio")
      .filter((cor) => cor.getAttribute("aria-checked") === "true");
    expect(marcadas).toEqual([]);
  });

  it("clicar numa cor não desmarca o post-it", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    escolheCor(UI.en.note.colors.orange);

    // A barra vive fora da superfície do quadro justamente para o clique não chegar ao
    // fundo, que o leria como o pedido de limpar a seleção.
    expect(postIt(0).dataset.selected).toBe("true");
    expect(seletor()).not.toBeNull();
  });

  it("dá para chegar ao seletor e trocar a cor só pelo teclado", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);
    criaPostIt(400, 400);
    cliqueNoFundoLimpando();

    // Do zero: focar o post-it, marcá-lo, tabular até o seletor e andar até uma cor.
    postIt(0).focus();
    await user.keyboard("{Enter}");
    expect(postIt(0).dataset.selected).toBe("true");

    await user.tab();
    expect(screen.getAllByRole("radio").includes(document.activeElement as HTMLElement)).toBe(true);

    await user.keyboard("{ArrowRight}");

    // Sem isto o critério de acessibilidade seria decorativo: o seletor é navegável, mas
    // nada que dependa de seleção chegaria até ele.
    expect(corDe(0)).toBe("var(--color-note-pink)");
  });

  it("esconde o seletor enquanto se arrasta um post-it", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    fireEvent.pointerDown(postIt(0), { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(postIt(0), { pointerId: 1, clientX: 80, clientY: 80 });

    // A caixa da seleção usa as posições já gravadas: a barra ficaria parada enquanto o
    // post-it anda por baixo dela.
    expect(seletor()).toBeNull();

    fireEvent.pointerUp(postIt(0), { pointerId: 1, clientX: 80, clientY: 80 });
    expect(seletor()).not.toBeNull();
  });

  it("esconde o seletor enquanto se redimensiona", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const handle = screen.getByTestId("resize-handle");

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 60, clientY: 60 });

    expect(seletor()).toBeNull();

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 60, clientY: 60 });
    expect(seletor()).not.toBeNull();
  });
});

describe("Whiteboard — apagar com Delete", () => {
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  /** A tecla chega pelo documento, que é onde o atalho global ouve. */
  function apertaTecla(key: string): void {
    fireEvent.keyDown(document, { key });
  }

  function cliqueNoFundoLimpando(): void {
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 900, clientY: 600 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 900, clientY: 600 });
  }

  it("apaga o post-it selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    apertaTecla("Delete");

    expect(postIts()).toEqual([]);
  });

  it("apaga todos os selecionados", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(700, 300);
    fireEvent.pointerDown(postIt(0), { button: 0, shiftKey: true });

    apertaTecla("Delete");

    expect(postIts()).toEqual([]);
  });

  it("não apaga quem não está selecionado", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(700, 300);

    // Só o segundo ficou marcado ao ser criado.
    apertaTecla("Delete");

    expect(postIts()).toHaveLength(1);
  });

  it("sem nada selecionado não faz nada", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    cliqueNoFundoLimpando();

    apertaTecla("Delete");

    expect(postIts()).toHaveLength(1);
  });

  it("não apaga enquanto se escreve dentro do post-it", () => {
    render(<Whiteboard />);
    duploCliqueNoFundo(400, 400);

    // O erro clássico do atalho global: apagar o post-it em vez do caractere.
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Delete" });
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Backspace" });

    expect(postIts()).toHaveLength(1);
    expect(screen.getByTestId("post-it-editor")).toBeDefined();
  });

  // Ver DELETE_KEYS no hook: no Mac a tecla escrita "delete" emite Backspace.
  it("Backspace também apaga fora da edição", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    apertaTecla("Backspace");

    expect(postIts()).toEqual([]);
  });

  it("apaga com o post-it focado pelo teclado", async () => {
    const user = userEvent.setup();
    render(<Whiteboard />);
    criaPostIt(400, 400);
    cliqueNoFundoLimpando();

    postIt(0).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Delete}");

    // O post-it é tabulável desde a #17, mas não é campo de texto: a guarda olha o alvo, e
    // aqui ela deixa passar de propósito.
    expect(postIts()).toEqual([]);
  });

  it("o seletor de cor some junto com o post-it apagado", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    expect(screen.queryByTestId("color-picker")).not.toBeNull();

    apertaTecla("Delete");

    // A barra é ancorada na seleção, que ficou vazia.
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("não apaga com o board vazio", () => {
    render(<Whiteboard />);

    apertaTecla("Delete");

    expect(postIts()).toEqual([]);
  });
});

describe("Whiteboard — seleção por arrasto no fundo", () => {
  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  /** Arrasta um retângulo no fundo, de um canto ao outro, em pixels de tela. */
  function retangulo(
    de: [number, number],
    ate: [number, number],
    opcoes: { shiftKey?: boolean } = {},
  ): void {
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      button: 0,
      clientX: de[0],
      clientY: de[1],
      ...opcoes,
    });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
  }

  function selecionados(): (string | undefined)[] {
    return screen
      .queryAllByTestId("post-it")
      .filter((element) => element.dataset.selected === "true")
      .map((element) => element.dataset.noteId);
  }

  it("arrastar no fundo seleciona quem o retângulo toca", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(800, 300);
    const primeiro = postIt(0).dataset.noteId;

    retangulo([150, 150], [450, 450]);

    expect(selecionados()).toEqual([primeiro]);
  });

  it("o retângulo substitui a seleção anterior", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(800, 300);
    const primeiro = postIt(0).dataset.noteId;

    // O segundo ficou marcado ao ser criado; o retângulo pega só o primeiro.
    retangulo([150, 150], [450, 450]);

    expect(selecionados()).toEqual([primeiro]);
  });

  it("com Shift, o retângulo soma à seleção", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(800, 300);

    retangulo([150, 150], [450, 450], { shiftKey: true });

    expect(selecionados()).toHaveLength(2);
  });

  it("arrastar no vazio desmarca tudo", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);

    retangulo([900, 700], [1100, 900]);

    expect(selecionados()).toEqual([]);
  });

  it("com espaço, arrastar navega e não seleciona", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(800, 300);
    const antes = selecionados();

    fireEvent.keyDown(document, { key: " " });
    retangulo([150, 150], [450, 450]);
    fireEvent.keyUp(document, { key: " " });

    // O mesmo arrasto que selecionaria agora move o quadro, e a seleção não muda.
    expect(selecionados()).toEqual(antes);
  });

  it("shift+clique no fundo não desmarca", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      button: 0,
      shiftKey: true,
      clientX: 900,
      clientY: 700,
    });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 900, clientY: 700 });

    // O Shift acrescenta, no post-it e no retângulo; errar o alvo não pode desfazer a
    // seleção que o gesto ia ampliar.
    expect(selecionados()).toHaveLength(1);
  });

  it("clique sem Shift no fundo desmarca", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 900, clientY: 700 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 900, clientY: 700 });

    expect(selecionados()).toEqual([]);
  });

  it("um dedo navega, já que no toque não há espaço para segurar", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const surface = screen.getByTestId("viewport-surface");
    const antes = screen.getByTestId("viewport-layer").style.transform;

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      button: 0,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 160,
      clientY: 140,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 160,
      clientY: 140,
    });

    // O quadro andou, e a seleção ficou de pé: no toque, arrastar não desenha retângulo.
    expect(screen.getByTestId("viewport-layer").style.transform).not.toBe(antes);
    expect(selecionados()).toHaveLength(1);
  });

  it("com espaço, arrastar a partir de um post-it navega em vez de movê-lo", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    const posicaoAntes = postIt(0).style.left;
    const camadaAntes = screen.getByTestId("viewport-layer").style.transform;

    fireEvent.keyDown(document, { key: " " });
    // O gesto nasce **no post-it**, que para o pointerdown antes da superfície: só a captura
    // chega antes dele.
    fireEvent.pointerDown(postIt(0), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(screen.getByTestId("viewport-surface"), {
      pointerId: 1,
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(screen.getByTestId("viewport-surface"), { pointerId: 1 });
    fireEvent.keyUp(document, { key: " " });

    expect(screen.getByTestId("viewport-layer").style.transform).not.toBe(camadaAntes);
    expect(postIt(0).style.left).toBe(posicaoAntes);
  });

  it("o cursor conta qual gesto o arrasto vai virar", () => {
    render(<Whiteboard />);
    const surface = screen.getByTestId("viewport-surface");

    expect(surface.className).toContain("cursor-crosshair");

    fireEvent.keyDown(document, { key: " " });
    expect(surface.className).toContain("cursor-grab");
    expect(surface.dataset.spaceHeld).toBe("true");
  });
});

/** Simula um aparelho de toque (ou de ponteiro) para a consulta de mídia. */
function aparelhoDeToque(toque: boolean): void {
  stubMatchMedia(toque);
}

/** A escala mostrada pelos controles, em porcento. */
function escalaAtual(): string {
  return defined(
    screen.getByRole("button", { name: UI.en.zoom.reset }).textContent,
    "o percentual de zoom",
  );
}

/** Pinça dois dedos sobre o quadro, do afastamento inicial para o final. */
function pinca(de: number, para: number): void {
  const surface = screen.getByTestId("viewport-surface");

  fireEvent.pointerDown(surface, {
    pointerId: 1,
    pointerType: "touch",
    button: 0,
    clientX: 0,
    clientY: 0,
  });
  fireEvent.pointerDown(surface, {
    pointerId: 2,
    pointerType: "touch",
    button: 0,
    clientX: de,
    clientY: 0,
  });
  fireEvent.pointerMove(surface, { pointerId: 2, pointerType: "touch", clientX: para, clientY: 0 });
  fireEvent.pointerUp(surface, { pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0 });
  fireEvent.pointerUp(surface, { pointerId: 2, pointerType: "touch", clientX: para, clientY: 0 });
}

describe("Whiteboard — toque", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dá zoom com a pinça de dois dedos", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    expect(escalaAtual()).toBe("100%");

    pinca(100, 200);

    // Dedos ao dobro da distância: o quadro dobra de escala.
    expect(escalaAtual()).toBe("200%");
  });

  it("reduz quando os dedos se aproximam", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);

    pinca(200, 100);

    expect(escalaAtual()).toBe("50%");
  });

  it("respeita o limite máximo de escala", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);

    // Um afastamento absurdo não pode passar do teto que os botões respeitam.
    pinca(10, 10000);

    expect(escalaAtual()).toBe(`${scaleAsPercent(MAX_SCALE)}%`);
  });

  it("respeita o limite mínimo de escala", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);

    pinca(10000, 10);

    expect(escalaAtual()).toBe(`${scaleAsPercent(MIN_SCALE)}%`);
  });

  it("pinça mesmo quando um dedo encosta num post-it", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    duploCliqueNoFundo(150, 150);
    fireEvent.blur(screen.getByRole("textbox", { name: UI.en.note.text }));
    const surface = screen.getByTestId("viewport-surface");

    // Primeiro dedo sobre a nota, segundo no fundo: num quadro cheio é o caso comum, e sem
    // contar o dedo na fase de captura a pinça nunca começaria.
    fireEvent.pointerDown(postIt(0), {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 150,
      clientY: 150,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 250,
      clientY: 150,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 350,
      clientY: 150,
    });

    expect(escalaAtual()).toBe("200%");
  });

  it("não move o post-it que o primeiro dedo tinha pegado", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    duploCliqueNoFundo(150, 150);
    fireEvent.blur(screen.getByRole("textbox", { name: UI.en.note.text }));
    const surface = screen.getByTestId("viewport-surface");
    const antes = postIt(0).style.transform;

    fireEvent.pointerDown(postIt(0), {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 150,
      clientY: 150,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 250,
      clientY: 150,
    });
    fireEvent.pointerMove(postIt(0), {
      pointerId: 1,
      pointerType: "touch",
      clientX: 190,
      clientY: 190,
    });

    // O segundo dedo cancela o arraste da nota: sem isso ela andaria enquanto a pessoa acha
    // que só está dando zoom.
    expect(postIt(0).style.transform).toBe(antes);
  });

  it("ignora um terceiro dedo em vez de trocar a referência da pinça", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 0,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 3,
      pointerType: "touch",
      button: 0,
      clientX: 400,
      clientY: 0,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 0,
    });

    // O terceiro dedo não entra na conta; a escala segue a dos dois primeiros.
    expect(escalaAtual()).toBe("200%");
  });

  it("volta a navegar com um dedo quando o outro sai", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    const surface = screen.getByTestId("viewport-surface");
    const layer = screen.getByTestId("viewport-layer");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 0,
    });
    fireEvent.pointerUp(surface, { pointerId: 2, pointerType: "touch", clientX: 100, clientY: 0 });
    const antes = layer.style.transform;
    fireEvent.pointerMove(surface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 60,
      clientY: 40,
    });

    // O dedo que ficou retoma a navegação, sem salto: o quadro anda com ele.
    expect(layer.style.transform).not.toBe(antes);
  });

  it("solta a captura do dedo que sai da pinça", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    const surface = screen.getByTestId("viewport-surface");
    // O jsdom não implementa captura de ponteiro; o stub global responde sempre "não
    // capturado", e sem isto o teste passaria sem provar nada.
    vi.spyOn(surface, "hasPointerCapture").mockReturnValue(true);
    const release = vi.spyOn(surface, "releasePointerCapture");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 0,
    });
    fireEvent.pointerUp(surface, { pointerId: 2, pointerType: "touch", clientX: 100, clientY: 0 });

    // Na pinça os dedos são capturados sem um gesto correspondente; sem soltar aqui, a
    // captura ficaria pendurada no ponteiro que já saiu.
    expect(release).toHaveBeenCalledWith(2);
  });

  it("encerra a pinça quando o sistema cancela o gesto", () => {
    aparelhoDeToque(false);
    render(<Whiteboard />);
    const surface = screen.getByTestId("viewport-surface");

    fireEvent.pointerDown(surface, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(surface, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 0,
    });
    fireEvent.pointerCancel(surface, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerCancel(surface, { pointerId: 2, pointerType: "touch" });
    const depoisDoCancelamento = escalaAtual();
    // Dedos "fantasma": se o cancelamento não limpasse a contagem, este movimento ainda
    // seria lido como pinça.
    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 400,
      clientY: 0,
    });

    expect(escalaAtual()).toBe(depoisDoCancelamento);
  });

  it("esconde os controles de zoom em aparelho de toque", () => {
    aparelhoDeToque(true);

    render(<Whiteboard />);

    // A pinça faz o mesmo trabalho, e o painel disputaria o canto do polegar.
    expect(screen.queryByRole("button", { name: UI.en.zoom.in })).toBeNull();
    expect(screen.queryByRole("button", { name: UI.en.zoom.out })).toBeNull();
  });

  it("mantém os controles em aparelho com ponteiro", () => {
    aparelhoDeToque(false);

    render(<Whiteboard />);

    expect(screen.getByRole("button", { name: UI.en.zoom.in })).toBeDefined();
  });

  it("não esconde as ações do documento no toque", () => {
    aparelhoDeToque(true);

    render(<Whiteboard />);

    // Só o zoom sai: compartilhar e criar um novo quadro não têm gesto equivalente.
    expect(screen.getByRole("button", { name: UI.en.save.action })).toBeDefined();
    expect(screen.getByRole("button", { name: UI.en.newBoard.action })).toBeDefined();
  });
});

describe("Whiteboard — apresentação do quadro vazio", () => {
  afterEach(() => vi.unstubAllGlobals());

  function criaPostIt(x: number, y: number): void {
    duploCliqueNoFundo(x, y);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
  }

  function apresentacao(): HTMLElement | null {
    return screen.queryByTestId("onboarding");
  }

  it("recebe quem chega no quadro vazio", () => {
    stubMatchMedia(false);

    render(<Whiteboard />);

    expect(apresentacao()).not.toBeNull();
  });

  it("sai de cena assim que o primeiro post-it aparece", () => {
    stubMatchMedia(false);
    render(<Whiteboard />);

    duploCliqueNoFundo(300, 240);

    expect(apresentacao()).toBeNull();
  });

  /**
   * Quem apagou tudo já sabe criar um post-it — foi o que acabou de fazer. Trazer as
   * instruções de volta no meio de uma limpeza de quadro seria ensinar o já aprendido
   * justamente no momento em que a tela precisa estar livre.
   */
  it("não volta quando o quadro fica vazio de novo", () => {
    stubMatchMedia(false);
    render(<Whiteboard />);
    criaPostIt(400, 400);

    fireEvent.keyDown(document, { key: "Delete" });

    expect(postIts()).toEqual([]);
    expect(apresentacao()).toBeNull();
  });

  it("não aparece num board que já vem com post-its", () => {
    stubMatchMedia(false);

    render(
      <Whiteboard
        initialBoard={{
          version: SCHEMA_VERSION,
          notes: [
            {
              id: "a1b2c3",
              x: 10,
              y: 20,
              w: NOTE_SIZE.defaultWidth,
              h: NOTE_SIZE.defaultHeight,
              color: 0,
              text: "oi",
              z: 1,
            },
          ],
        }}
      />,
    );

    // A asserção do post-it é o que dá sentido à de cima: sem ela, um `initialBoard` que o
    // quadro ignorasse deixaria o teste passar pelo motivo errado.
    expect(postIts()).toHaveLength(1);
    expect(apresentacao()).toBeNull();
  });
});

describe("Whiteboard — atalhos de teclado", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // `restoreAllMocks` e não só `unstubAllGlobals`: um `spyOn(globalThis, "fetch")` do
    // caso anterior sobrevive, e o `spyOn` seguinte devolve **o mesmo** espião, com as
    // chamadas antigas ainda contadas. É a convenção do resto da suíte.
    vi.restoreAllMocks();
  });

  it("N cria um post-it já pronto para escrever", () => {
    stubMatchMedia(false);
    render(<Whiteboard />);

    fireEvent.keyDown(document, { key: "n" });

    expect(postIts()).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByTestId("post-it-editor"));
  });

  /**
   * Sem cursor não há ponto para obedecer. O centro da área visível é a única resposta que
   * não depende de onde o quadro foi arrastado — criar sempre na origem do canvas colocaria
   * o post-it fora da tela de quem já navegou para longe dela.
   */
  it("põe o post-it do teclado no centro do que está visível", () => {
    stubMatchMedia(false);
    // O jsdom não faz layout: sem medida, toda área do quadro tem 0×0 e o "centro" seria a
    // origem, indistinguível de criar sempre no mesmo lugar. A medida entra no protótipo
    // porque quem é medido aqui é a moldura interna, que não tem testid próprio.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 800, 600),
    );
    render(<Whiteboard />);

    fireEvent.keyDown(document, { key: "n" });

    const nota = postIt(0);
    expect(Number.parseFloat(nota.style.left) + Number.parseFloat(nota.style.width) / 2).toBe(400);
    expect(Number.parseFloat(nota.style.top) + Number.parseFloat(nota.style.height) / 2).toBe(300);
  });

  it("N também dispensa a apresentação do quadro vazio", () => {
    stubMatchMedia(false);
    render(<Whiteboard />);

    fireEvent.keyDown(document, { key: "n" });

    expect(screen.queryByTestId("onboarding")).toBeNull();
  });

  it("Ctrl+S salva o quadro pelo mesmo caminho do botão", async () => {
    stubMatchMedia(false);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ url: "https://site/board/abc" }));
    render(<Whiteboard />);

    fireEvent.keyDown(document, { key: "s", ctrlKey: true });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/boards",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByLabelText(UI.en.save.linkField)).toHaveProperty(
      "value",
      "https://site/board/abc",
    );
  });

  it("⌘+S salva mesmo com o cursor dentro de um post-it", () => {
    stubMatchMedia(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<Whiteboard />);
    duploCliqueNoFundo(300, 240);

    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "s", metaKey: true });

    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe("Whiteboard — navegar com a rodinha apertada", () => {
  /** Aperta o botão do meio e arrasta: o gesto de quem vem de editor de imagem ou de mapa. */
  function arrastaComARodinha(dx: number, dy: number): boolean {
    const surface = screen.getByTestId("viewport-surface");
    const down = createEvent.pointerDown(surface, {
      pointerId: 1,
      button: 1,
      clientX: 0,
      clientY: 0,
    });

    fireEvent(surface, down);
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: dx, clientY: dy });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: dx, clientY: dy });

    return down.defaultPrevented;
  }

  /** Onde o post-it está na tela, que é o que denuncia o deslocamento do quadro. */
  function posicaoDoPostIt(): { x: number; y: number } {
    return {
      x: Number.parseFloat(postIt(0).style.left),
      y: Number.parseFloat(postIt(0).style.top),
    };
  }

  it("desloca o quadro como segurar espaço", () => {
    render(<Whiteboard />);
    duploCliqueNoFundo(300, 240);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
    const antes = posicaoDoPostIt();

    arrastaComARodinha(80, 40);

    // O post-it não se move em coordenadas de canvas: quem andou foi o quadro inteiro.
    expect(posicaoDoPostIt()).toEqual(antes);
    expect(screen.getByTestId("viewport-layer").style.transform).toContain("translate(80px, 40px)");
  });

  /**
   * Sem isto, o Windows e o Linux entram no modo de rolagem automática — aquele ícone que
   * fica preso no meio da tela rolando a página sozinho enquanto se tenta navegar o quadro.
   */
  it("engole o evento para o navegador não entrar em rolagem automática", () => {
    render(<Whiteboard />);

    expect(arrastaComARodinha(10, 10)).toBe(true);
  });

  it("não seleciona: a rodinha navega, e quem seleciona é o botão principal", () => {
    render(<Whiteboard />);
    duploCliqueNoFundo(300, 240);
    fireEvent.keyDown(screen.getByTestId("post-it-editor"), { key: "Escape" });
    fireEvent.pointerDown(screen.getByTestId("viewport-surface"), {
      pointerId: 9,
      button: 0,
      clientX: 900,
      clientY: 700,
    });
    fireEvent.pointerUp(screen.getByTestId("viewport-surface"), { pointerId: 9 });

    arrastaComARodinha(-400, -300);

    expect(screen.queryByTestId("selection-box")).toBeNull();
  });
});
