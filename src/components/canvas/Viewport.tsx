"use client";

import { useCallback, useRef, type PointerEvent, type ReactNode, type WheelEvent } from "react";
import { canvasToScreen, type Point, type Viewport as ViewportState } from "@/lib/canvas/coords";
import type { ViewportControls } from "@/lib/canvas/useViewport";

/** Espaçamento da malha de pontos a 100%, em pixels. Acompanha --canvas-dot-gap. */
const DOT_GAP = 24;

/**
 * Sensibilidade da roda. O `deltaY` do browser vem em unidades diferentes conforme o
 * dispositivo, então o passo é exponencial: cada unidade de rolagem multiplica a escala, o
 * que dá o mesmo comportamento em trackpad e em mouse de roda travada.
 */
const WHEEL_SENSITIVITY = 0.002;

interface ViewportProps extends ViewportControls {
  children?: ReactNode;
}

/**
 * Superfície navegável do quadro: arrastar o fundo faz pan, a roda faz zoom ancorado no
 * cursor.
 *
 * O conteúdo do canvas vive dentro de uma única camada transformada, e não de elementos
 * posicionados um a um: com dezenas de post-its, o browser compõe uma transform só em vez
 * de recalcular layout de cada elemento a cada quadro.
 */
export function Viewport({ viewport, pan, zoomBy, children }: ViewportProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const panPointerId = useRef<number | null>(null);

  /** Posição do ponteiro relativa ao canto do container — é o que as conversões esperam. */
  const localPoint = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    // Só o fundo arrasta o quadro. Um post-it (issue #15) para o evento antes daqui.
    if (event.target !== event.currentTarget) return;
    if (event.button !== 0) return;

    panPointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (panPointerId.current !== event.pointerId) return;
      pan(event.movementX, event.movementY);
    },
    [pan],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (panPointerId.current !== event.pointerId) return;
    panPointerId.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      zoomBy(Math.exp(-event.deltaY * WHEEL_SENSITIVITY), localPoint(event));
    },
    [zoomBy, localPoint],
  );

  const origin = canvasToScreen({ x: 0, y: 0 }, viewport);

  return (
    <div
      ref={surfaceRef}
      // O cursor muda por CSS, e não por estado: arrastar não precisa de re-render.
      className="whiteboard-surface absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      style={{
        // A malha acompanha o zoom e o pan, senão o fundo fica parado e o quadro parece
        // não se mexer.
        backgroundSize: `${DOT_GAP * viewport.scale}px ${DOT_GAP * viewport.scale}px`,
        backgroundPosition: `${origin.x}px ${origin.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      data-testid="viewport-surface"
    >
      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export type { ViewportState };
