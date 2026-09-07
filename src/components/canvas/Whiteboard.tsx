"use client";

import { useCallback, useRef } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useBoard } from "@/lib/board/useBoard";
import type { Point } from "@/lib/canvas/coords";
import { useViewport } from "@/lib/canvas/useViewport";
import { Board } from "./Board";
import { Viewport } from "./Viewport";
import { ViewportControls } from "./ViewportControls";

/**
 * O quadro: junta o estado de viewport à superfície navegável, aos controles e aos post-its.
 *
 * A composição é a fiação, e só ela: o viewport sabe navegar, o `useBoard` sabe o que é o
 * board, e o `Board` sabe desenhar. Nenhum dos três precisa do outro para ser testado.
 */
export function Whiteboard() {
  const controls = useViewport();
  const board = useBoard();
  const dragOffsetBy = board.dragBy;
  /**
   * A escala atual, lida por ref dentro do conversor de arraste.
   *
   * O conversor é passado a cada post-it. Se mudasse de identidade quando o zoom muda, a
   * memoização dos post-its cairia junto — e é ela que impede o quadro inteiro de
   * re-renderizar a cada movimento do ponteiro.
   */
  const scaleRef = useRef(controls.viewport.scale);
  scaleRef.current = controls.viewport.scale;
  const areaRef = useRef<HTMLDivElement>(null);

  /**
   * Converte o deslocamento do ponteiro para unidades de canvas.
   *
   * É o delta de tela dividido pela escala, e não o delta bruto: a 200%, dois pixels de
   * mouse são um pixel de canvas, e sem a divisão o post-it andaria o dobro do cursor.
   */
  const dragBy = useCallback(
    (delta: Point) => {
      const scale = scaleRef.current;
      dragOffsetBy({ x: delta.x / scale, y: delta.y / scale });
    },
    [dragOffsetBy],
  );

  /** Centro da área visível, usado como âncora do zoom por botão. */
  const center = useCallback((): Point => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (rect === undefined) return { x: 0, y: 0 };
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  return (
    <AppShell
      controls={
        <ViewportControls
          viewport={controls.viewport}
          zoomBy={controls.zoomBy}
          reset={controls.reset}
          anchor={center}
        />
      }
    >
      <div ref={areaRef} className="absolute inset-0">
        <Viewport
          viewport={controls.viewport}
          pan={controls.pan}
          zoomBy={controls.zoomBy}
          onBackgroundDoubleClick={board.createNoteAt}
          onBackgroundClick={board.clearSelection}
          onSelectionStart={board.beginRectSelection}
          onSelectionRect={board.selectInRect}
        >
          <Board
            notes={board.notes}
            editingId={board.editingId}
            selection={board.selection}
            onEditStart={board.startEditing}
            onEditCommit={board.commitText}
            onSelect={board.selectNote}
            dragOffset={board.dragOffset}
            onDragStart={board.startDrag}
            onDragMove={dragBy}
            onDragEnd={board.endDrag}
            onDragCancel={board.cancelDrag}
          />
        </Viewport>
      </div>
    </AppShell>
  );
}
