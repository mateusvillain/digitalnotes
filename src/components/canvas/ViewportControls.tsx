"use client";

import { useCallback } from "react";
import { MAX_SCALE, MIN_SCALE, scaleAsPercent, type Point } from "@/lib/canvas/coords";
import { ZOOM_STEP, type ViewportApi } from "@/lib/canvas/useViewport";
import { iconButtonClass } from "@/components/ui/iconButton";
import { Tooltip } from "@/components/ui/Tooltip";

interface ViewportControlsProps extends Pick<ViewportApi, "viewport" | "zoomBy" | "reset"> {
  /**
   * Ponto de ancoragem do zoom por botão — o centro da área visível. É função, e não um
   * ponto pronto, porque depende do tamanho atual do container: medir na hora do clique
   * evita guardar em estado uma medida que o resize invalida.
   */
  anchor: () => Point;
}

/** Controles de zoom e reset, para quem não tem roda de mouse ou prefere clicar. */
export function ViewportControls({ viewport, zoomBy, reset, anchor }: ViewportControlsProps) {
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP, anchor()), [zoomBy, anchor]);
  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP, anchor()), [zoomBy, anchor]);

  return (
    <div className="flex items-center gap-1">
      <Tooltip label="Diminuir zoom" side="top" align="start">
        <button
          type="button"
          className={iconButtonClass}
          onClick={zoomOut}
          disabled={viewport.scale <= MIN_SCALE}
          aria-label="Diminuir zoom"
        >
          −
        </button>
      </Tooltip>
      <Tooltip label="Voltar o zoom para 100%" side="top" align="center">
        <button
          type="button"
          className="rounded-control px-2 text-xs tabular-nums text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          onClick={reset}
          aria-label="Voltar o zoom para 100%"
        >
          {scaleAsPercent(viewport.scale)}%
        </button>
      </Tooltip>
      <Tooltip label="Aumentar zoom" side="top" align="end">
        <button
          type="button"
          className={iconButtonClass}
          onClick={zoomIn}
          disabled={viewport.scale >= MAX_SCALE}
          aria-label="Aumentar zoom"
        >
          +
        </button>
      </Tooltip>
    </div>
  );
}
