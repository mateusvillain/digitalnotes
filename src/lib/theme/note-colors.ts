/**
 * Ponte entre o índice de cor guardado no board e o token de tema correspondente.
 *
 * O contrato (src/lib/board/types.ts) é dono da paleta e da ordem; o tema é dono do valor
 * visual de cada cor. O nome do token é derivado do nome da cor, e não escrito à mão, para
 * não existir uma segunda lista capaz de divergir da primeira.
 */

import {
  NOTE_COLORS,
  STROKE_COLORS,
  type NoteColor,
  type NoteColorName,
  type StrokeColor,
} from "@/lib/board/types";

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
 * Cor da tinta de um traço, a partir do índice guardado no board (#68).
 *
 * As seis primeiras são as mesmas do post-it: o quadro tem uma paleta só, e o rabisco não
 * inaugura um segundo sistema de cor. O preto reusa `--color-ink`, que é o token de "cor de
 * escrever" desta interface — o mesmo tom do texto de uma nota, agora sobre o quadro.
 */
export function strokeColor(color: StrokeColor): string {
  const name = STROKE_COLORS[color];
  return name === "black" ? "var(--color-ink)" : `var(--color-note-${name})`;
}
