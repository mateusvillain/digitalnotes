import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { useSpaceHeld } from "./useSpaceHeld";

/** Cria um elemento anexado ao documento, para o evento ter caminho de propagação. */
function elemento(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  document.body.append(node);
  return node;
}

function tecla(
  tipo: "keydown" | "keyup",
  init: KeyboardEventInit = {},
  target: HTMLElement = document.body,
): KeyboardEvent {
  const event = new KeyboardEvent(tipo, { key: " ", bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe("useSpaceHeld", () => {
  it("começa solto", () => {
    const { result } = renderHook(() => useSpaceHeld());

    expect(result.current).toBe(false);
  });

  it("segura e solta com o espaço", () => {
    const { result } = renderHook(() => useSpaceHeld());

    tecla("keydown");
    expect(result.current).toBe(true);

    tecla("keyup");
    expect(result.current).toBe(false);
  });

  it("ignora outras teclas", () => {
    const { result } = renderHook(() => useSpaceHeld());

    tecla("keydown", { key: "a" });
    tecla("keydown", { key: "Shift" });

    expect(result.current).toBe(false);
  });

  it("impede o padrão, que rolaria a página", () => {
    renderHook(() => useSpaceHeld());

    expect(tecla("keydown").defaultPrevented).toBe(true);
  });

  it("ignora o espaço nascido num campo de texto", () => {
    const { result } = renderHook(() => useSpaceHeld());

    const event = tecla("keydown", {}, elemento("textarea"));

    // Escrevendo, espaço é espaço — e a página não pode engolir a tecla.
    expect(result.current).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignora o espaço nascido num controle que já o usa", () => {
    const { result } = renderHook(() => useSpaceHeld());

    // O post-it se seleciona com espaço desde a #17; o seletor de cor também.
    tecla("keydown", {}, elemento("div", { role: "note" }));
    tecla("keydown", {}, elemento("div", { role: "radio" }));
    tecla("keydown", {}, elemento("button"));

    expect(result.current).toBe(false);
  });

  it("ignora a repetição do teclado", () => {
    renderHook(() => useSpaceHeld());

    tecla("keydown");
    // Segurar a tecla dispara keydown continuamente; só o primeiro interessa.
    expect(tecla("keydown", { repeat: true }).defaultPrevented).toBe(false);
  });

  it("solta ao trocar de janela", () => {
    const { result } = renderHook(() => useSpaceHeld());
    tecla("keydown");

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    // O keyup acontece na outra janela e nunca chega aqui; sem isto o quadro ficaria preso
    // em modo de navegação.
    expect(result.current).toBe(false);
  });

  it("solta os ouvintes ao desmontar", () => {
    const { result, unmount } = renderHook(() => useSpaceHeld());

    unmount();
    tecla("keydown");

    expect(result.current).toBe(false);
  });
});
