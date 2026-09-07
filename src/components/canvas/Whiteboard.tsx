"use client";

import { useCallback, useRef } from "react";
import { Board } from "./Board";
import { Viewport } from "./Viewport";
import { ViewportControls } from "./ViewportControls";
import type { Point } from "@/lib/canvas/coords";
import { useViewport } from "@/lib/canvas/useViewport";
import { useBoard } from "@/lib/board/useBoard";
import { AppShell } from "@/components/shell/AppShell";

/**
 * O quadro: junta o estado de viewport à superfície navegável, aos controles e aos post-its.
 *
 * A composição é a fiação, e só ela: o viewport sabe navegar, o `useBoard` sabe o que é o
 * board, e o `Board` sabe desenhar. Nenhum dos três precisa do outro para ser testado.
 */
export function Whiteboard() {
  const controls = useViewport();
  const board = useBoard();
  const areaRef = useRef<HTMLDivElement>(null);

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
        >
          <Board
            notes={board.notes}
            editingId={board.editingId}
            onEditStart={board.startEditing}
            onEditCommit={board.commitText}
          />
        </Viewport>
      </div>
    </AppShell>
  );
}
