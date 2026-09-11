"use client";

import { NOTE_COLORS, type NoteColor } from "@/lib/board/types";
import { noteBackgroundColor } from "@/lib/theme/note-colors";
import { useUi } from "@/lib/i18n/LocaleProvider";
import { ColorRadioGroup } from "@/components/ui/ColorRadioGroup";

interface ColorPickerProps {
  /** Cor marcada, ou `null` quando a seleção tem mais de uma cor. */
  value: NoteColor | null;
  onChange: (color: NoteColor) => void;
}

/**
 * Os seis quadradinhos de cor da paleta do post-it.
 *
 * A grade e a navegação por teclado moram em `ColorRadioGroup`, que esta função só
 * alimenta com o que é específico de nota: as seis cores, o rótulo de cada uma, e o nome do
 * grupo — todos vindos do dicionário de idioma. Não sabe nada sobre post-it além disso, nem
 * sobre seleção: recebe a cor marcada e avisa quando outra foi escolhida. É o que o deixa
 * testável sem um quadro em volta.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const ui = useUi();

  return (
    <ColorRadioGroup
      count={NOTE_COLORS.length}
      value={value}
      onChange={(color) => onChange(color as NoteColor)}
      swatchColor={(color) => noteBackgroundColor(color as NoteColor)}
      colorLabel={(color) => ui.note.colors[NOTE_COLORS[color as NoteColor]]}
      ariaLabel={ui.note.color}
      testId="color-picker"
    />
  );
}
