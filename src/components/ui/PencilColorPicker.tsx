"use client";

import {
  NOTE_COLORS,
  STROKE_COLORS,
  STROKE_COLOR_BLACK,
  type StrokeColor,
} from "@/lib/board/types";
import { strokeColor } from "@/lib/theme/note-colors";
import { useUi } from "@/lib/i18n/LocaleProvider";
import { ColorRadioGroup } from "@/components/ui/ColorRadioGroup";

interface PencilColorPickerProps {
  /**
   * Cor do próximo traço. Sempre uma das sete — nunca `null`, ao contrário do post-it: o
   * lápis não tem seleção mista, só a cor que o próximo gesto vai usar.
   */
  value: StrokeColor;
  onChange: (color: StrokeColor) => void;
}

/**
 * As sete cores do traço: as seis da nota, mais o preto (#69).
 *
 * O preto entra por último, depois das seis de `ColorPicker`, porque é assim que
 * `STROKE_COLORS` as ordena (`[...NOTE_COLORS, "black"]`) — a mesma ordem em que o board
 * guarda o índice, e a paleta precisa concordar com ela ou o quadradinho errado acenderia
 * como marcado.
 *
 * A grade e a navegação por teclado moram em `ColorRadioGroup`, a mesma base do `ColorPicker`
 * do post-it. O que muda aqui é só o que é específico do traço: a cor de fundo de cada
 * quadradinho vem de `strokeColor` (que sabe resolver o preto para `--color-ink`, e as seis
 * primeiras para a mesma paleta de nota), e o rótulo de cada opção reaproveita
 * `note.colors` para as seis compartilhadas — só o preto tem um rótulo próprio, porque é a
 * única cor que a nota não tem.
 */
export function PencilColorPicker({ value, onChange }: PencilColorPickerProps) {
  const ui = useUi();

  return (
    <ColorRadioGroup
      count={STROKE_COLORS.length}
      value={value}
      onChange={(color) => onChange(color as StrokeColor)}
      swatchColor={(color) => strokeColor(color as StrokeColor)}
      colorLabel={(color) =>
        color === STROKE_COLOR_BLACK ? ui.pencil.black : ui.note.colors[NOTE_COLORS[color]!]
      }
      ariaLabel={ui.pencil.color}
      testId="pencil-color-picker"
    />
  );
}
