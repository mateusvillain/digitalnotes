"use client";

import type { Rect } from "@/lib/canvas/coords";

interface SelectionBoxProps {
  /** Retângulo em coordenadas de canvas, ou `null` quando não se está arrastando. */
  rect: Rect | null;
}

/**
 * O retângulo de seleção desenhado enquanto se arrasta.
 *
 * Vive dentro da camada transformada, junto dos post-its: assim ele se move e escala com o
 * quadro sem cálculo nenhum, e o que se vê cobre exatamente os post-its que serão marcados.
 *
 * Não recebe eventos (`pointer-events-none`): o ponteiro está no meio de um arrasto que
 * nasceu no fundo, e um retângulo capturando o próprio gesto o interromperia.
 */
export function SelectionBox({ rect }: SelectionBoxProps) {
  if (rect === null) return null;

  return (
    <div
      className="pointer-events-none absolute border border-selection bg-selection/10"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      data-testid="selection-box"
    />
  );
}
