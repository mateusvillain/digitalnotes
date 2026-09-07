/**
 * Contrato do modelo de dados do board.
 *
 * Este é o formato único compartilhado por canvas, post-its, persistência e exportação.
 * Ele é serializado dentro da URL (issue #11), então cada campo aqui custa caracteres de
 * link: mantenha o modelo enxuto e prefira valores enumerados a strings livres.
 *
 * As decisões de compactação estão documentadas em `docs/board-format.md`.
 */

/** Versão atual do schema. Incrementar só em mudança incompatível. */
export const SCHEMA_VERSION = 1;

/**
 * Cores de post-it, na ordem em que aparecem no seletor. O board guarda o índice desta
 * lista, nunca o nome nem o valor hexadecimal — trocar a paleta não invalida links antigos.
 * Os valores visuais correspondentes são tokens de tema (issue #8).
 */
export const NOTE_COLORS = ["yellow", "pink", "green", "blue", "purple", "orange"] as const;

export type NoteColorName = (typeof NOTE_COLORS)[number];

/** Índice em {@link NOTE_COLORS}. É isto que vai serializado no board. */
export type NoteColor = 0 | 1 | 2 | 3 | 4 | 5;

/** Dimensões do post-it, em unidades de canvas. */
export const NOTE_SIZE = {
  defaultWidth: 200,
  defaultHeight: 200,
  minWidth: 80,
  minHeight: 80,
  maxWidth: 2000,
  maxHeight: 2000,
} as const;

/** Limite de texto por post-it. Existe para o board caber na URL. */
export const NOTE_MAX_TEXT_LENGTH = 2000;

/** Extremos de coordenada aceitos no canvas, em torno da origem. */
export const CANVAS_LIMIT = 100_000;

export interface Note {
  /** Identificador único dentro do board. */
  id: string;
  /** Canto superior esquerdo, em coordenadas de canvas. */
  x: number;
  y: number;
  /** Dimensões, em unidades de canvas. */
  w: number;
  h: number;
  /** Índice em {@link NOTE_COLORS}. */
  color: NoteColor;
  /** Conteúdo em texto puro, sem formatação. */
  text: string;
  /** Ordem de empilhamento: maior fica por cima. */
  z: number;
}

export interface Board {
  /** Versão do schema com que este board foi escrito. */
  version: number;
  notes: Note[];
}

/** Board vazio, usado quando não há nada na URL nem no armazenamento local. */
export function createEmptyBoard(): Board {
  return { version: SCHEMA_VERSION, notes: [] };
}

/** Cor padrão de um post-it novo. */
export const DEFAULT_NOTE_COLOR: NoteColor = 0;

export function isNoteColor(value: unknown): value is NoteColor {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < NOTE_COLORS.length
  );
}

/** Nome da cor a partir do índice guardado no board. */
export function noteColorName(color: NoteColor): NoteColorName {
  return NOTE_COLORS[color];
}
