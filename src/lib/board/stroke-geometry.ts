/**
 * A forma de um traço, lida a partir da lista achatada do contrato.
 *
 * O board guarda `points` como `[x0,y0,x1,y1,…]` por uma razão de bytes (o quadro inteiro
 * viaja na URL), e essa escolha não deveria vazar para quem faz perguntas geométricas sobre
 * o rabisco. Aqui ela é desfeita uma vez, em funções puras, e o resto do sistema pergunta
 * "onde este traço está?" sem saber como ele foi serializado.
 *
 * Fora do React de propósito, como `coords.ts`: selecionar por clique, selecionar por
 * retângulo e ancorar a barra de ações fazem a mesma pergunta, e nenhuma delas precisa de
 * um componente montado para ser testada.
 */

import { rectFromCorners, segmentIntersectsRect, type Point, type Rect } from "@/lib/canvas/coords";
import type { Stroke } from "./types";

/**
 * Os pontos do traço, despachados aos pares.
 *
 * Um número solto no fim é ignorado. O contrato não produz isso — `normalizeStroke` exige
 * comprimento par —, mas um board vindo de um link antigo ou editado à mão pode trazer, e
 * meio ponto não é um ponto.
 */
export function strokePoints(stroke: Stroke): Point[] {
  const points: Point[] = [];

  for (let index = 0; index + 1 < stroke.points.length; index += 2) {
    points.push({ x: stroke.points[index]!, y: stroke.points[index + 1]! });
  }

  return points;
}

/**
 * Menor retângulo que contém o traço, ou `null` para um traço sem pontos.
 *
 * `null`, e não um retângulo degenerado na origem, pela mesma razão de `boundingRect`:
 * "não tem forma" e "tem forma colada no canto do canvas" são coisas diferentes, e quem
 * posiciona a barra de ações pela caixa da seleção precisa distinguir as duas.
 */
export function strokeBounds(stroke: Stroke): Rect | null {
  const points = strokePoints(stroke);
  const first = points[0];
  if (first === undefined) return null;

  let left = first.x;
  let top = first.y;
  let right = first.x;
  let bottom = first.y;

  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }

  return rectFromCorners({ x: left, y: top }, { x: right, y: bottom });
}

/**
 * O retângulo de seleção toca a tinta deste traço.
 *
 * Segmento a segmento, e não pela caixa envolvente: um risco na diagonal tem caixa enorme e
 * tinta nenhuma nos cantos dela, e o teste pela caixa marcaria rabiscos que o retângulo
 * nunca chegou perto de tocar.
 *
 * Um traço de um ponto só — que o contrato não produz, mas um board de fora pode trazer —
 * não tem segmento nenhum, e por isso não é tocado por retângulo nenhum. É a mesma resposta
 * que `rectsIntersect` dá a uma caixa sem área: encostar não é intersectar.
 */
export function strokeIntersectsRect(stroke: Stroke, rect: Rect): boolean {
  const points = strokePoints(stroke);

  for (let index = 0; index + 1 < points.length; index += 1) {
    if (segmentIntersectsRect(points[index]!, points[index + 1]!, rect)) return true;
  }

  return false;
}
