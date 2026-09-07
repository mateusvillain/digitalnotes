"use client";

import { useCallback, useState } from "react";
import { IDENTITY_VIEWPORT, panBy, zoomByFactor, type Point, type Viewport } from "./coords";

/** Passo de zoom dos botões da interface: 25% por clique. */
export const ZOOM_STEP = 1.25;

/**
 * Ações de viewport expostas pelo hook.
 *
 * O nome evita colidir com o componente `ViewportControls`, que é a barra de botões.
 */
export interface ViewportApi {
  viewport: Viewport;
  /** Desloca em pixels de tela. */
  pan: (dx: number, dy: number) => void;
  /** Multiplica a escala ancorando no ponto dado (relativo ao container). */
  zoomBy: (factor: number, anchor: Point) => void;
  /** Volta para 100% na origem. */
  reset: () => void;
}

/**
 * Estado do viewport do quadro.
 *
 * Guarda pan e escala e nada mais: é estado de visualização, efêmero por decisão do PRD, e
 * por isso não é serializado na URL nem no autosave. Toda a matemática vem de `coords.ts`;
 * este hook só cuida do ciclo de vida em React.
 */
export function useViewport(initial: Viewport = IDENTITY_VIEWPORT): ViewportApi {
  const [viewport, setViewport] = useState<Viewport>(initial);

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((current) => panBy(current, dx, dy));
  }, []);

  const zoomBy = useCallback((factor: number, anchor: Point) => {
    setViewport((current) => zoomByFactor(current, factor, anchor));
  }, []);

  const reset = useCallback(() => {
    setViewport(IDENTITY_VIEWPORT);
  }, []);

  return { viewport, pan, zoomBy, reset };
}
