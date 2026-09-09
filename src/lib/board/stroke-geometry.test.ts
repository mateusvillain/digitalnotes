import { describe, expect, it } from "vitest";
import type { Rect } from "@/lib/canvas/coords";
import {
  STROKE_MIN_SIZE,
  scaleStrokePoints,
  strokeBounds,
  strokeIntersectsRect,
  strokePoints,
  translateStrokePoints,
} from "./stroke-geometry";
import type { Stroke } from "./types";

function stroke(points: number[]): Stroke {
  return { id: "trc123", color: 6, points, z: 1 };
}

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

describe("strokePoints", () => {
  it("despacha a lista achatada aos pares", () => {
    expect(strokePoints(stroke([0, 1, 2, 3]))).toEqual([
      { x: 0, y: 1 },
      { x: 2, y: 3 },
    ]);
  });

  /**
   * O contrato exige comprimento par, então isto não vem de dentro. Vem de um link antigo
   * ou de um board editado à mão — e meio ponto não é um ponto.
   */
  it("ignora um número solto no fim", () => {
    expect(strokePoints(stroke([0, 1, 2, 3, 9]))).toEqual([
      { x: 0, y: 1 },
      { x: 2, y: 3 },
    ]);
  });

  it("um traço sem pontos não tem ponto nenhum", () => {
    expect(strokePoints(stroke([]))).toEqual([]);
  });
});

describe("strokeBounds", () => {
  it("envolve todos os pontos", () => {
    expect(strokeBounds(stroke([10, 20, 50, 5, 30, 40]))).toEqual(rect(10, 5, 40, 35));
  });

  it("funciona com o traço desenhado da direita para a esquerda", () => {
    // A caixa não tem lado de partida: quem desenha de trás para a frente tem a mesma caixa.
    expect(strokeBounds(stroke([100, 100, 0, 0]))).toEqual(rect(0, 0, 100, 100));
  });

  /**
   * `null`, e não um retângulo na origem, pela mesma razão de `boundingRect`: quem ancora a
   * barra de ações pela caixa da seleção precisa distinguir "não tem forma" de "tem forma
   * colada no canto do canvas". Um retângulo inventado puxaria a barra para lá.
   */
  it("devolve null para um traço sem pontos", () => {
    expect(strokeBounds(stroke([]))).toBeNull();
  });
});

describe("strokeIntersectsRect", () => {
  it("pega o traço que passa por dentro do retângulo", () => {
    expect(strokeIntersectsRect(stroke([0, 50, 200, 50]), rect(50, 0, 100, 100))).toBe(true);
  });

  it("pega o traço inteirinho contido no retângulo", () => {
    // Nenhuma borda é cruzada aqui: quem responde é o teste de ponta dentro da caixa.
    expect(strokeIntersectsRect(stroke([60, 60, 70, 70]), rect(50, 50, 100, 100))).toBe(true);
  });

  it("pega o traço que atravessa de lado a lado sem ponta dentro", () => {
    // E aqui é o contrário: ponta nenhuma está dentro, e quem responde é o cruzamento com
    // as bordas. Os dois testes existem porque nenhum dos dois vê o caso do outro.
    expect(strokeIntersectsRect(stroke([0, 60, 500, 60]), rect(50, 50, 100, 100))).toBe(true);
  });

  /**
   * A razão de a conta ser segmento a segmento, e não pela caixa envolvente.
   *
   * Um risco na diagonal do canvas tem caixa enorme, e os cantos dela não têm tinta nenhuma.
   * Um retângulo desenhado num desses cantos tocaria a caixa e não tocaria o traço — e pela
   * caixa ele seria selecionado sem que nada visível justificasse.
   */
  it("não pega o canto vazio da caixa de um traço diagonal", () => {
    const diagonal = stroke([0, 0, 400, 400]);

    expect(strokeIntersectsRect(diagonal, rect(300, 10, 50, 50))).toBe(false);
    // O mesmo traço, com o retângulo agora em cima da tinta.
    expect(strokeIntersectsRect(diagonal, rect(180, 180, 50, 50))).toBe(true);
  });

  it("ignora o traço fora do retângulo", () => {
    expect(strokeIntersectsRect(stroke([0, 0, 10, 10]), rect(900, 900, 50, 50))).toBe(false);
  });

  /**
   * É o que um clique sem arrasto produz. Um retângulo sem área não toca nada, que é a
   * mesma resposta que `rectsIntersect` dá para o post-it.
   */
  it("não seleciona nada com retângulo de área nula", () => {
    expect(strokeIntersectsRect(stroke([0, 0, 100, 100]), rect(50, 50, 0, 0))).toBe(false);
  });

  it("um traço de um ponto só não tem segmento para ser tocado", () => {
    expect(strokeIntersectsRect(stroke([50, 50]), rect(0, 0, 100, 100))).toBe(false);
  });

  /** Todo segmento conta, e não só o primeiro: o rabisco pode voltar para dentro. */
  it("basta um segmento no meio do traço tocar", () => {
    const zigue = stroke([0, 0, 10, 10, 500, 500, 510, 510]);

    expect(strokeIntersectsRect(zigue, rect(200, 200, 50, 50))).toBe(true);
  });
});

describe("translateStrokePoints", () => {
  it("desloca x e y, cada um no próprio eixo", () => {
    expect(translateStrokePoints(stroke([0, 0, 10, 20]), { x: 5, y: -3 })).toEqual([5, -3, 15, 17]);
  });

  it("deslocamento nulo devolve os mesmos números", () => {
    expect(translateStrokePoints(stroke([1, 2, 3, 4]), { x: 0, y: 0 })).toEqual([1, 2, 3, 4]);
  });
});

describe("scaleStrokePoints", () => {
  const de = { x: 0, y: 0, w: 100, h: 100 };

  it("dobra o traço ancorando no canto de partida", () => {
    const dobrado = scaleStrokePoints(stroke([0, 0, 50, 100]), de, { w: 200, h: 200 });

    // O canto de partida fica parado, e o resto se afasta dele na proporção.
    expect(dobrado).toEqual([0, 0, 100, 200]);
  });

  it("ancora no canto de partida mesmo longe da origem", () => {
    const caixa = { x: 100, y: 100, w: 100, h: 100 };
    const dobrado = scaleStrokePoints(stroke([100, 100, 200, 200]), caixa, { w: 200, h: 200 });

    expect(dobrado).toEqual([100, 100, 300, 300]);
  });

  it("encolher também vale", () => {
    expect(scaleStrokePoints(stroke([0, 0, 100, 100]), de, { w: 50, h: 50 })).toEqual([
      0, 0, 50, 50,
    ]);
  });

  it("tamanho igual devolve o traço onde estava", () => {
    expect(scaleStrokePoints(stroke([10, 20, 30, 40]), de, { w: 100, h: 100 })).toEqual([
      10, 20, 30, 40,
    ]);
  });

  /**
   * Um risco perfeitamente horizontal não tem altura. Multiplicar por `size.h / 0` daria
   * `Infinity` ou `NaN` em todo ponto, e o traço sumiria do quadro em vez de crescer.
   */
  it("não divide por zero num eixo sem extensão", () => {
    const horizontal = stroke([0, 50, 100, 50]);
    const chato = { x: 0, y: 50, w: 100, h: 0 };

    const esticado = scaleStrokePoints(horizontal, chato, { w: 200, h: STROKE_MIN_SIZE });

    expect(esticado).toEqual([0, 50, 200, 50]);
    expect(esticado.every((value) => Number.isFinite(value))).toBe(true);
  });
});
