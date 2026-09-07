import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

/** Dispara uma tecla no documento, opcionalmente a partir de um alvo. */
function tecla(key: string, target: HTMLElement = document.body): boolean {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
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
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    tecla("Delete");

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("Backspace também chama", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    tecla("Backspace");

    // Ver DELETE_KEYS: no Mac a tecla escrita "delete" emite Backspace.
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("ignora outras teclas", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    tecla("a");
    tecla("Enter");
    tecla("Escape");

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não dispara com o foco num campo de texto", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    tecla("Delete", elemento("textarea"));
    tecla("Backspace", elemento("input"));

    // Digitando, Delete apaga caractere — não post-it.
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não dispara num contenteditable", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));
    const node = elemento("div", true);
    Object.defineProperty(node, "isContentEditable", { value: true });

    tecla("Delete", node);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("impede o comportamento padrão da tecla", () => {
    renderHook(() => useKeyboardShortcuts({ onDelete: vi.fn() }));

    // Backspace fora de um campo navega para trás em navegadores antigos.
    expect(tecla("Backspace")).toBe(true);
  });

  it("não impede o padrão dentro de um campo", () => {
    renderHook(() => useKeyboardShortcuts({ onDelete: vi.fn() }));

    expect(tecla("Backspace", elemento("input"))).toBe(false);
  });

  it("ouve em captura, à frente de quem para o evento na bolha", () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));
    const node = elemento("div");
    node.addEventListener("keydown", (event) => event.stopPropagation());

    tecla("Delete", node);

    // O editor do post-it para o evento na bolha; o atalho não pode depender disso, ou cada
    // campo futuro teria de lembrar de fazer o mesmo.
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("solta o ouvinte ao desmontar", () => {
    const onDelete = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onDelete }));

    unmount();
    tecla("Delete");

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("não registra um ouvinte novo a cada render", () => {
    const add = vi.spyOn(document, "addEventListener");
    const { rerender } = renderHook(({ onDelete }) => useKeyboardShortcuts({ onDelete }), {
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
    const { rerender } = renderHook(({ onDelete }) => useKeyboardShortcuts({ onDelete }), {
      initialProps: { onDelete: antigo },
    });

    rerender({ onDelete: novo });
    tecla("Delete");

    expect(antigo).not.toHaveBeenCalled();
    expect(novo).toHaveBeenCalledOnce();
  });
});
