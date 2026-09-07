import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { defined } from "@/test-utils/defined";
import { NOTE_SIZE } from "@/lib/board/types";
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

  fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(surface, { pointerId: 1, clientX: dx, clientY: dy });
  fireEvent.pointerUp(surface, { pointerId: 1, clientX: dx, clientY: dy });
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

  it("navegar pelo quadro não limpa a seleção", () => {
    render(<Whiteboard />);
    criaPostIt(200, 200);

    arrastaOFundo(120, 80);

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

    await user.click(screen.getByLabelText("Aumentar zoom"));
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

    await user.click(screen.getByLabelText("Aumentar zoom"));
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

    await user.click(screen.getByLabelText("Diminuir zoom"));
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
    expect(screen.getByRole("radio", { name: "Amarelo" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("escolher uma cor pinta o post-it na hora", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);
    const antes = corDe(0);

    escolheCor("Verde");

    expect(corDe(0)).not.toBe(antes);
    expect(corDe(0)).toBe("var(--color-note-green)");
  });

  it("a cor escolhida passa a ser a indicada", () => {
    render(<Whiteboard />);
    criaPostIt(400, 400);

    escolheCor("Roxo");

    expect(screen.getByRole("radio", { name: "Roxo" }).getAttribute("aria-checked")).toBe("true");
  });

  it("pinta todos os post-its selecionados", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    criaPostIt(700, 300);
    fireEvent.pointerDown(postIt(0), { button: 0, shiftKey: true });

    escolheCor("Azul");

    expect(corDe(0)).toBe("var(--color-note-blue)");
    expect(corDe(1)).toBe("var(--color-note-blue)");
  });

  it("não indica cor quando os selecionados divergem", () => {
    render(<Whiteboard />);
    criaPostIt(300, 300);
    escolheCor("Rosa");
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

    escolheCor("Laranja");

    // A barra vive fora da superfície do quadro justamente para o clique não chegar ao
    // fundo, que o leria como o pedido de limpar a seleção.
    expect(postIt(0).dataset.selected).toBe("true");
    expect(seletor()).not.toBeNull();
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
