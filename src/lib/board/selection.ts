/**
 * Seleção de post-its.
 *
 * A seleção é estado **efêmero de interface**: dizer quais post-its estão marcados não é
 * dizer o que o board é, e por isso ela não mora na store nem viaja dentro da URL. Vive
 * aqui como valor imutável, e as operações são funções puras — apagar (#19) e colorir em
 * lote (#17) consomem a mesma noção de "o que está selecionado", em vez de cada um
 * inventar a sua.
 */

import type { Rect } from "@/lib/canvas/coords";
import type { Note } from "./types";

/** Ids marcados. Conjunto, e não lista: pertencer é a única pergunta que se faz a ela. */
export type Selection = ReadonlySet<string>;

export const EMPTY_SELECTION: Selection = new Set<string>();

/** Deixa só este post-it marcado. */
export function selectOnly(id: string): Selection {
  return new Set([id]);
}

/** Acrescenta ou tira um post-it da seleção — o gesto do shift-clique. */
export function toggle(selection: Selection, id: string): Selection {
  const next = new Set(selection);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** Tira da seleção ids que não existem mais no board, depois de uma remoção (#19). */
export function keepExisting(selection: Selection, notes: readonly Note[]): Selection {
  const alive = new Set(notes.map((note) => note.id));
  return new Set([...selection].filter((id) => alive.has(id)));
}

/**
 * Sobreposição entre um post-it e um retângulo.
 *
 * Estritamente maior que zero: encostar não é intersectar. Sem isso, um retângulo de área
 * nula — o que um clique sem arrasto produz — selecionaria todo post-it cuja borda passasse
 * pelo ponto clicado.
 */
export function intersects(note: Note, rect: Rect): boolean {
  // Retângulo sem área é um ponto ou uma linha, e não toca nada — nem o post-it sobre o
  // qual ele por acaso caiu. É o que um arrasto de um eixo só, ou um clique, produz.
  if (rect.w <= 0 || rect.h <= 0) return false;

  return (
    note.x < rect.x + rect.w &&
    note.x + note.w > rect.x &&
    note.y < rect.y + rect.h &&
    note.y + note.h > rect.y
  );
}

/** Ids dos post-its que o retângulo toca. */
export function notesInRect(notes: readonly Note[], rect: Rect): Selection {
  return new Set(notes.filter((note) => intersects(note, rect)).map((note) => note.id));
}
