"use client";

import { useCallback, useRef } from "react";
import { Viewport } from "./Viewport";
import { ViewportControls } from "./ViewportControls";
import type { Point } from "@/lib/canvas/coords";
import { useViewport } from "@/lib/canvas/useViewport";
import { AppShell } from "@/components/shell/AppShell";

/**
 * O quadro: junta o estado de viewport à superfície navegável e aos controles.
 *
 * O canvas ainda não tem conteúdo — os post-its chegam na Epic de ciclo de vida. Pan e zoom
 * já se enxergam pela malha de pontos, que acompanha o viewport.
 */
export function Whiteboard() {
  const controls = useViewport();
  const areaRef = useRef<HTMLDivElement>(null);

  /** Centro da área visível, usado como âncora do zoom por botão. */
  const center = useCallback((): Point => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (rect === undefined) return { x: 0, y: 0 };
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  return (
    <AppShell
      controls={
        <ViewportControls
          viewport={controls.viewport}
          zoomBy={controls.zoomBy}
          reset={controls.reset}
          anchor={center}
        />
      }
    >
      <div ref={areaRef} className="absolute inset-0">
        <Viewport viewport={controls.viewport} pan={controls.pan} zoomBy={controls.zoomBy} />
      </div>
    </AppShell>
  );
}
