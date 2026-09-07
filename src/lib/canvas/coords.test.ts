import { describe, expect, it } from "vitest";
import {
  canvasToScreen,
  clampScale,
  IDENTITY_VIEWPORT,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  scaleAsPercent,
  screenToCanvas,
  topLeftCenteredAt,
  type Viewport,
  zoomAt,
  zoomByFactor,
} from "./coords";

const viewport: Viewport = { x: 120, y: -40, scale: 2 };

describe("screenToCanvas / canvasToScreen", () => {
  it("no viewport identidade, tela e canvas coincidem", () => {
    expect(screenToCanvas({ x: 30, y: 70 }, IDENTITY_VIEWPORT)).toEqual({ x: 30, y: 70 });
    expect(canvasToScreen({ x: 30, y: 70 }, IDENTITY_VIEWPORT)).toEqual({ x: 30, y: 70 });
  });

  it("desconta o deslocamento e a escala", () => {
    expect(screenToCanvas({ x: 220, y: 60 }, viewport)).toEqual({ x: 50, y: 50 });
  });

  it("uma é a inversa da outra", () => {
    const pontos = [
      { x: 0, y: 0 },
      { x: 13.5, y: -998 },
      { x: -4000, y: 2500 },
    ];

    for (const ponto of pontos) {
      const ida = canvasToScreen(ponto, viewport);
      const volta = screenToCanvas(ida, viewport);

      expect(volta.x).toBeCloseTo(ponto.x, 10);
      expect(volta.y).toBeCloseTo(ponto.y, 10);
    }
  });
});

describe("clampScale", () => {
  it("mantém a escala dentro dos limites", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(1.5)).toBe(1.5);
  });

  it("cai para 100% no NaN e para o extremo no infinito", () => {
    expect(clampScale(Number.NaN)).toBe(1);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MAX_SCALE);
    expect(clampScale(Number.NEGATIVE_INFINITY)).toBe(MIN_SCALE);
  });
});

describe("panBy", () => {
  it("desloca sem mexer na escala", () => {
    expect(panBy(viewport, 10, -5)).toEqual({ x: 130, y: -45, scale: 2 });
  });
});

describe("zoomAt", () => {
  it("mantém sob o cursor o mesmo ponto do canvas", () => {
    const anchor = { x: 300, y: 200 };
    const antes = screenToCanvas(anchor, viewport);
    const depois = screenToCanvas(anchor, zoomAt(viewport, 3.5, anchor));

    expect(depois.x).toBeCloseTo(antes.x, 10);
    expect(depois.y).toBeCloseTo(antes.y, 10);
  });

  it("respeita os limites de escala, sem soltar a âncora", () => {
    const anchor = { x: 80, y: 80 };
    const ampliado = zoomAt(viewport, 100, anchor);

    expect(ampliado.scale).toBe(MAX_SCALE);
    expect(screenToCanvas(anchor, ampliado).x).toBeCloseTo(screenToCanvas(anchor, viewport).x, 10);
  });

  it("ancorar na origem da tela com viewport identidade não move nada", () => {
    expect(zoomAt(IDENTITY_VIEWPORT, 2, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, scale: 2 });
  });
});

describe("zoomByFactor", () => {
  it("multiplica a escala atual", () => {
    expect(zoomByFactor(IDENTITY_VIEWPORT, 1.5, { x: 0, y: 0 }).scale).toBe(1.5);
    expect(zoomByFactor(viewport, 0.5, { x: 0, y: 0 }).scale).toBe(1);
  });
});

describe("scaleAsPercent", () => {
  it("mostra a escala como porcentagem inteira", () => {
    expect(scaleAsPercent(1)).toBe(100);
    expect(scaleAsPercent(0.255)).toBe(26);
  });
});

describe("topLeftCenteredAt", () => {
  it("devolve o canto que põe o centro da caixa no ponto pedido", () => {
    expect(topLeftCenteredAt({ x: 300, y: 240 }, { w: 200, h: 200 })).toEqual({ x: 200, y: 140 });
  });

  it("aceita caixa de lado ímpar sem arredondar por conta própria", () => {
    // Arredondar aqui empurraria o post-it meio pixel para um lado; quem decide inteiros é
    // quem grava na store (#16), não a geometria.
    expect(topLeftCenteredAt({ x: 0, y: 0 }, { w: 75, h: 41 })).toEqual({ x: -37.5, y: -20.5 });
  });

  it("é a inversa de somar meia caixa", () => {
    const centro = { x: -120.5, y: 88 };
    const size = { w: 200, h: 160 };
    const canto = topLeftCenteredAt(centro, size);

    expect({ x: canto.x + size.w / 2, y: canto.y + size.h / 2 }).toEqual(centro);
  });
});
