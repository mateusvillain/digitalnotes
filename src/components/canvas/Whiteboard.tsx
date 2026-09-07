"use client";

import { useCallback, useEffect, useRef } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useBoard } from "@/lib/board/useBoard";
import type { Point } from "@/lib/canvas/coords";
import { useViewport } from "@/lib/canvas/useViewport";
import { ColorPicker } from "@/components/postit/ColorPicker";
import { Board } from "./Board";
import { Viewport } from "./Viewport";
import { SelectionToolbar } from "./SelectionToolbar";
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
  const resizeOffsetBy = board.resizeBy;
  /**
   * A escala atual, lida por ref dentro do conversor de arraste.
   *
   * O conversor é passado a cada post-it. Se mudasse de identidade quando o zoom muda, a
   * memoização dos post-its cairia junto — e é ela que impede o quadro inteiro de
   * re-renderizar a cada movimento do ponteiro.
   */
  const scaleRef = useRef(controls.viewport.scale);
  // Sincronizada por efeito, e não no render: escrever uma ref enquanto se renderiza é
  // inseguro sob render concorrente. Quem lê são os conversores, chamados dentro de um
  // gesto de ponteiro — e o zoom não muda enquanto um post-it está sendo arrastado.
  useEffect(() => {
    scaleRef.current = controls.viewport.scale;
  }, [controls.viewport.scale]);
  const areaRef = useRef<HTMLDivElement>(null);

  /**
   * Converte o deslocamento do ponteiro para unidades de canvas.
   *
   * É o delta de tela dividido pela escala, e não o delta bruto: a 200%, dois pixels de
   * mouse são um pixel de canvas, e sem a divisão o post-it andaria o dobro do cursor.
   *
   * Arrastar e redimensionar fazem a mesma conta porque é a mesma pergunta: quantas
   * unidades de canvas o cursor andou.
   */
  const toCanvasDelta = useCallback((delta: Point): Point => {
    const scale = scaleRef.current;
    return { x: delta.x / scale, y: delta.y / scale };
  }, []);

  const dragBy = useCallback(
    (delta: Point) => dragOffsetBy(toCanvasDelta(delta)),
    [dragOffsetBy, toCanvasDelta],
  );

  const resizeBy = useCallback(
    (delta: Point) => resizeOffsetBy(toCanvasDelta(delta)),
    [resizeOffsetBy, toCanvasDelta],
  );

  /** Um gesto de ponteiro em curso sobre um post-it: arrastar ou redimensionar. */
  const emGesto = board.dragOffset !== null || board.resizing !== null;

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
            resizing={board.resizing}
            onResizeStart={board.startResize}
            onResizeMove={resizeBy}
            onResizeEnd={board.endResize}
            onResizeCancel={board.cancelResize}
          />
        </Viewport>

        {/*
          Fora do `Viewport`, e de propósito duas vezes. Fora da camada transformada, para a
          barra não escalar com o zoom; e fora da superfície, para clicar numa cor não
          chegar ao fundo do quadro, que leria o clique como "limpar a seleção".

          Some durante o gesto: a caixa da seleção é calculada com as posições já gravadas,
          então uma barra visível durante um arraste ficaria parada enquanto os post-its
          andam por baixo dela.
        */}
        {emGesto ? null : (
          <div className="pointer-events-none absolute inset-0">
            <SelectionToolbar rects={board.selected} viewport={controls.viewport}>
              <ColorPicker value={board.selectionColor} onChange={board.colorSelection} />
            </SelectionToolbar>
          </div>
        )}
      </div>
    </AppShell>
  );
}
