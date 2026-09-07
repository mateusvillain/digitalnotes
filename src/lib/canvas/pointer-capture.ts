import type { PointerEvent } from "react";

/**
 * Solta a captura do ponteiro, se ela ainda existir.
 *
 * Depois de um `pointercancel` o ponteiro já não está ativo, e soltar a captura de um id
 * inativo lança. Todo gesto capturado precisa disto ao terminar.
 */
export function releaseCapture(event: PointerEvent<Element>): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}
