import { beforeEach, describe, expect, it } from "vitest";
import { lastInputWasKeyboard, resetInputModality, trackInputModality } from "./inputModality";

beforeEach(() => {
  trackInputModality();
  resetInputModality();
});

describe("modalidade de entrada", () => {
  it("começa sem assumir teclado", () => {
    expect(lastInputWasKeyboard()).toBe(false);
  });

  it("reconhece o teclado depois de uma tecla", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(lastInputWasKeyboard()).toBe(true);
  });

  it("volta para ponteiro quando alguém toca ou clica", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(lastInputWasKeyboard()).toBe(false);
  });

  it("responde ao gesto mais recente, e não ao primeiro", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(lastInputWasKeyboard()).toBe(true);
  });

  it("observa uma vez só, mesmo com muitos interessados", () => {
    // Cada tooltip montado chama `trackInputModality`; registrar um par de ouvintes por
    // componente encheria o documento à toa.
    trackInputModality();
    trackInputModality();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(lastInputWasKeyboard()).toBe(true);
  });
});
