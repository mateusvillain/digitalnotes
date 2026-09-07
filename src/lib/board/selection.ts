/**
 * Seleção de post-its.
 *
 * A seleção é estado **efêmero de interface**: dizer quais post-its estão marcados não é
 * dizer o que o board é, e por isso ela não mora na store nem viaja dentro da URL. Vive
 * aqui como valor imutável, e as operações são funções puras — apagar (#19) e colorir em
 * lote (#17) consomem a mesma noção de "o que está selecionado", em vez de cada um
 * inventar a sua.
 */

import { rectsIntersect, type Rect } from "@/lib/canvas/coords";
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

/**
 * Sobreposição entre um post-it e um retângulo.
 *
 * Uma note *é* um retângulo em coordenadas de canvas; a conta em si mora na geometria, com
 * os outros usos que ela vai ter em arrastar (#15) e redimensionar (#16).
 */
export function intersects(note: Note, rect: Rect): boolean {
  return rectsIntersect(note, rect);
}

/** Ids dos post-its que o retângulo toca. */
export function notesInRect(notes: readonly Note[], rect: Rect): Selection {
  return new Set(notes.filter((note) => intersects(note, rect)).map((note) => note.id));
}
