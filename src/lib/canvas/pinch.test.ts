import { describe, expect, it } from "vitest";
import { pinchChange, pinchSnapshot } from "./pinch";

describe("pinchSnapshot", () => {
  it("mede a distância entre os dedos e o ponto entre eles", () => {
    const snapshot = pinchSnapshot({ x: 0, y: 0 }, { x: 60, y: 80 });

    expect(snapshot).toEqual({ gap: 100, center: { x: 30, y: 40 } });
  });

  it("não depende da ordem dos dedos", () => {
    const a = pinchSnapshot({ x: 10, y: 10 }, { x: 50, y: 30 });
    const b = pinchSnapshot({ x: 50, y: 30 }, { x: 10, y: 10 });

    expect(a).toEqual(b);
  });
});

describe("pinchChange", () => {
  it("amplia quando os dedos se afastam", () => {
    const change = pinchChange(
      pinchSnapshot({ x: 0, y: 0 }, { x: 100, y: 0 }),
      pinchSnapshot({ x: 0, y: 0 }, { x: 200, y: 0 }),
    );

    expect(change.factor).toBe(2);
  });

  it("reduz quando os dedos se aproximam", () => {
    const change = pinchChange(
      pinchSnapshot({ x: 0, y: 0 }, { x: 200, y: 0 }),
      pinchSnapshot({ x: 0, y: 0 }, { x: 100, y: 0 }),
    );

    expect(change.factor).toBe(0.5);
  });

  it("não muda a escala quando os dedos só andam juntos", () => {
    const change = pinchChange(
      pinchSnapshot({ x: 0, y: 0 }, { x: 100, y: 0 }),
      pinchSnapshot({ x: 50, y: 20 }, { x: 150, y: 20 }),
    );

    expect(change.factor).toBe(1);
    // Mover os dois dedos juntos é arrastar o quadro, e não pinçar.
    expect(change.pan).toEqual({ x: 50, y: 20 });
  });

  it("ancora o zoom no ponto entre os dedos", () => {
    const change = pinchChange(
      pinchSnapshot({ x: 0, y: 0 }, { x: 100, y: 100 }),
      pinchSnapshot({ x: 20, y: 20 }, { x: 120, y: 120 }),
    );

    expect(change.center).toEqual({ x: 70, y: 70 });
  });

  it("não amplia por infinito quando os dedos começam no mesmo ponto", () => {
    const change = pinchChange(
      pinchSnapshot({ x: 10, y: 10 }, { x: 10, y: 10 }),
      pinchSnapshot({ x: 0, y: 0 }, { x: 100, y: 0 }),
    );

    // Sem essa guarda, o primeiro quadro de um toque duplo jogaria o quadro para fora da
    // tela antes de o gesto começar.
    expect(change.factor).toBe(1);
  });
});
