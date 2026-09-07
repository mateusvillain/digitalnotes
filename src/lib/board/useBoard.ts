"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { topLeftCenteredAt, type Point, type Rect } from "@/lib/canvas/coords";
import { EMPTY_SELECTION, notesInRect, selectOnly, toggle, type Selection } from "./selection";
import { createBoardStore } from "./store";
import { NOTE_SIZE, type Board, type Note } from "./types";

export interface BoardApi {
  /** Notes do board, na ordem em que a store as guarda. */
  notes: readonly Note[];
  /** Note em edição de texto, ou `null`. Um de cada vez. */
  editingId: string | null;
  /** Ids marcados. Efêmero: não entra na store nem na URL. */
  selection: Selection;
  /** Cria um post-it centrado no ponto do canvas e já o abre para escrever. */
  createNoteAt: (point: Point) => void;
  startEditing: (id: string) => void;
  /** Marca um post-it. Com `additive`, acrescenta ou tira em vez de trocar a seleção. */
  selectNote: (id: string, additive?: boolean) => void;
  /**
   * Deslocamento em curso da seleção, em coordenadas de canvas, ou `null` fora de um
   * arraste. É otimista: mora fora da store até o gesto terminar.
   */
  dragOffset: Point | null;
  /** Começa a arrastar a partir de um post-it, garantindo que ele esteja selecionado. */
  startDrag: (id: string) => void;
  /** Move a seleção enquanto o gesto acontece, sem tocar na store. */
  dragBy: (offset: Point) => void;
  /** Grava as posições finais numa publicação só, e encerra o arraste. */
  endDrag: () => void;
  /** Desfaz o arraste sem gravar nada. */
  cancelDrag: () => void;
  /** Marca o começo de um retângulo de seleção, guardando o que já estava marcado. */
  beginRectSelection: () => void;
  /** Acrescenta ao que já estava marcado os post-its que o retângulo toca. */
  selectInRect: (rect: Rect) => void;
  clearSelection: () => void;
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
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  /** A seleção de antes do retângulo começar, para o gesto poder ser refeito enquanto anda. */
  const selectionBeforeRect = useRef<Selection>(EMPTY_SELECTION);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  // O mesmo `getBoard` nos dois argumentos: o board inicial no servidor é o mesmo objeto do
  // primeiro render no cliente, então não há divergência de hidratação a conciliar.
  const board: Board = useSyncExternalStore(store.subscribe, store.getBoard, store.getBoard);

  const createNoteAt = useCallback(
    (point: Point) => {
      // O tamanho é dito uma vez e usado duas: para centrar e para criar. Deixar a store
      // aplicar o padrão dela e centrar por fora daria dois donos da mesma medida, e o
      // post-it nasceria fora do cursor no dia em que uma das duas mudasse.
      const size = { w: NOTE_SIZE.defaultWidth, h: NOTE_SIZE.defaultHeight };
      // Cor padrão e z do topo continuam vindo da store, que é dona deles.
      const note = store.addNote({ ...topLeftCenteredAt(point, size), ...size });
      // Coordenada impossível não cria nada (a store devolve `null`) e não abre edição de
      // um post-it que não existe.
      if (note === null) return;

      setEditingId(note.id);
      // Criar é selecionar: o post-it recém-nascido é sobre o que as próximas ações agem.
      setSelection(selectOnly(note.id));
    },
    [store],
  );

  // `setEditingId` já é estável: embrulhar em useCallback seria só um intermediário.
  const startEditing = setEditingId;

  const selectNote = useCallback(
    (id: string, additive = false) => {
      let promoted = true;

      if (additive) {
        setSelection((current) => {
          // Shift-clique tira tanto quanto põe, e tirar não é motivo para promover.
          promoted = !current.has(id);
          return toggle(current, id);
        });
      } else {
        setSelection(selectOnly(id));
      }

      // Selecionar traz para a frente, e isso **é** do board: a ordem de empilhamento vai
      // serializada. Vale para o clique e para o shift-clique, porque nos dois o usuário
      // apontou para aquele post-it, naquela ordem.
      if (promoted) store.bringToFront(id);
    },
    [store],
  );

  const beginRectSelection = useCallback(() => {
    selectionBeforeRect.current = selection;
  }, [selection]);

  const selectInRect = useCallback(
    (rect: Rect) => {
      // Soma ao que já estava marcado, como o shift-clique — é o mesmo Shift que abre o
      // gesto. Redesenhar o retângulo recalcula a partir do que havia antes dele, senão
      // encolher o retângulo nunca desmarcaria ninguém.
      const tocados = notesInRect(store.getBoard().notes, rect);
      setSelection(new Set([...selectionBeforeRect.current, ...tocados]));
    },
    [store],
  );

  const clearSelection = useCallback(() => setSelection(EMPTY_SELECTION), []);

  const startDrag = useCallback((id: string) => {
    // Arrastar um post-it de fora da seleção move só ele: quem pega um post-it solto não
    // está pedindo para levar junto o que estava marcado antes.
    setSelection((current) => (current.has(id) ? current : selectOnly(id)));
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const dragBy = useCallback((offset: Point) => setDragOffset(offset), []);

  const endDrag = useCallback(() => {
    const offset = dragOffset;
    setDragOffset(null);
    if (offset === null) return;

    // Uma publicação só para a seleção inteira: quem escuta é a persistência, que reescreve
    // a URL a cada aviso. E inteiros, porque cada casa decimal custa caracteres de link — e
    // porque o zoom faz o deslocamento chegar aqui fracionado.
    store.updateNotes(
      store
        .getBoard()
        .notes.filter((note) => selection.has(note.id))
        .map((note) => ({
          id: note.id,
          patch: {
            x: Math.round(note.x + offset.x),
            y: Math.round(note.y + offset.y),
          },
        })),
    );
  }, [dragOffset, selection, store]);

  const cancelDrag = useCallback(() => setDragOffset(null), []);

  const commitText = useCallback(
    (id: string, text: string) => {
      store.updateNote(id, { text });
      setEditingId((current) => (current === id ? null : current));
    },
    [store],
  );

  return {
    notes: board.notes,
    editingId,
    selection,
    createNoteAt,
    startEditing,
    commitText,
    dragOffset,
    startDrag,
    dragBy,
    endDrag,
    cancelDrag,
    selectNote,
    beginRectSelection,
    selectInRect,
    clearSelection,
  };
}
