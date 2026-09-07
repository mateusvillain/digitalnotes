"use client";

import { useRef, type KeyboardEvent } from "react";
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
 * É um `radiogroup`, e não uma fila de botões: a pergunta é "qual destas seis", exatamente
 * o que o papel descreve. Um leitor de tela anuncia "1 de 6" e o estado marcado sem que
 * seja preciso inventar rótulo para isso.
 *
 * Por ser um radiogroup, a navegação é a que o papel exige: **um só** ponto de parada de Tab
 * para o grupo inteiro, e as setas andando entre as cores. Uma fila de seis botões
 * tabuláveis obrigaria a passar por todas as cores para sair do seletor.
 *
 * Não sabe nada sobre post-it nem sobre seleção: recebe a cor marcada e avisa quando outra
 * foi escolhida. É o que o deixa testável sem um quadro em volta.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  /**
   * Onde o Tab entra no grupo.
   *
   * Sem cor marcada — seleção de cores diferentes — o ponto de parada é o primeiro item, ou
   * o grupo inteiro ficaria fora da ordem de tabulação e inalcançável pelo teclado.
   */
  const tabStop = value ?? 0;

  /** Move o foco e já escolhe a cor: num radiogroup, andar com a seta é escolher. */
  function focusColor(color: NoteColor): void {
    const radios = groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[color]?.focus();
    onChange(color);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, color: NoteColor): void {
    const last = NOTE_COLORS.length - 1;

    // As quatro setas, e não só as horizontais: os quadradinhos ficam numa linha só, mas
    // quem navega por teclado não vê a disposição, e o papel aceita os dois eixos.
    const destino: Record<string, number | undefined> = {
      ArrowRight: wrap(color + 1, NOTE_COLORS.length),
      ArrowDown: wrap(color + 1, NOTE_COLORS.length),
      ArrowLeft: wrap(color - 1, NOTE_COLORS.length),
      ArrowUp: wrap(color - 1, NOTE_COLORS.length),
      Home: 0,
      End: last,
    };

    const proximo = destino[event.key];
    if (proximo !== undefined) {
      // Sem isto a seta rola o quadro por baixo do seletor, e Home salta para o topo.
      event.preventDefault();
      focusColor(proximo as NoteColor);
      return;
    }

    // Espaço escolhe sem mover, para quem chegou ao grupo pelo Tab e não quer andar.
    if (event.key === " ") {
      event.preventDefault();
      onChange(color);
    }
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
          <div
            key={color}
            role="radio"
            aria-checked={selected}
            aria-label={noteColorLabel(color)}
            tabIndex={color === tabStop ? 0 : -1}
            // O clique escolhe, mas não leva o foco junto: o ponteiro já disse o que queria,
            // e mover o foco daqui roubaria o cursor de quem está escrevendo num post-it.
            onClick={() => onChange(color)}
            onKeyDown={(event) => handleKeyDown(event, color)}
            className={`h-6 w-6 cursor-pointer rounded-control border transition-shadow ${
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
