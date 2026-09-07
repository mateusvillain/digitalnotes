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
 * Enquanto não existem post-its (Epic de ciclo de vida), o conteúdo do canvas é só a marca
 * da origem, que serve para enxergar pan e zoom funcionando.
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
        <Viewport {...controls}>
          <div className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-muted" />
        </Viewport>
      </div>
    </AppShell>
  );
}
