/**
 * Ponte entre o índice de cor guardado no board e o token de tema correspondente.
 *
 * O contrato (src/lib/board/types.ts) é dono da paleta e da ordem; o tema é dono do valor
 * visual de cada cor. O nome do token é derivado do nome da cor, e não escrito à mão, para
 * não existir uma segunda lista capaz de divergir da primeira.
 */

import { NOTE_COLORS, type NoteColor, type NoteColorName } from "@/lib/board/types";

/** Cor do texto escrito em cima de qualquer post-it. */
export const NOTE_INK_VAR = "--color-note-ink";

/** Variável CSS do fundo de uma cor de post-it. Um typo aqui é erro de compilação. */
export type NoteBackgroundVar = `--color-note-${NoteColorName}`;

/** Variável CSS de fundo a partir do índice guardado no board. */
export function noteBackgroundVar(color: NoteColor): NoteBackgroundVar {
  return `--color-note-${NOTE_COLORS[color]}`;
}

/**
 * Valor de cor pronto para um estilo inline.
 *
 * Existe para a sintaxe do `var()` não vazar para dentro de cada componente que pinta um
 * post-it: quem é dono do token é este módulo.
 */
export function noteBackgroundColor(color: NoteColor): string {
  return `var(${noteBackgroundVar(color)})`;
}

/**
 * Nome de cada cor em português, para quem lê a interface com leitor de tela.
 *
 * `Record` sobre o nome da cor, e não uma lista à parte: acrescentar uma cor à paleta sem
 * dar um rótulo a ela vira erro de compilação, em vez de um botão anunciado como "purple"
 * no meio de uma interface em português.
 */
export const NOTE_COLOR_LABELS: Record<NoteColorName, string> = {
  yellow: "Amarelo",
  pink: "Rosa",
  green: "Verde",
  blue: "Azul",
  purple: "Roxo",
  orange: "Laranja",
};

/** Rótulo legível da cor a partir do índice guardado no board. */
export function noteColorLabel(color: NoteColor): string {
  return NOTE_COLOR_LABELS[NOTE_COLORS[color]];
}
