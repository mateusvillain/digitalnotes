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
  return { onDelete: vi.fn(), onCreateNote: vi.fn(), onSave: vi.fn(), ...overrides };
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
    const onCreateNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCreateNote })));

    tecla("n");

    expect(onCreateNote).toHaveBeenCalledOnce();
  });

  it("aceita a maiúscula: quem segurou Shift sem querer não fica sem o atalho", () => {
    const onCreateNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCreateNote })));

    tecla("N", document.body, { shiftKey: true });

    expect(onCreateNote).toHaveBeenCalledOnce();
  });

  it("não cria enquanto se digita num post-it", () => {
    const onCreateNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCreateNote })));

    tecla("n", elemento("textarea"));

    expect(onCreateNote).not.toHaveBeenCalled();
  });

  /**
   * `Ctrl+N` e `⌘+N` abrem uma janela nova do navegador. Roubar a tecla deixaria quem
   * quisesse a janela sem ela — e ninguém que aperta esse par está pedindo um post-it.
   */
  it("não rouba o Ctrl+N nem o ⌘+N do navegador", () => {
    const onCreateNote = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onCreateNote })));

    expect(tecla("n", document.body, { ctrlKey: true })).toBe(false);
    expect(tecla("n", document.body, { metaKey: true })).toBe(false);
    expect(onCreateNote).not.toHaveBeenCalled();
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

  it("o S sozinho não salva nem apaga nada", () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts(opcoes({ onSave })));

    tecla("s");

    expect(onSave).not.toHaveBeenCalled();
  });
});
