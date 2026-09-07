"use client";

import { useCallback, useState } from "react";
import {
  IDENTITY_VIEWPORT,
  panBy,
  zoomAt,
  zoomByFactor,
  type Point,
  type Viewport,
} from "./coords";

/** Passo de zoom dos botões da interface: 25% por clique. */
export const ZOOM_STEP = 1.25;

export interface ViewportControls {
  viewport: Viewport;
  /** Desloca em pixels de tela. */
  pan: (dx: number, dy: number) => void;
  /** Define a escala ancorando no ponto dado (relativo ao container). */
  zoomTo: (scale: number, anchor: Point) => void;
  /** Multiplica a escala ancorando no ponto dado. */
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
export function useViewport(initial: Viewport = IDENTITY_VIEWPORT): ViewportControls {
  const [viewport, setViewport] = useState<Viewport>(initial);

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((current) => panBy(current, dx, dy));
  }, []);

  const zoomTo = useCallback((scale: number, anchor: Point) => {
    setViewport((current) => zoomAt(current, scale, anchor));
  }, []);

  const zoomBy = useCallback((factor: number, anchor: Point) => {
    setViewport((current) => zoomByFactor(current, factor, anchor));
  }, []);

  const reset = useCallback(() => {
    setViewport(IDENTITY_VIEWPORT);
  }, []);

  return { viewport, pan, zoomTo, zoomBy, reset };
}
