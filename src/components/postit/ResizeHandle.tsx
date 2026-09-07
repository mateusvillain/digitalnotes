"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { DragHandlers } from "@/lib/canvas/useDrag";

interface ResizeHandleProps {
  handlers: DragHandlers;
  /** Visível o tempo todo. Fora disso, só aparece quando o ponteiro passa pelo post-it. */
  alwaysVisible: boolean;
}

/**
 * A alça de redimensionar, no canto inferior direito.
 *
 * Fica nesse canto por consequência da âncora: o post-it é descrito pelo canto superior
 * esquerdo, então crescer para a direita e para baixo é a única direção em que a posição
 * não precisa mudar junto com o tamanho.
 *
 * A área sensível é maior que o desenho, e de propósito: o alvo visível é discreto para não
 * competir com o texto, mas um alvo de dez pixels seria difícil de acertar com o mouse.
 *
 * Fica **dentro** da caixa, e não transbordando pela borda: o post-it recorta o que não
 * cabe, e uma alça pendurada para fora seria cortada junto com o texto.
 */
export function ResizeHandle({ handlers, alwaysVisible }: ResizeHandleProps) {
  /**
   * O gesto para aqui.
   *
   * Sem isso ele também chegaria ao post-it, que armaria um arraste: puxar a alça moveria o
   * post-it e o redimensionaria ao mesmo tempo.
   */
  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.stopPropagation();
    handlers.onPointerDown(event);
  }

  /**
   * O duplo clique também para aqui.
   *
   * Sem isto ele chegaria ao post-it, que o lê como o pedido de editar o texto: dois
   * cliques para ajustar o tamanho abririam o editor em cima do que se estava ajustando.
   */
  function handleDoubleClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  return (
    <div
      className={`absolute right-0 bottom-0 h-6 w-6 cursor-nwse-resize touch-none transition-opacity ${
        alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
      data-testid="resize-handle"
      data-visible={alwaysVisible}
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
    >
      <div className="absolute right-1.5 bottom-1.5 h-2.5 w-2.5 rounded-xs border-2 border-selection bg-surface" />
    </div>
  );
}
