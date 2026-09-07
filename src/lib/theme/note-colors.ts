/**
 * Ponte entre o índice de cor guardado no board e o token de tema correspondente.
 *
 * O contrato (src/lib/board/types.ts) é dono da paleta e da ordem; este arquivo é dono do
 * valor visual de cada cor. A ordem das duas listas precisa bater — o teste garante isso.
 */

import { NOTE_COLORS, type NoteColor, type NoteColorName } from "@/lib/board/types";

/** Cor do texto escrito em cima de qualquer post-it. */
export const NOTE_INK_VAR = "--color-note-ink";

/** Variável CSS do fundo de cada cor de post-it, na ordem de NOTE_COLORS. */
export const NOTE_BACKGROUND_VARS: Record<NoteColorName, string> = {
  yellow: "--color-note-yellow",
  pink: "--color-note-pink",
  green: "--color-note-green",
  blue: "--color-note-blue",
  purple: "--color-note-purple",
  orange: "--color-note-orange",
};

/** Variável CSS de fundo a partir do índice guardado no board. */
export function noteBackgroundVar(color: NoteColor): string {
  return NOTE_BACKGROUND_VARS[NOTE_COLORS[color]];
}
