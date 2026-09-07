"use client";

import { PostIt } from "@/components/postit/PostIt";
import type { Note } from "@/lib/board/types";

interface BoardProps {
  notes: readonly Note[];
  /** Note em edição de texto, ou `null`. */
  editingId?: string | null;
  onEditStart?: (id: string) => void;
  onEditCommit?: (id: string, text: string) => void;
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
export function Board({ notes, editingId = null, onEditStart, onEditCommit }: BoardProps) {
  return (
    <>
      {notes.map((note) => (
        <PostIt
          key={note.id}
          note={note}
          editing={note.id === editingId}
          onEditStart={onEditStart}
          onEditCommit={onEditCommit}
        />
      ))}
    </>
  );
}
