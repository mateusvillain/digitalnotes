import { describe, expect, it } from "vitest";
import { SIMPLIFY_TOLERANCE, simplify } from "./simplify";
import { type Point } from "./coords";

/** Um rabisco plausível: uma onda amostrada densamente, como o ponteiro reporta. */
function rabisco(pontos: number): Point[] {
  return Array.from({ length: pontos }, (_, index) => {
    const t = (index / (pontos - 1)) * Math.PI * 4;
    return { x: index * 0.8, y: 120 + Math.sin(t) * 60 + Math.sin(t * 3) * 8 };
  });
}

/**
 * Maior distância de um ponto do traço original à linha que sobrou.
 *
 * É a pergunta que a tolerância responde: não "quantos pontos sumiram", e sim "o quanto o
 * desenho mudou". Mede ponto a ponto contra o segmento mais próximo do resultado.
 */
function desvioMaximo(original: readonly Point[], simplificado: readonly Point[]): number {
  let pior = 0;

  for (const point of original) {
    let maisPerto = Number.POSITIVE_INFINITY;

    for (let index = 0; index + 1 < simplificado.length; index += 1) {
      const a = simplificado[index];
      const b = simplificado[index + 1];
      if (a === undefined || b === undefined) continue;

      maisPerto = Math.min(maisPerto, distanciaAoSegmento(point, a, b));
    }

    pior = Math.max(pior, maisPerto);
  }

  return pior;
}

/** Distância ao segmento (e não à reta infinita): fora dele, vale a distância à ponta. */
function distanciaAoSegmento(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comprimento = dx * dx + dy * dy;
  if (comprimento === 0) return Math.hypot(point.x - a.x, point.y - a.y);

  const t = Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / comprimento, 0), 1);
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

describe("simplify", () => {
  it("reduz um traço denso em pelo menos uma ordem de grandeza", () => {
    const original = rabisco(600);

    const simplificado = simplify(original);

    expect(simplificado.length).toBeLessThan(original.length / 10);
    expect(simplificado.length).toBeGreaterThan(2);
  });

  it("não deixa o desenho se afastar mais do que a tolerância", () => {
    const original = rabisco(600);

    const simplificado = simplify(original);

    expect(desvioMaximo(original, simplificado)).toBeLessThanOrEqual(SIMPLIFY_TOLERANCE);
  });

  it("guarda o primeiro e o último ponto, que dizem onde o traço começa e acaba", () => {
    const original = rabisco(300);

    const simplificado = simplify(original);

    expect(simplificado[0]).toEqual(original[0]);
    expect(simplificado[simplificado.length - 1]).toEqual(original[original.length - 1]);
  });

  it("atravessa uma reta de dois pontos sem alteração", () => {
    const reta: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 40 },
    ];

    expect(simplify(reta)).toEqual(reta);
  });

  it("derruba os pontos do meio de uma reta, que não descrevem nada", () => {
    const reta = Array.from({ length: 50 }, (_, index) => ({ x: index * 2, y: index * 2 }));

    expect(simplify(reta)).toEqual([
      { x: 0, y: 0 },
      { x: 98, y: 98 },
    ]);
  });

  it("preserva o vinco de um traço em L, que é a forma dele", () => {
    const l: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ];

    expect(simplify(l)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  it.each([
    ["vazio", [] as Point[]],
    ["um ponto só", [{ x: 5, y: 5 }]],
  ])("devolve %s sem lançar", (_caso, points) => {
    expect(simplify(points)).toEqual(points);
  });

  it("não descarta o traço que volta ao ponto de partida", () => {
    // Extremos iguais não definem reta: sem tratar o caso, a conta divide por zero, todo
    // desvio vira NaN, e o traço inteiro colapsaria em dois pontos.
    const laço: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 0, y: 0 },
    ];

    expect(simplify(laço)).toEqual(laço);
  });

  it("não devolve a mesma lista, para quem chamou não escrever no resultado sem querer", () => {
    const original: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];

    expect(simplify(original)).not.toBe(original);
  });

  it("aceita uma tolerância maior, que simplifica mais", () => {
    const original = rabisco(600);

    expect(simplify(original, 10).length).toBeLessThan(simplify(original, 1).length);
  });
});
