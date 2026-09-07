/**
 * Store do board em memória — a fonte única de verdade durante a sessão.
 *
 * Toda interação com post-it escreve aqui; persistência (#20-#22) e exportação (#12) leem
 * daqui por subscrição. A store guarda **só** o que é serializável segundo o contrato: o
 * estado efêmero de interface (viewport, seleção, edição em andamento) mora nos
 * componentes, porque é justamente o que não deve acabar dentro da URL.
 *
 * É deliberadamente sem React: uma store observável comum, que a interface consome por
 * `useSyncExternalStore` sem obrigar o resto do sistema a existir dentro de um componente.
 */

import { normalizeNote } from "./schema";
import {
  NOTE_SIZE,
  SCHEMA_VERSION,
  createEmptyBoard,
  type Board,
  type Note,
  type NoteColor,
} from "./types";

/** Comprimento do id de um post-it. Curto porque vai serializado dentro da URL. */
const ID_LENGTH = 6;

/** Campos que uma atualização pode tocar: tudo menos o id, que é a identidade da note. */
export type NotePatch = Partial<Omit<Note, "id">>;

/** Dados mínimos para criar um post-it; o resto vem dos padrões do contrato. */
export interface NewNote {
  x: number;
  y: number;
  color?: NoteColor;
  text?: string;
  w?: number;
  h?: number;
}

export interface BoardStore {
  /** Board atual. A referência muda a cada alteração, para comparação por identidade. */
  getBoard: () => Board;
  /** Registra um ouvinte de mudanças; devolve a função que cancela a inscrição. */
  subscribe: (listener: () => void) => () => void;
  /** Cria um post-it já na frente dos demais e devolve a note criada. */
  addNote: (note: NewNote) => Note;
  /** Altera campos de uma note. Ignora id inexistente. */
  updateNote: (id: string, patch: NotePatch) => void;
  removeNote: (id: string) => void;
  removeNotes: (ids: readonly string[]) => void;
  /** Traz a note para a frente das demais. */
  bringToFront: (id: string) => void;
  /** Substitui o board inteiro — usado na hidratação por URL (#21). */
  replaceBoard: (board: Board) => void;
}

/** Gera um id curto e livre dentro do board. */
function createId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = Math.random()
      .toString(36)
      .slice(2, 2 + ID_LENGTH);
    if (id.length === ID_LENGTH && !taken.has(id)) return id;
  }
}

/** Maior z do board, ou 0 se estiver vazio. */
function topZ(notes: readonly Note[]): number {
  return notes.reduce((maior, note) => Math.max(maior, note.z), 0);
}

export function createBoardStore(initial: Board = createEmptyBoard()): BoardStore {
  let board = initial;
  const listeners = new Set<() => void>();

  /** Publica um board novo e avisa os inscritos. */
  function commit(notes: Note[]): void {
    board = { version: SCHEMA_VERSION, notes };
    for (const listener of listeners) listener();
  }

  function getBoard(): Board {
    return board;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function addNote(input: NewNote): Note {
    const note: Note = {
      id: createId(new Set(board.notes.map((existing) => existing.id))),
      x: input.x,
      y: input.y,
      w: input.w ?? NOTE_SIZE.defaultWidth,
      h: input.h ?? NOTE_SIZE.defaultHeight,
      color: input.color ?? 0,
      text: input.text ?? "",
      // Post-it novo nasce na frente: foi o usuário que acabou de colocá-lo ali.
      z: topZ(board.notes) + 1,
    };

    // Passa pela normalização do contrato para não existir um segundo conjunto de regras
    // sobre o que é um post-it válido.
    const normalized = normalizeNote(note);
    if (normalized === null) {
      throw new Error("Post-it inválido: verifique posição e cor.");
    }

    commit([...board.notes, normalized]);
    return normalized;
  }

  function updateNote(id: string, patch: NotePatch): void {
    let mudou = false;
    const notes = board.notes.map((note) => {
      if (note.id !== id) return note;
      const candidate = normalizeNote({ ...note, ...patch, id });
      if (candidate === null) return note;
      mudou = true;
      return candidate;
    });

    if (mudou) commit(notes);
  }

  function removeNotes(ids: readonly string[]): void {
    const alvos = new Set(ids);
    const notes = board.notes.filter((note) => !alvos.has(note.id));

    if (notes.length !== board.notes.length) commit(notes);
  }

  function removeNote(id: string): void {
    removeNotes([id]);
  }

  function bringToFront(id: string): void {
    const note = board.notes.find((candidate) => candidate.id === id);
    if (note === undefined || note.z === topZ(board.notes)) return;

    updateNote(id, { z: topZ(board.notes) + 1 });
  }

  function replaceBoard(next: Board): void {
    commit([...next.notes]);
  }

  // Funções soltas, e não métodos: a interface vai desestruturar a store, e método com
  // `this` quebraria calado nesse uso.
  return {
    getBoard,
    subscribe,
    addNote,
    updateNote,
    removeNote,
    removeNotes,
    bringToFront,
    replaceBoard,
  };
}
