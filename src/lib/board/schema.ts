/**
 * Validação e normalização de boards vindos de fontes não confiáveis: a URL, o
 * localStorage ou um link colado por outra pessoa.
 *
 * Nada aqui lança exceção — quem chama sempre recebe um resultado e decide o que fazer.
 * Um board parcialmente corrompido não deve levar a tela toda embora: notes inválidas são
 * descartadas e reportadas em `warnings`, e só um board irrecuperável vira erro.
 */

import {
  CANVAS_MAX_ABS_COORDINATE,
  NOTE_MAX_TEXT_LENGTH,
  NOTE_SIZE,
  SCHEMA_VERSION,
  isNoteColor,
  type Board,
  type Note,
} from "./types";

export type ParseBoardResult =
  { ok: true; board: Board; warnings: string[] } | { ok: false; error: string };

/** Limita `value` a [min, max]; devolve `fallback` quando não é um número utilizável. */
function clampOr(value: unknown, min: number, max: number, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normaliza uma note. Devolve `null` quando os campos obrigatórios não têm como ser
 * recuperados — id, posição e cor. Tamanho, z e texto têm padrão ou são ajustáveis.
 *
 * Exportada para quem precisa validar uma note isolada (um post-it colado, por exemplo)
 * sem passar um board inteiro.
 */
export function normalizeNote(input: unknown): Note | null {
  if (!isPlainObject(input)) return null;

  const { id, x, y, w, h, color, text, z } = input;

  if (typeof id !== "string" || id.length === 0) return null;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  if (!isNoteColor(color)) return null;

  return {
    id,
    x: clampOr(x, -CANVAS_MAX_ABS_COORDINATE, CANVAS_MAX_ABS_COORDINATE, 0),
    y: clampOr(y, -CANVAS_MAX_ABS_COORDINATE, CANVAS_MAX_ABS_COORDINATE, 0),
    w: clampOr(w, NOTE_SIZE.minWidth, NOTE_SIZE.maxWidth, NOTE_SIZE.defaultWidth),
    h: clampOr(h, NOTE_SIZE.minHeight, NOTE_SIZE.maxHeight, NOTE_SIZE.defaultHeight),
    color,
    text: typeof text === "string" ? text.slice(0, NOTE_MAX_TEXT_LENGTH) : "",
    z: isFiniteNumber(z) ? Math.trunc(z) : 0,
  };
}

/**
 * Valida e normaliza um board desconhecido.
 *
 * Boards escritos por uma versão futura do schema são recusados: o formato pode ter mudado
 * de significado, e abrir um link novo numa versão antiga do app com dados silenciosamente
 * errados é pior do que avisar.
 */
/** Deriva um id livre a partir de `id`, sufixando até não colidir com `taken`. */
function uniqueId(id: string, taken: ReadonlySet<string>): string {
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${id}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function parseBoard(input: unknown): ParseBoardResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: "Board inválido: esperava um objeto." };
  }

  const { version, notes } = input;

  if (!isFiniteNumber(version) || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "Board inválido: versão de schema ausente ou inválida." };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Board criado por uma versão mais nova do app (schema ${version}).`,
    };
  }
  if (!Array.isArray(notes)) {
    return { ok: false, error: "Board inválido: lista de post-its ausente." };
  }

  const warnings: string[] = [];
  const seenIds = new Set<string>();
  const normalized: Note[] = [];

  for (const [index, candidate] of notes.entries()) {
    const note = normalizeNote(candidate);
    if (note === null) {
      warnings.push(`Post-it na posição ${index} descartado: dados inválidos.`);
      continue;
    }
    if (seenIds.has(note.id)) {
      // Id duplicado é dado recuperável: o conteúdo do post-it está intacto, só o
      // identificador colide. Renomear preserva o que o usuário escreveu; descartar não.
      const id = uniqueId(note.id, seenIds);
      warnings.push(
        `Post-it na posição ${index}: id "${note.id}" duplicado, renomeado para "${id}".`,
      );
      note.id = id;
    }
    seenIds.add(note.id);
    normalized.push(note);
  }

  return { ok: true, board: { version: SCHEMA_VERSION, notes: normalized }, warnings };
}
