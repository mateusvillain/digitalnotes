import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

/** Dispara uma tecla no documento, opcionalmente a partir de um alvo. */
function tecla(
  key: string,
  target: HTMLElement = document.body,
  modifiers: KeyboardEventInit = {},
): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Completa as opções do hook com espiões vazios.
 *
 * Cada caso declara só o tratador que está exercitando; os outros existem porque o hook os
 * exige, e deixá-los explícitos em todo teste esconderia qual deles é o assunto ali.
 */
function opcoes(overrides: Partial<Parameters<typeof useKeyboardShortcuts>[0]>) {
  return {
    onDelete: vi.fn(),
    onPlaceNote: vi.fn(),
    onSave: vi.fn(),
    onSelectAll: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onTogglePencil: vi.fn(),
    onSelectTool: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

/** Cria um elemento anexado ao documento, para o evento ter caminho de propagação. */
function elemento(tag: string, editable = false): HTMLElement {
  const node = document.createElement(tag);
  if (editable) node.setAttribute("contenteditable", "true");
  document.body.append(node);
  return node;
}

describe("useKeyboardShortcuts", () => {
  it("Delete chama o tratador", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));

    tecla("Delete");

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("Backspace também chama", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));

    tecla("Backspace");

    // Ver DELETE_KEYS: no Mac a tecla escrita "delete" emite Backspace.
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("ignora outras teclas", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));

    tecla("a");
    tecla("Enter");
    tecla("Escape");

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não dispara com o foco num campo de texto", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));

    tecla("Delete", elemento("textarea"));
    tecla("Backspace", elemento("input"));

    // Digitando, Delete apaga caractere — não post-it.
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não dispara num contenteditable", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));
    const node = elemento("div", true);
    Object.defineProperty(node, "isContentEditable", { value: true });

    tecla("Delete", node);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("impede o comportamento padrão da tecla", () => {
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete: vi.fn() })));

    // Backspace fora de um campo navega para trás em navegadores antigos.
    expect(tecla("Backspace")).toBe(true);
  });

  it("não impede o padrão dentro de um campo", () => {
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete: vi.fn() })));

    expect(tecla("Backspace", elemento("input"))).toBe(false);
  });

  it("ouve em captura, à frente de quem para o evento na bolha", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));
    const node = elemento("div");
    node.addEventListener("keydown", (event) => event.stopPropagation());

    tecla("Delete", node);

    // O editor do post-it para o evento na bolha; o atalho não pode depender disso, ou cada
    // campo futuro teria de lembrar de fazer o mesmo.
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("solta o ouvinte ao desmontar", () => {
    const onDelete = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts(opcoes({ onDelete })));

    unmount();
    tecla("Delete");

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não registra um ouvinte novo a cada render", () => {
    const add = vi.spyOn(document, "addEventListener");
    const { rerender } = renderHook(({ onDelete }) => useKeyboardShortcuts(opcoes({ onDelete })), {
      initialProps: { onDelete: vi.fn() },
    });
    const depoisDoPrimeiro = add.mock.calls.length;

    // Tratador novo a cada render é o caso comum: um callback inline de quem chama.
    rerender({ onDelete: vi.fn() });
    rerender({ onDelete: vi.fn() });

    expect(add.mock.calls.length).toBe(depoisDoPrimeiro);
    add.mockRestore();
  });

  it("chama sempre o tratador mais recente", () => {
    const antigo = vi.fn();
    const novo = vi.fn();
    const { rerender } = renderHook(({ onDelete }) => useKeyboardShortcuts(opcoes({ onDelete })), {
      initialProps: { onDelete: antigo },
    });

    rerender({ onDelete: novo });
    tecla("Delete");

    expect(antigo).not.toHaveBeenCalled();
    expect(novo).toHaveBeenCalledOnce();
  });
});

describe("useKeyboardShortcuts — criar post-it com N", () => {
  it("N cria um post-it", () => {
    const onPlaceNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onPlaceNote })));

    tecla("n");

    expect(onPlaceNote).toHaveBeenCalledOnce();
  });

  it("aceita a maiúscula: quem segurou Shift sem querer não fica sem o atalho", () => {
    const onPlaceNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onPlaceNote })));

    tecla("N", document.body, { shiftKey: true });

    expect(onPlaceNote).toHaveBeenCalledOnce();
  });

  it("não cria enquanto se digita num post-it", () => {
    const onPlaceNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onPlaceNote })));

    tecla("n", elemento("textarea"));

    expect(onPlaceNote).not.toHaveBeenCalled();
  });

  /**
   * `Ctrl+N` e `⌘+N` abrem uma janela nova do navegador. Roubar a tecla deixaria quem
   * quisesse a janela sem ela — e ninguém que aperta esse par está pedindo um post-it.
   */
  it("não rouba o Ctrl+N nem o ⌘+N do navegador", () => {
    const onPlaceNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onPlaceNote })));

    expect(tecla("n", document.body, { ctrlKey: true })).toBe(false);
    expect(tecla("n", document.body, { metaKey: true })).toBe(false);
    expect(onPlaceNote).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts — salvar com Ctrl/⌘+S", () => {
  it("salva com Ctrl+S e com ⌘+S", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSave })));

    tecla("s", document.body, { ctrlKey: true });
    tecla("s", document.body, { metaKey: true });

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  /**
   * O ponto do atalho: sem isto o navegador abre a caixa de "salvar página" por cima, e o
   * quadro seria salvo atrás de um diálogo de download que ninguém pediu.
   */
  it("engole a tecla para o navegador não abrir a caixa de salvar página", () => {
    renderHook(() => useKeyboardShortcuts(opcoes({})));

    expect(tecla("s", document.body, { metaKey: true })).toBe(true);
  });

  /**
   * O único atalho que atravessa um campo de texto. Quem aperta ⌘+S no meio de uma frase
   * está salvando o quadro — e é escrevendo que se tem mais a perder.
   */
  it("salva mesmo com o cursor dentro de um post-it", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSave })));

    tecla("s", elemento("textarea"), { metaKey: true });

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("P alterna o modo lápis", () => {
    const onTogglePencil = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onTogglePencil })));

    tecla("p");
    tecla("P");

    // Duas vezes, e não uma que liga e outra que desliga: quem sabe em que estado o modo
    // está é o quadro. O atalho só avisa que a tecla foi apertada.
    expect(onTogglePencil).toHaveBeenCalledTimes(2);
  });

  it("P não alterna com o cursor dentro de um post-it", () => {
    const onTogglePencil = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onTogglePencil })));

    tecla("p", elemento("textarea"));
    tecla("p", elemento("input"));

    expect(onTogglePencil).not.toHaveBeenCalled();
  });

  it("P com modificador segurado pertence ao navegador", () => {
    const onTogglePencil = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onTogglePencil })));

    tecla("p", document.body, { ctrlKey: true });
    tecla("p", document.body, { metaKey: true });
    tecla("p", document.body, { altKey: true });

    expect(onTogglePencil).not.toHaveBeenCalled();
  });

  it("V pede a ferramenta de seleção", () => {
    const onSelectTool = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectTool })));

    tecla("v");
    tecla("V");

    // Duas vezes, como o `P`: quem sabe qual ferramenta está ativa é o quadro. O atalho só
    // avisa que a tecla foi apertada — e lá, escolher o cursor duas vezes é escolhê-lo.
    expect(onSelectTool).toHaveBeenCalledTimes(2);
  });

  it("V não dispara com o cursor dentro de um post-it", () => {
    const onSelectTool = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectTool })));

    tecla("v", elemento("textarea"));
    tecla("v", elemento("input"));

    expect(onSelectTool).not.toHaveBeenCalled();
  });

  it("V com modificador segurado pertence ao navegador", () => {
    const onSelectTool = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectTool })));

    // `Ctrl+V` é colar, e é o modificador mais importante a não roubar desta tecla.
    tecla("v", document.body, { ctrlKey: true });
    tecla("v", document.body, { metaKey: true });
    tecla("v", document.body, { altKey: true });

    expect(onSelectTool).not.toHaveBeenCalled();
  });

  it("Ctrl+A e ⌘+A marcam tudo", () => {
    const onSelectAll = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectAll })));

    tecla("a", document.body, { ctrlKey: true });
    tecla("A", document.body, { metaKey: true });

    expect(onSelectAll).toHaveBeenCalledTimes(2);
  });

  /**
   * Dentro de um post-it `Ctrl+A` seleciona o texto, e é a única forma que quem escreve tem
   * de marcar o que escreveu. É a mesma guarda do desfazer, e o oposto do `Ctrl+S`.
   */
  it("Ctrl+A dentro de um campo de texto pertence ao texto", () => {
    const onSelectAll = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectAll })));

    tecla("a", elemento("textarea"), { ctrlKey: true });
    tecla("a", elemento("input"), { metaKey: true });

    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it("A sem modificador não marca nada", () => {
    const onSelectAll = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectAll })));

    tecla("a");

    expect(onSelectAll).not.toHaveBeenCalled();
  });

  /** `Ctrl+Shift+A` é atalho de outras coisas por aí; o quadro não o reivindica. */
  it("Ctrl+Shift+A não marca tudo", () => {
    const onSelectAll = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSelectAll })));

    tecla("a", document.body, { ctrlKey: true, shiftKey: true });

    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it("engole a tecla, para o navegador não selecionar a página inteira", () => {
    renderHook(() => useKeyboardShortcuts(opcoes({})));

    const event = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("Ctrl+Z e ⌘+Z desfazem", () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onUndo })));

    tecla("z", document.body, { ctrlKey: true });
    tecla("z", document.body, { metaKey: true });

    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it("Ctrl+Shift+Z e Ctrl+Y refazem", () => {
    const onRedo = vi.fn();
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onRedo, onUndo })));

    tecla("z", document.body, { ctrlKey: true, shiftKey: true });
    tecla("y", document.body, { ctrlKey: true });

    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(onUndo).not.toHaveBeenCalled();
  });

  /**
   * Ao contrário do `Ctrl+S`, que vale mesmo escrevendo: `Ctrl+Z` dentro de um post-it é o
   * desfazer do próprio texto, e roubá-lo tiraria de quem digita a única forma de voltar
   * atrás no que escreveu.
   */
  it("Ctrl+Z dentro de um campo de texto pertence ao texto", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onUndo, onRedo })));

    tecla("z", elemento("textarea"), { ctrlKey: true });
    tecla("z", elemento("input"), { ctrlKey: true, shiftKey: true });

    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("Z sem modificador não desfaz nada", () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onUndo })));

    tecla("z");

    expect(onUndo).not.toHaveBeenCalled();
  });

  it("Esc pede para sair do modo em curso", () => {
    const onCancel = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCancel })));

    tecla("Escape");

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Esc não é engolido: fora do quadro ele ainda é a tecla de sair do navegador", () => {
    renderHook(() => useKeyboardShortcuts(opcoes({})));

    expect(tecla("Escape")).toBe(false);
  });

  it("Esc dentro de um post-it é de quem está escrevendo", () => {
    const onCancel = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCancel })));

    tecla("Escape", elemento("textarea"));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("o S sozinho não salva nem apaga nada", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSave })));

    tecla("s");

    expect(onSave).not.toHaveBeenCalled();
  });
});
