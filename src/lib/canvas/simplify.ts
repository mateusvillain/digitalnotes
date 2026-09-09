/**
 * Simplificação de traço à mão livre (issue #67).
 *
 * Um rabisco nasce com um ponto por evento de ponteiro — centenas em poucos segundos, a
 * maioria deles em cima da reta que os vizinhos já descrevem. O board inteiro é serializado
 * dentro da URL (#11) e o backend recusa board grande demais com `413` (#23), então guardar
 * o traço cru é o caminho mais curto para um quadro que não dá para compartilhar.
 *
 * Ramer–Douglas–Peucker resolve isso pela pergunta certa: não "quantos pontos guardar", e
 * sim "de quanto o desenho pode mudar". O que ele descarta é o ponto que fica a menos de
 * uma tolerância da reta entre os vizinhos que ficaram — ou seja, o ponto que ninguém veria
 * sumir.
 *
 * Função pura, sem estado nem React: é matemática sobre uma lista de pontos, e é assim que
 * ela pode ser testada sozinha.
 */

import { distance, type Point } from "./coords";

/**
 * Desvio máximo aceito, em unidades de canvas.
 *
 * Uma unidade de canvas é um pixel de tela a 100%, e um pixel é menos do que o olho separa
 * numa linha desenhada à mão. No zoom máximo (4x, ver `MAX_SCALE`) o desvio de pior caso
 * chega a quatro pixels de tela, e só na curva mais fechada do traço — o preço de um traço
 * imperceptivelmente mais reto, contra o de um quadro que não cabe num link.
 *
 * Abaixo de 1 a redução cai rápido sem que o desenho fique visivelmente melhor: os pontos
 * que sobram passam a ser o tremor da mão, que não é informação.
 *
 * O desvio do que o board **guarda** é um pouco maior que este número: a gravação arredonda
 * as coordenadas para inteiro (ver `parseBoard`), o que acrescenta até meia unidade por eixo
 * — `Math.SQRT1_2` na diagonal, no pior caso. O orçamento inteiro, então, é de pouco menos
 * de 1,71 unidade; continua abaixo de dois pixels de tela a 100%.
 */
export const SIMPLIFY_TOLERANCE = 1;

/**
 * Distância de `point` até a reta que passa por `start` e `end`.
 *
 * É a área do paralelogramo formado pelos dois vetores dividida pela base — o mesmo que
 * |v × w| / |v|, sem raiz quadrada além da do próprio comprimento da base.
 */
function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Extremos no mesmo lugar não definem reta nenhuma. Acontece de verdade: um traço que
  // volta ao ponto de partida chega aqui com os dois iguais, e a divisão por zero levaria
  // um `NaN` para dentro da comparação com a tolerância — que é sempre falsa, e descartaria
  // o traço inteiro em silêncio.
  if (dx === 0 && dy === 0) return distance(point, start);

  const area = Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x);
  return area / Math.hypot(dx, dy);
}

/**
 * Reduz a lista de pontos preservando a forma do traço dentro de `tolerance`.
 *
 * O primeiro e o último ponto nunca saem: são eles que dizem onde o traço começa e termina,
 * e é a reta entre eles que serve de régua para todo o resto.
 */
export function simplify(
  points: readonly Point[],
  tolerance: number = SIMPLIFY_TOLERANCE,
): Point[] {
  const start = points[0];
  const end = points[points.length - 1];

  // Dois pontos já são a forma mais simples possível — uma reta não tem o que simplificar.
  if (start === undefined || end === undefined || points.length <= 2) return [...points];

  let farthest = 0;
  let maxDistance = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (point === undefined) continue;

    const deviation = perpendicularDistance(point, start, end);
    if (deviation > maxDistance) {
      maxDistance = deviation;
      farthest = index;
    }
  }

  // Ninguém se afasta o bastante: o trecho inteiro vira a reta entre os extremos.
  if (maxDistance <= tolerance) return [start, end];

  // O ponto mais distante fica, e cada metade é resolvida pela mesma pergunta. Ele pertence
  // às duas metades, e o `slice(1)` da segunda é o que evita gravá-lo duas vezes.
  const before = simplify(points.slice(0, farthest + 1), tolerance);
  const after = simplify(points.slice(farthest), tolerance);
  return [...before, ...after.slice(1)];
}
