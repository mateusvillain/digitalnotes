/**
 * A conta da pinça de dois dedos (issue #57).
 *
 * Fica separada do componente porque é aritmética pura sobre dois pontos: o gesto é fácil
 * de errar por um fator invertido, e um teste sobre números diz isso na hora — enquanto um
 * teste sobre eventos de ponteiro diria só que "o quadro não deu zoom".
 */

import { distance, type Point } from "./coords";

/** O que a pinça era num instante: o quanto os dedos estavam afastados, e onde. */
export interface PinchSnapshot {
  gap: number;
  center: Point;
}

/** O quanto o gesto mudou entre dois instantes. */
export interface PinchChange {
  /** Fator de escala a aplicar. `1` quando os dedos mantiveram a distância. */
  factor: number;
  /** Deslocamento do centro dos dedos, em pixels de tela. */
  pan: Point;
  /** Onde ancorar o zoom: o ponto entre os dedos agora. */
  center: Point;
}

/** Fotografa a pinça a partir da posição dos dois dedos. */
export function pinchSnapshot(a: Point, b: Point): PinchSnapshot {
  return {
    gap: distance(a, b),
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

/**
 * Compara dois instantes da pinça.
 *
 * Devolve `factor: 1` quando não há como dividir — dois dedos exatamente no mesmo ponto,
 * que acontece no primeiro quadro de um toque duplo. Ampliar por infinito ali jogaria o
 * quadro para fora da tela antes de o gesto começar.
 */
export function pinchChange(previous: PinchSnapshot, current: PinchSnapshot): PinchChange {
  return {
    factor: previous.gap > 0 ? current.gap / previous.gap : 1,
    pan: {
      x: current.center.x - previous.center.x,
      y: current.center.y - previous.center.y,
    },
    center: current.center,
  };
}
