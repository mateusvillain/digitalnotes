"use client";

import { ERASER_HIT_WIDTH } from "@/lib/board/stroke-geometry";
import { topLeftCenteredAt, type Point } from "@/lib/canvas/coords";

interface EraserCursorProps {
  /** Centro do alvo da borracha, em coordenadas de canvas, ou `null` sem ponteiro no quadro. */
  at: Point | null;
}

/**
 * O círculo que acompanha o cursor com o modo borracha ligado (#98).
 *
 * Substitui o ícone de tamanho fixo do cursor do sistema por algo que diz a verdade sobre o
 * gesto: o diâmetro é `ERASER_HIT_WIDTH`, a mesma largura que `eraseSegment` testa contra
 * cada traço — o que se vê é exatamente o que some ao tocar, nem mais nem menos.
 *
 * Vive dentro da camada transformada do viewport, como a prévia da nota: as unidades são de
 * canvas, e o zoom desenha o círculo do tamanho certo sozinho, sem conta nenhuma aqui.
 */
export function EraserCursor({ at }: EraserCursorProps) {
  if (at === null) return null;

  const { x, y } = topLeftCenteredAt(at, { w: ERASER_HIT_WIDTH, h: ERASER_HIT_WIDTH });

  return (
    <div
      // Mesma razão do `aria-hidden` da prévia de nota: isto é o gesto, não conteúdo do
      // quadro, e não deveria ser anunciado como se já fosse alguma coisa.
      aria-hidden="true"
      data-testid="eraser-cursor"
      className="border-ink bg-ink/10 pointer-events-none absolute rounded-full border"
      style={{ left: x, top: y, width: ERASER_HIT_WIDTH, height: ERASER_HIT_WIDTH }}
    />
  );
}
