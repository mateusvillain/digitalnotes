"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { lastInputWasKeyboard, trackInputModality } from "@/lib/dom/inputModality";

/**
 * Espera antes de abrir.
 *
 * Curta o bastante para responder a quem parou o cursor sobre o botão, longa o bastante
 * para não piscar uma caixa a cada vez que o ponteiro atravessa a fileira de controles a
 * caminho do quadro.
 */
export const TOOLTIP_DELAY_MS = 300;

interface TooltipProps {
  /** O texto mostrado. É o mesmo `aria-label` do gatilho, e não uma segunda descrição. */
  label: string;
  /** De que lado do gatilho a caixa aparece. */
  side?: "top" | "bottom";
  /** O botão que dispara o tooltip. */
  children: ReactNode;
}

/**
 * Tooltip dos controles que só têm ícone (issue #56).
 *
 * A interface não tem rótulos escritos: os controles são quadrados de 32px com um desenho
 * dentro. Quem já usou reconhece; quem abriu agora só descobre clicando — e um dos botões
 * manda o board para fora da máquina, o que é caro de descobrir assim.
 *
 * Não usa o `title` nativo porque ele demora cerca de um segundo, não é estilizável e é
 * ignorado no toque. Aqui a caixa também aparece no foco por teclado, que o `title` nunca
 * mostra.
 *
 * O texto **não** é anunciado por leitor de tela: ele repete o `aria-label` do botão, e
 * descrevê-lo de novo faria a mesma frase ser lida duas vezes. É ajuda visual, e a versão
 * sonora dela já existe.
 */
export function Tooltip({ label, side = "bottom", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => trackInputModality(), []);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);

  const scheduleOpen = useCallback((event: PointerEvent) => {
    // Só ponteiros que de fato pairam. No toque não existe "passar o cursor": o
    // `pointerenter` chega junto com o toque, e a caixa apareceria por cima do que a pessoa
    // acabou de tocar. Lista do que vale, e não do que não vale, para um tipo de ponteiro
    // novo não abrir a caixa por descuido.
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;

    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), TOOLTIP_DELAY_MS);
  }, []);

  const openIfKeyboard = useCallback(() => {
    // Tocar e clicar também dão foco ao botão. Sem olhar de onde o gesto veio, o toque
    // abriria a caixa sobre o que acabou de ser tocado, e o clique a deixaria aberta depois
    // de o botão já ter agido.
    if (!lastInputWasKeyboard()) return;

    clearTimeout(timer.current);
    setOpen(true);
  }, []);

  // O timer pendente morre com o componente: sem isto, um botão desmontado logo depois do
  // hover abriria uma caixa sobre uma árvore que não existe mais.
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancel, open]);

  return (
    /*
      Os ouvintes moram no invólucro, e não no próprio gatilho: assim o tooltip nunca
      substitui um handler que o botão já tinha. `pointerenter`/`pointerleave` valem para a
      área inteira, e `onFocus`/`onBlur` do React chegam aqui porque ele os implementa sobre
      `focusin`/`focusout`, que sobem na árvore.
    */
    <span
      className="relative inline-flex"
      onPointerEnter={scheduleOpen}
      onPointerLeave={cancel}
      onFocus={openIfKeyboard}
      onBlur={cancel}
    >
      {children}
      {open ? (
        <span
          // `presentation` porque a informação já chega pelo `aria-label` do botão: sem
          // isso, o leitor de tela leria a mesma frase duas vezes.
          role="presentation"
          className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink shadow-control ${
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
