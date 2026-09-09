import type { Point } from "@/lib/canvas/coords";

/** Distância ao segmento (e não à reta infinita): fora dele, vale a distância à ponta. */
function distanciaAoSegmento(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comprimento = dx * dx + dy * dy;
  if (comprimento === 0) return Math.hypot(point.x - a.x, point.y - a.y);

  const t = Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / comprimento, 0), 1);
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Maior distância de um ponto do traço original à linha que sobrou depois da simplificação.
 *
 * É a pergunta que a tolerância responde: não "quantos pontos sumiram", e sim "o quanto o
 * desenho mudou". Mede ponto a ponto contra o segmento mais próximo do resultado.
 *
 * Compartilhada porque a mesma medida vale em dois níveis: sobre a saída da função pura, e
 * sobre o que o board **guarda** no fim — que passa pelo arredondamento e por isso tem um
 * orçamento de desvio um pouco maior.
 */
export function desvioMaximo(original: readonly Point[], simplificado: readonly Point[]): number {
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

/** Reconstrói pontos a partir da lista achatada que o board guarda. */
export function pontosDe(achatados: readonly number[]): Point[] {
  const points: Point[] = [];

  for (let index = 0; index + 1 < achatados.length; index += 2) {
    points.push({ x: achatados[index] ?? 0, y: achatados[index + 1] ?? 0 });
  }

  return points;
}
