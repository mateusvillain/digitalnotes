"use client";

import { useCallback } from "react";
import { MAX_SCALE, MIN_SCALE, scaleAsPercent, type Point } from "@/lib/canvas/coords";
import { ZOOM_STEP, type ViewportControls as Controls } from "@/lib/canvas/useViewport";

interface ViewportControlsProps extends Pick<Controls, "viewport" | "zoomBy" | "reset"> {
  /**
   * Ponto de ancoragem do zoom por botão — o centro da área visível. É função, e não um
   * ponto pronto, porque depende do tamanho atual do container: medir na hora do clique
   * evita guardar em estado uma medida que o resize invalida.
   */
  anchor: () => Point;
}

const buttonClass =
  "flex h-8 w-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/** Controles de zoom e reset, para quem não tem roda de mouse ou prefere clicar. */
export function ViewportControls({ viewport, zoomBy, reset, anchor }: ViewportControlsProps) {
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP, anchor()), [zoomBy, anchor]);
  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP, anchor()), [zoomBy, anchor]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={buttonClass}
        onClick={zoomOut}
        disabled={viewport.scale <= MIN_SCALE}
        aria-label="Diminuir zoom"
      >
        −
      </button>
      <button
        type="button"
        className="rounded-control px-2 text-xs tabular-nums text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
        onClick={reset}
        aria-label="Voltar o zoom para 100%"
      >
        {scaleAsPercent(viewport.scale)}%
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={zoomIn}
        disabled={viewport.scale >= MAX_SCALE}
        aria-label="Aumentar zoom"
      >
        +
      </button>
    </div>
  );
}
