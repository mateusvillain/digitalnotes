"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { canvasToScreen, type Point } from "@/lib/canvas/coords";
import type { ViewportApi } from "@/lib/canvas/useViewport";

/**
 * Espaçamento da malha de pontos a 100%, em pixels.
 *
 * Mora aqui, e não no CSS, porque precisa ser multiplicado pela escala a cada quadro — o
 * `globals.css` lê este valor pela variável `--canvas-dot-gap` que o componente injeta.
 */
const DOT_GAP = 24;

/**
 * Sensibilidade da roda. O passo é exponencial: cada unidade de rolagem multiplica a
 * escala, o que dá a mesma sensação em trackpad e em mouse de roda travada.
 */
const WHEEL_SENSITIVITY = 0.002;

/** Pixels equivalentes a uma unidade de `deltaY` em cada modo de rolagem do browser. */
const DELTA_MODE_TO_PIXELS = { line: 16, page: 100 } as const;

type ViewportProps = Pick<ViewportApi, "viewport" | "pan" | "zoomBy"> & {
  children?: ReactNode;
};

/**
 * Converte o `deltaY` da roda para pixels.
 *
 * O Firefox reporta rolagem em linhas e alguns dispositivos em páginas; sem normalizar, o
 * mesmo gesto daria um zoom dezenas de vezes menor nesses casos.
 */
function wheelDeltaInPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * DELTA_MODE_TO_PIXELS.line;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * DELTA_MODE_TO_PIXELS.page;
  }
  return event.deltaY;
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
  const layerRef = useRef<HTMLDivElement>(null);
  const panPointerId = useRef<number | null>(null);
  /** Última posição do ponteiro, em coordenadas de tela. */
  const lastPointer = useRef<Point>({ x: 0, y: 0 });

  /** Posição do ponteiro relativa ao canto do container — é o que as conversões esperam. */
  const localPoint = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  }, []);

  /**
   * Zoom pela roda.
   *
   * Precisa de listener nativo não passivo: o `onWheel` do React é registrado de forma
   * passiva na raiz, onde `preventDefault` não tem efeito. Sem isso, ctrl+roda e o pinch do
   * trackpad — que chegam como wheel com `ctrlKey` — dariam zoom no quadro **e** na página
   * ao mesmo tempo.
   */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(Math.exp(-wheelDeltaInPixels(event) * WHEEL_SENSITIVITY), localPoint(event));
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, [zoomBy, localPoint]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    // Arrasta o quadro pelo fundo ou pela camada do canvas; um post-it (issue #15) para o
    // evento antes de chegar aqui.
    const target = event.target;
    if (target !== event.currentTarget && target !== layerRef.current) return;
    if (event.button !== 0) return;

    panPointerId.current = event.pointerId;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (panPointerId.current !== event.pointerId) return;

      // Diferença de clientX/Y, e não movementX/Y: este é o mesmo sistema de coordenadas
      // usado nas conversões, não muda com o zoom da página e não fica indefinido em
      // browsers que não implementam movement em eventos de ponteiro.
      pan(event.clientX - lastPointer.current.x, event.clientY - lastPointer.current.y);
      lastPointer.current = { x: event.clientX, y: event.clientY };
    },
    [pan],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (panPointerId.current !== event.pointerId) return;

    panPointerId.current = null;
    // Depois de um pointercancel o ponteiro já não está ativo, e soltar a captura de um id
    // inativo lança.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const origin = canvasToScreen({ x: 0, y: 0 }, viewport);

  return (
    <div
      ref={surfaceRef}
      // O cursor muda por CSS, e não por estado: arrastar não precisa de re-render.
      className="whiteboard-surface absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      style={
        {
          // A malha acompanha o zoom e o pan, senão o fundo fica parado e o quadro parece
          // não se mexer.
          "--canvas-dot-gap": `${DOT_GAP * viewport.scale}px`,
          backgroundPosition: `${origin.x}px ${origin.y}px`,
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-testid="viewport-surface"
    >
      <div
        ref={layerRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
        data-testid="viewport-layer"
      >
        {children}
      </div>
    </div>
  );
}
