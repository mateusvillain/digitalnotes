"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { NOTE_COLORS, type NoteColor } from "@/lib/board/types";
import { noteBackgroundColor, noteColorLabel } from "@/lib/theme/note-colors";

interface ColorPickerProps {
  /** Cor marcada, ou `null` quando a seleção tem mais de uma cor. */
  value: NoteColor | null;
  onChange: (color: NoteColor) => void;
}

/** Índice do próximo item, dando a volta nas pontas. */
function wrap(index: number, length: number): number {
  return (index + length) % length;
}

/**
 * Os seis quadradinhos de cor da paleta.
 *
 * É um `radiogroup`, e não uma fila de botões soltos: a pergunta é "qual destas seis",
 * exatamente o que o papel descreve. Um leitor de tela anuncia "1 de 6" e o estado marcado
 * sem que seja preciso inventar rótulo para isso.
 *
 * Por ser um radiogroup, a navegação é a que o papel exige: **um só** ponto de parada de Tab
 * para o grupo inteiro, e as setas andando entre as cores. Uma fila de seis itens tabuláveis
 * obrigaria a passar por todas as cores para sair do seletor.
 *
 * Cada quadradinho é um `button` de verdade, com `role="radio"` por cima. Um `div` com o
 * papel teria exigido reimplementar à mão o que o botão já dá: ativar por Enter, ativar por
 * espaço, e o anel de foco que o navegador desenha sozinho.
 *
 * Não sabe nada sobre post-it nem sobre seleção: recebe a cor marcada e avisa quando outra
 * foi escolhida. É o que o deixa testável sem um quadro em volta.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  /**
   * Onde o foco esteve por último dentro do grupo.
   *
   * O ponto de parada de Tab segue o foco, e não a cor marcada, porque o papel pede isso e
   * porque as duas coisas se separam: marcar dois post-its de cores diferentes deixa a
   * seleção sem cor comum, e um ponto de parada preso ao valor saltaria para o primeiro
   * quadradinho enquanto o foco continua onde estava.
   */
  const [focused, setFocused] = useState<NoteColor | null>(null);

  /**
   * Sem foco nem cor marcada o ponto de parada é o primeiro item, ou o grupo inteiro ficaria
   * fora da ordem de tabulação e inalcançável pelo teclado.
   */
  const tabStop = focused ?? value ?? 0;

  /** Move o foco e já escolhe a cor: num radiogroup, andar com a seta é escolher. */
  function selectColor(color: NoteColor): void {
    const radios = groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[color]?.focus();
    onChange(color);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, color: NoteColor): void {
    const next = wrap(color + 1, NOTE_COLORS.length);
    const previous = wrap(color - 1, NOTE_COLORS.length);

    // As quatro setas, e não só as horizontais: os quadradinhos ficam numa linha só, mas
    // quem navega por teclado não vê a disposição, e o papel aceita os dois eixos.
    const target: Record<string, number | undefined> = {
      ArrowRight: next,
      ArrowDown: next,
      ArrowLeft: previous,
      ArrowUp: previous,
      Home: 0,
      End: NOTE_COLORS.length - 1,
    };

    const destination = target[event.key];
    if (destination === undefined) return;

    // Sem isto a seta rola o quadro por baixo do seletor, e Home salta para o topo da página.
    event.preventDefault();
    selectColor(destination as NoteColor);
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Cor do post-it"
      className="flex items-center gap-1"
      data-testid="color-picker"
    >
      {NOTE_COLORS.map((_, index) => {
        const color = index as NoteColor;
        const selected = value === color;

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={noteColorLabel(color)}
            tabIndex={color === tabStop ? 0 : -1}
            onClick={() => onChange(color)}
            onKeyDown={(event) => handleKeyDown(event, color)}
            onFocus={() => setFocused(color)}
            className={`h-6 w-6 rounded-control border transition-shadow ${
              selected
                ? "border-selection ring-2 ring-selection"
                : "border-border hover:border-ink-muted"
            }`}
            style={{ backgroundColor: noteBackgroundColor(color) }}
            data-testid={`color-swatch-${color}`}
            data-selected={selected}
          />
        );
      })}
    </div>
  );
}
