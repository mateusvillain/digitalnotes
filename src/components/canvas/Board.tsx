"use client";

import { PostIt } from "@/components/postit/PostIt";
import type { Selection } from "@/lib/board/selection";
import type { Point } from "@/lib/canvas/coords";
import type { Note } from "@/lib/board/types";
import type { Resizing } from "@/lib/board/useBoard";

interface BoardProps {
  notes: readonly Note[];
  /** Note em edição de texto, ou `null`. */
  editingId?: string | null;
  /** Ids marcados. */
  selection?: Selection;
  onEditStart?: (id: string) => void;
  onEditCommit?: (id: string, text: string) => void;
  onSelect?: (id: string, additive: boolean) => void;
  /** Deslocamento em curso, aplicado a todo post-it selecionado. */
  dragOffset?: Point | null;
  onDragStart?: (id: string) => void;
  onDragMove?: (delta: Point) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  /** Post-it em redimensionamento e o tamanho que ele tem agora. */
  resizing?: Resizing | null;
  onResizeStart?: (id: string) => void;
  onResizeMove?: (delta: Point) => void;
  onResizeEnd?: () => void;
  onResizeCancel?: () => void;
}

/**
 * O conteúdo do canvas: os post-its do board.
 *
 * Vive dentro da camada transformada do viewport, então desenha em coordenadas de canvas e
 * não sabe nada sobre zoom nem pan.
 *
 * Não busca nada: recebe as notes e devolve eventos. É o que permite testar seleção (#18) e
 * arraste (#15) sem montar o quadro inteiro, e o que mantém a decisão de *quando* escrever
 * na store num lugar só, no `useBoard`.
 */
export function Board({
  notes,
  editingId = null,
  selection,
  onEditStart,
  onEditCommit,
  onSelect,
  dragOffset = null,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  resizing = null,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onResizeCancel,
}: BoardProps) {
  return (
    <>
      {notes.map((note) => {
        const selected = selection?.has(note.id) ?? false;

        return (
          <PostIt
            key={note.id}
            note={note}
            editing={note.id === editingId}
            selected={selected}
            // Arrastar move a seleção inteira junto: o gesto começa num post-it, mas o
            // deslocamento vale para todos os que estavam marcados.
            offset={selected ? dragOffset : null}
            onEditStart={onEditStart}
            onEditCommit={onEditCommit}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            size={resizing?.id === note.id ? resizing.size : null}
            onResizeStart={onResizeStart}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
            onResizeCancel={onResizeCancel}
          />
        );
      })}
    </>
  );
}
