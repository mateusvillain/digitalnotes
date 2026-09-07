import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Viewport } from "@/components/canvas/Viewport";
import { NOTE_COLORS, NOTE_MAX_TEXT_LENGTH, type Note } from "@/lib/board/types";
import { noteBackgroundColor } from "@/lib/theme/note-colors";
import { NOTE_TEXT_CLASS } from "./note-text";
import { PostIt } from "./PostIt";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "abc123",
    x: 40,
    y: 80,
    w: 200,
    h: 160,
    color: 0,
    text: "primeira linha",
    z: 3,
    ...overrides,
  };
}

describe("PostIt", () => {
  it("posiciona e dimensiona em coordenadas de canvas", () => {
    render(<PostIt note={note()} />);
    const element = screen.getByTestId("post-it");

    expect(element.style.left).toBe("40px");
    expect(element.style.top).toBe("80px");
    expect(element.style.width).toBe("200px");
    expect(element.style.height).toBe("160px");
  });

  it("empilha pelo z da note", () => {
    render(<PostIt note={note({ z: 7 })} />);

    expect(screen.getByTestId("post-it").style.zIndex).toBe("7");
  });

  it.each(NOTE_COLORS.map((_, index) => index as Note["color"]))(
    "usa o token de cor do índice %i, sem valor literal",
    (color) => {
      render(<PostIt note={note({ color })} />);

      expect(screen.getByTestId("post-it").style.backgroundColor).toBe(noteBackgroundColor(color));
    },
  );

  it("preserva as quebras de linha do texto", () => {
    render(<PostIt note={note({ text: "primeira\nsegunda" })} />);
    const element = screen.getByTestId("post-it");

    expect(element.textContent).toBe("primeira\nsegunda");
    expect(element.className).toContain("whitespace-pre-wrap");
  });

  it("mantém o texto inteiro no board mesmo quando não cabe na caixa", () => {
    const texto = "palavra ".repeat(NOTE_MAX_TEXT_LENGTH / 8).slice(0, NOTE_MAX_TEXT_LENGTH);

    render(<PostIt note={note({ text: texto, w: 80, h: 80 })} />);

    // O corte é visual: nada é truncado no dado, e o texto inteiro reaparece ao editar
    // (#14). O que jsdom consegue afirmar é isto; o recorte em si depende de layout real.
    expect(screen.getByTestId("post-it").textContent).toBe(texto);
  });

  it("declara o recorte e a quebra de palavra que impedem o vazamento", () => {
    render(<PostIt note={note({ text: "a".repeat(500) })} />);
    const element = screen.getByTestId("post-it");

    // Asserção de classe, não de layout: jsdom não calcula CSS. Sem quebra de palavra uma
    // palavra longa empurraria a caixa; sem recorte, escorreria sobre os vizinhos.
    expect(element.className).toContain("break-words");
    expect(element.className).toContain("overflow-hidden");
  });

  it("distingue visualmente o post-it selecionado", () => {
    const { rerender } = render(<PostIt note={note()} />);
    expect(screen.getByTestId("post-it").className).not.toContain("outline-selection");
    expect(screen.getByTestId("post-it").dataset.selected).toBe("false");

    rerender(<PostIt note={note()} selected />);
    expect(screen.getByTestId("post-it").className).toContain("outline-selection");
    expect(screen.getByTestId("post-it").dataset.selected).toBe("true");
  });

  it("expõe o id da note para as interações encontrarem o alvo", () => {
    render(<PostIt note={note({ id: "xyz789" })} />);

    expect(screen.getByTestId("post-it").dataset.noteId).toBe("xyz789");
  });

  it("não muda de estilo com o zoom: quem escala é a camada do viewport", () => {
    const { rerender } = render(
      <Viewport viewport={{ x: 0, y: 0, scale: 1 }} pan={vi.fn()} zoomBy={vi.fn()}>
        <PostIt note={note()} />
      </Viewport>,
    );
    const semZoom = screen.getByTestId("post-it").getAttribute("style");

    rerender(
      <Viewport viewport={{ x: 30, y: 10, scale: 2.5 }} pan={vi.fn()} zoomBy={vi.fn()}>
        <PostIt note={note()} />
      </Viewport>,
    );

    // O post-it segue descrito em coordenadas de canvas; o zoom se aplica uma vez só, na
    // camada, e vale para a caixa e para o texto junto.
    expect(screen.getByTestId("post-it").getAttribute("style")).toBe(semZoom);
    expect(screen.getByTestId("viewport-layer").style.transform).toBe(
      "translate(30px, 10px) scale(2.5)",
    );
  });

  it("dá um rótulo acessível ao post-it sem conteúdo visível", () => {
    const { rerender } = render(<PostIt note={note({ text: "" })} />);
    expect(screen.getByLabelText("Post-it vazio")).toBeDefined();

    // Texto só de espaços não nomeia nada: sem isto o post-it ficaria sem nome acessível.
    rerender(<PostIt note={note({ text: "   \n  " })} />);
    expect(screen.getByLabelText("Post-it vazio")).toBeDefined();
  });

  it("deixa o próprio texto nomear o post-it, sem duplicar o conteúdo no rótulo", () => {
    render(<PostIt note={note({ text: "comprar pão" })} />);
    const element = screen.getByTestId("post-it");

    expect(element.getAttribute("aria-label")).toBeNull();
    expect(element.getAttribute("role")).toBe("note");
  });
});

describe("PostIt em edição", () => {
  it("pede a edição ao receber duplo clique", async () => {
    const user = userEvent.setup();
    const onEditStart = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} onEditStart={onEditStart} />);

    await user.dblClick(screen.getByTestId("post-it"));

    expect(onEditStart).toHaveBeenCalledExactlyOnceWith("xyz789");
  });

  it("não deixa o duplo clique chegar ao canvas, que criaria outro post-it", async () => {
    const user = userEvent.setup();
    const noCanvas = vi.fn();
    render(
      <div onDoubleClick={noCanvas}>
        <PostIt note={note()} onEditStart={vi.fn()} />
      </div>,
    );

    await user.dblClick(screen.getByTestId("post-it"));

    expect(noCanvas).not.toHaveBeenCalled();
  });

  it("não pede edição de novo quando já está editando", async () => {
    const user = userEvent.setup();
    const onEditStart = vi.fn();
    render(<PostIt note={note()} editing onEditStart={onEditStart} />);

    await user.dblClick(screen.getByTestId("post-it"));

    expect(onEditStart).not.toHaveBeenCalled();
  });

  it("troca o texto pelo editor, sem desenhar os dois ao mesmo tempo", () => {
    const { rerender } = render(<PostIt note={note({ text: "comprar pão" })} />);
    expect(screen.queryByTestId("post-it-editor")).toBeNull();
    expect(screen.getByTestId("post-it").textContent).toBe("comprar pão");

    rerender(<PostIt note={note({ text: "comprar pão" })} editing />);
    const editor = screen.getByTestId("post-it-editor") as HTMLTextAreaElement;

    expect(editor.value).toBe("comprar pão");
    // O texto em leitura sai da caixa: mantê-lo desenharia uma segunda cópia atrás do
    // editor, visível pelo fundo transparente do textarea.
    const caixa = screen.getByTestId("post-it");
    expect([...caixa.childNodes]).toEqual([editor]);
  });

  it("mostra ao editar o texto inteiro que não cabia na caixa", () => {
    const texto = "palavra ".repeat(NOTE_MAX_TEXT_LENGTH / 8).slice(0, NOTE_MAX_TEXT_LENGTH);

    render(<PostIt note={note({ text: texto, w: 80, h: 80 })} editing />);

    expect((screen.getByTestId("post-it-editor") as HTMLTextAreaElement).value).toBe(texto);
  });

  it("alinha o texto em edição com o texto em leitura", () => {
    const { rerender } = render(<PostIt note={note()} />);
    const leitura = screen.getByTestId("post-it").className;

    rerender(<PostIt note={note()} editing />);
    const edicao = screen.getByTestId("post-it-editor").className;

    // As medidas vêm de uma constante só; o que este teste guarda é que os dois lados
    // continuam bebendo dela, porque medida divergente faz o texto "pular" ao editar.
    expect(leitura).toContain(NOTE_TEXT_CLASS);
    expect(edicao).toContain(NOTE_TEXT_CLASS);
  });

  it("devolve o texto final com o id da note ao terminar", async () => {
    const user = userEvent.setup();
    const onEditCommit = vi.fn();
    render(
      <PostIt note={note({ id: "xyz789", text: "antes" })} editing onEditCommit={onEditCommit} />,
    );

    await user.keyboard(" e depois{Escape}");

    expect(onEditCommit).toHaveBeenCalledExactlyOnceWith("xyz789", "antes e depois");
  });

  it("remonta o editor ao mudar o post-it em edição", () => {
    const { rerender } = render(<PostIt note={note({ id: "aaa111", text: "primeiro" })} editing />);
    expect((screen.getByTestId("post-it-editor") as HTMLTextAreaElement).value).toBe("primeiro");

    // O editor é não controlado: sem chave por note, o textarea seria reaproveitado e
    // continuaria mostrando o texto do post-it anterior.
    rerender(<PostIt note={note({ id: "bbb222", text: "segundo" })} editing />);

    expect((screen.getByTestId("post-it-editor") as HTMLTextAreaElement).value).toBe("segundo");
  });

  it("expõe o estado de edição para as interações vizinhas", () => {
    const { rerender } = render(<PostIt note={note()} />);
    expect(screen.getByTestId("post-it").dataset.editing).toBe("false");

    rerender(<PostIt note={note()} editing />);
    expect(screen.getByTestId("post-it").dataset.editing).toBe("true");
  });
});

describe("PostIt — seleção", () => {
  it("pede a seleção ao ser apertado, e não ao ser solto", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} onSelect={onSelect} />);

    // Arrastar (#15) começa no pointerdown: o post-it precisa já estar marcado quando o
    // movimento começa, senão arrasta-se algo que ainda não foi selecionado.
    fireEvent.pointerDown(screen.getByTestId("post-it"), { button: 0 });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("xyz789", false);
  });

  it("avisa que o shift estava apertado, para acrescentar em vez de trocar", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} onSelect={onSelect} />);

    fireEvent.pointerDown(screen.getByTestId("post-it"), { button: 0, shiftKey: true });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("xyz789", true);
  });

  it("não age em botão que não é o primário", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note()} onSelect={onSelect} />);

    fireEvent.pointerDown(screen.getByTestId("post-it"), { button: 2 });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("não interrompe quem está escrevendo", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note()} editing onSelect={onSelect} />);

    // Clicar dentro do texto posiciona o cursor; reselecionar tiraria o foco do editor.
    fireEvent.pointerDown(screen.getByTestId("post-it-editor"), { button: 0 });

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("PostIt — arraste", () => {
  /** Aperta, anda e (opcionalmente) solta sobre o post-it. */
  function arrasta(element: HTMLElement, ate: [number, number], solta = true): void {
    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
    if (solta) fireEvent.pointerUp(element, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
  }

  it("avisa o começo do arraste com o id do post-it pego", () => {
    const onDragStart = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} onDragStart={onDragStart} />);

    arrasta(screen.getByTestId("post-it"), [100, 50], false);

    expect(onDragStart).toHaveBeenCalledExactlyOnceWith("xyz789");
  });

  it("reporta o deslocamento em pixels de tela, deixando o zoom para quem o conhece", () => {
    const onDragMove = vi.fn();
    render(<PostIt note={note()} onDragMove={onDragMove} />);

    arrasta(screen.getByTestId("post-it"), [100, 50], false);

    expect(onDragMove).toHaveBeenLastCalledWith({ x: 100, y: 50 });
  });

  it("desenha o deslocamento por transform, sem mexer na posição da note", () => {
    render(<PostIt note={note({ x: 40, y: 80 })} offset={{ x: 30, y: -10 }} />);
    const element = screen.getByTestId("post-it");

    // Mover por transform deixa o browser compor a translação sem recalcular layout — é o
    // que mantém o gesto fluido com dezenas de post-its no quadro.
    expect(element.style.transform).toBe("translate(30px, -10px)");
    expect(element.style.left).toBe("40px");
    expect(element.style.top).toBe("80px");
    expect(element.dataset.dragging).toBe("true");
  });

  it("não carrega transform nenhuma fora do arraste", () => {
    render(<PostIt note={note()} />);
    const element = screen.getByTestId("post-it");

    expect(element.style.transform).toBe("");
    expect(element.dataset.dragging).toBe("false");
  });

  it("avisa o fim ao soltar", () => {
    const onDragEnd = vi.fn();
    render(<PostIt note={note()} onDragEnd={onDragEnd} />);

    arrasta(screen.getByTestId("post-it"), [100, 50]);

    expect(onDragEnd).toHaveBeenCalledOnce();
  });

  it("não arrasta quem está sendo escrito", () => {
    const onDragStart = vi.fn();
    render(<PostIt note={note()} editing onDragStart={onDragStart} />);

    arrasta(screen.getByTestId("post-it"), [100, 50], false);

    // Dentro do editor o ponteiro seleciona texto; arrastar a caixa junto seria o gesto
    // fazendo duas coisas.
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("um clique parado não vira arraste, nem grava posição", () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    render(<PostIt note={note()} onDragStart={onDragStart} onDragEnd={onDragEnd} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();
  });

  it("começar a arrastar não abre o modo de edição", () => {
    const onEditStart = vi.fn();
    render(<PostIt note={note()} onEditStart={onEditStart} />);

    arrasta(screen.getByTestId("post-it"), [150, 150]);

    expect(onEditStart).not.toHaveBeenCalled();
    expect(screen.queryByTestId("post-it-editor")).toBeNull();
  });
});

describe("PostIt — seleção adiada ao arrastar um grupo", () => {
  it("não desmarca os outros ao apertar num post-it já selecionado", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} selected onSelect={onSelect} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });

    // O gesto mais provável a partir daqui é arrastar o grupo inteiro; desmarcar antes do
    // movimento tornaria o arraste em grupo impossível.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("desmarca os outros se o gesto terminar sem arrastar", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} selected onSelect={onSelect} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 0, clientY: 0 });

    // Era um clique afinal, e clique desmarca os demais.
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("xyz789", false);
  });

  it("não desmarca ninguém quando o gesto virou arraste", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} selected onSelect={onSelect} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 100, clientY: 0 });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 100, clientY: 0 });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("seleciona na hora o post-it que ainda não estava marcado", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} onSelect={onSelect} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("xyz789", false);
  });
});

describe("PostIt — gestos que não deveriam mover nada", () => {
  it("shift sobre um post-it selecionado desmarca, e não arrasta", () => {
    const onSelect = vi.fn();
    const onDragStart = vi.fn();
    render(
      <PostIt
        note={note({ id: "xyz789" })}
        selected
        onSelect={onSelect}
        onDragStart={onDragStart}
      />,
    );
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, {
      pointerId: 1,
      button: 0,
      shiftKey: true,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 200, clientY: 0 });

    // O shift o tirou da seleção; seguir arrastando moveria justamente o que se acabou de
    // desmarcar.
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("xyz789", true);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("gesto cancelado não desmarca os outros depois", () => {
    const onSelect = vi.fn();
    render(<PostIt note={note({ id: "xyz789" })} selected onSelect={onSelect} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerCancel(element, { pointerId: 1 });

    // Um gesto interrompido pelo sistema não decidiu nada — nem que o clique aconteceu.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("grava a posição de onde o ponteiro foi solto, e não a do último movimento", () => {
    const onDragMove = vi.fn();
    render(<PostIt note={note()} onDragMove={onDragMove} />);
    const element = screen.getByTestId("post-it");

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 100, clientY: 0 });
    // Soltar pode carregar uma posição que nenhum pointermove chegou a reportar.
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 137, clientY: 12 });

    expect(onDragMove).toHaveBeenLastCalledWith({ x: 137, y: 12 });
  });

  it("não deixa o arraste pintar o texto pelo caminho", () => {
    render(<PostIt note={note({ text: "comprar pão" })} />);

    // Sem isto, arrastar um post-it com texto o percorre selecionando caractere por
    // caractere. O editor tem seu próprio campo, e lá o texto continua selecionável.
    expect(screen.getByTestId("post-it").className).toContain("select-none");
  });
});

describe("PostIt — teclado", () => {
  function postIt(): HTMLElement {
    return screen.getByTestId("post-it");
  }

  it("é alcançável pelo Tab", () => {
    render(<PostIt note={note()} />);

    expect(postIt().getAttribute("tabindex")).toBe("0");
  });

  it("sai da ordem de tabulação enquanto se escreve", () => {
    render(<PostIt note={note()} editing />);

    // Ali o ponto de parada é o editor; um segundo aqui faria o Tab sair do texto para a
    // caixa em volta.
    expect(postIt().getAttribute("tabindex")).toBe("-1");
  });

  it("o Enter seleciona", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PostIt note={note()} onSelect={onSelect} />);

    postIt().focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("abc123", false);
  });

  it("o espaço seleciona", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PostIt note={note()} onSelect={onSelect} />);

    postIt().focus();
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledWith("abc123", false);
  });

  it("shift+Enter acrescenta à seleção", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PostIt note={note()} onSelect={onSelect} />);

    postIt().focus();
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSelect).toHaveBeenCalledWith("abc123", true);
  });

  it("o Enter num post-it já marcado abre o texto", async () => {
    const user = userEvent.setup();
    const onEditStart = vi.fn();
    render(<PostIt note={note()} selected onEditStart={onEditStart} />);

    postIt().focus();
    await user.keyboard("{Enter}");

    // O mesmo que o duplo clique faz com o ponteiro.
    expect(onEditStart).toHaveBeenCalledWith("abc123");
  });

  it("não reage ao teclado enquanto se escreve", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onEditStart = vi.fn();
    render(<PostIt note={note()} editing onSelect={onSelect} onEditStart={onEditStart} />);

    await user.keyboard("{Enter}");

    // Dentro do editor, Enter é quebra de linha.
    expect(onSelect).not.toHaveBeenCalled();
    expect(onEditStart).not.toHaveBeenCalled();
  });
});
