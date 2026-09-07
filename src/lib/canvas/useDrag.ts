"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { CLICK_SLOP, distance, type Point } from "./coords";

interface UseDragOptions {
  /** Primeiro movimento além da folga: aqui o gesto deixou de ser um clique. */
  onStart?: () => void;
  /** Deslocamento desde a origem, em pixels de tela. */
  onMove: (delta: Point) => void;
  /** Deslocamento final, em pixels de tela. Só chega se o arrasto chegou a começar. */
  onEnd: (delta: Point) => void;
  /** Gesto interrompido pelo sistema: desfazer, não confirmar. */
  onCancel?: () => void;
  /** Enquanto verdadeiro, o elemento não arrasta. */
  disabled?: boolean;
}

/** Handlers para espalhar no elemento que se quer arrastar. */
export interface DragHandlers {
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerMove: (event: PointerEvent<Element>) => void;
  onPointerUp: (event: PointerEvent<Element>) => void;
  onPointerCancel: (event: PointerEvent<Element>) => void;
}

interface DragState {
  pointerId: number;
  origin: Point;
  /** Falso até o ponteiro passar da folga: antes disso o gesto ainda pode ser um clique. */
  started: boolean;
}

/**
 * Arrastar um elemento com o ponteiro.
 *
 * Reporta **pixels de tela**, e de propósito: converter para o canvas exige saber o zoom, e
 * o zoom é do viewport. Um hook que dividisse pela escala precisaria dela como parâmetro e
 * deixaria de servir a qualquer coisa fora do quadro.
 *
 * O deslocamento é sempre medido desde a origem do gesto, e não somando passos: além de
 * evitar acúmulo de erro, é o que faz um arrasto lento ser reconhecido como arrasto.
 *
 * Nada acontece antes de o ponteiro passar da folga. Sem isso, a mão que treme ao clicar
 * moveria o post-it um pixel e gravaria essa posição na store.
 */
export function useDrag({
  onStart,
  onMove,
  onEnd,
  onCancel,
  disabled,
}: UseDragOptions): DragHandlers {
  const state = useRef<DragState | null>(null);

  const deltaFrom = useCallback((event: PointerEvent<Element>, origin: Point): Point => {
    return { x: event.clientX - origin.x, y: event.clientY - origin.y };
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      if (disabled === true || event.button !== 0) return;

      // Captura no elemento: o ponteiro pode sair de cima dele no meio do arrasto, e sem
      // captura os eventos passariam a chegar em quem estiver embaixo do cursor.
      event.currentTarget.setPointerCapture(event.pointerId);
      state.current = {
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        started: false,
      };
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<Element>) => {
      const current = state.current;
      if (current === null || current.pointerId !== event.pointerId) return;

      const delta = deltaFrom(event, current.origin);
      if (!current.started) {
        if (distance({ x: 0, y: 0 }, delta) <= CLICK_SLOP) return;
        current.started = true;
        onStart?.();
      }

      onMove(delta);
    },
    [deltaFrom, onMove, onStart],
  );

  /** Encerra o gesto e devolve o estado que ele tinha, ou `null` se não era deste ponteiro. */
  const finish = useCallback((event: PointerEvent<Element>): DragState | null => {
    const current = state.current;
    if (current === null || current.pointerId !== event.pointerId) return null;

    state.current = null;
    // Depois de um pointercancel o ponteiro já não está ativo, e soltar a captura de um id
    // inativo lança.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    return current;
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent<Element>) => {
      const current = finish(event);
      if (current === null || !current.started) return;

      onEnd(deltaFrom(event, current.origin));
    },
    [deltaFrom, finish, onEnd],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<Element>) => {
      const current = finish(event);
      if (current === null || !current.started) return;

      onCancel?.();
    },
    [finish, onCancel],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}
