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

/**
 * Índice em {@link NOTE_COLORS}. É isto que vai serializado no board.
 *
 * Derivado da própria paleta, e não escrito à mão, para que acrescentar uma cor não deixe
 * o type guard aceitando índices que o tipo recusa (ou o contrário).
 */
export type NoteColor = TupleIndex<typeof NOTE_COLORS>;

/** Union dos índices válidos de uma tupla: `["a", "b"]` -> `0 | 1`. */
type TupleIndex<T extends readonly unknown[]> =
  Extract<keyof T, `${number}`> extends `${infer Index extends number}` ? Index : never;

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

/**
 * Maior coordenada aceita, em módulo, ao redor da origem.
 *
 * Não é o limite de navegação do viewport (issue #9): é um teto defensivo para dado vindo
 * de fora, que impede uma coordenada absurda de jogar um post-it para fora do universo.
 */
export const CANVAS_MAX_ABS_COORDINATE = 100_000;

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
  /**
   * Versão do schema deste board. Um board que passou por `parseBoard` sempre carrega
   * {@link SCHEMA_VERSION}, porque é nessa versão que ele foi normalizado.
   */
  version: number;
  notes: Note[];
}

/** Board vazio, usado quando não há nada na URL nem no armazenamento local. */
export function createEmptyBoard(): Board {
  return { version: SCHEMA_VERSION, notes: [] };
}

/** Guarda de tipo para o índice de cor vindo de dado não confiável. */
export function isNoteColor(value: unknown): value is NoteColor {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < NOTE_COLORS.length
  );
}
