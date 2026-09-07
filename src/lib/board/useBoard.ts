"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { createBoardStore } from "./store";
import { NOTE_SIZE, type Board, type Note } from "./types";
import type { Point } from "@/lib/canvas/coords";

export interface BoardApi {
  /** Notes do board, na ordem em que a store as guarda. */
  notes: readonly Note[];
  /** Note em edição de texto, ou `null`. Um de cada vez. */
  editingId: string | null;
  /** Cria um post-it centrado no ponto do canvas e já o abre para escrever. */
  createNoteAt: (point: Point) => void;
  startEditing: (id: string) => void;
  /** Grava o texto e fecha a edição. */
  commitText: (id: string, text: string) => void;
}

/**
 * Liga a store do board à interface.
 *
 * A store (#10) é deliberadamente sem React; este hook é a única ponte, e é aqui que mora
 * o que **não** pode entrar nela: qual post-it está em edição é estado efêmero de
 * interface, e a store congela as notes justamente para que estado assim não vá parar
 * dentro da URL.
 *
 * A store é criada uma vez por montagem, e não em escopo de módulo: em escopo de módulo ela
 * sobreviveria entre testes e, no servidor, entre requisições de usuários diferentes.
 */
export function useBoard(): BoardApi {
  const [store] = useState(createBoardStore);
  const [editingId, setEditingId] = useState<string | null>(null);

  // O mesmo `getBoard` nos dois argumentos: o board inicial no servidor é o mesmo objeto do
  // primeiro render no cliente, então não há divergência de hidratação a conciliar.
  const board: Board = useSyncExternalStore(store.subscribe, store.getBoard, store.getBoard);

  const createNoteAt = useCallback(
    (point: Point) => {
      // Centrado no cursor: o post-it nasce onde se olhou, não com o canto ali. Cor padrão
      // e z do topo vêm da própria store.
      const note = store.addNote({
        x: point.x - NOTE_SIZE.defaultWidth / 2,
        y: point.y - NOTE_SIZE.defaultHeight / 2,
      });
      // Coordenada impossível não cria nada (a store devolve `null`) e não abre edição de
      // um post-it que não existe.
      if (note !== null) setEditingId(note.id);
    },
    [store],
  );

  const startEditing = useCallback((id: string) => setEditingId(id), []);

  const commitText = useCallback(
    (id: string, text: string) => {
      store.updateNote(id, { text });
      setEditingId((current) => (current === id ? null : current));
    },
    [store],
  );

  return { notes: board.notes, editingId, createNoteAt, startEditing, commitText };
}
