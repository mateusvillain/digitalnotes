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

/**
 * Avisa quem estiver arrastando com este ponteiro que o gesto foi tomado por outro.
 *
 * A pinça (#57) nasce quando um segundo dedo encosta, e o primeiro pode já estar arrastando
 * um post-it. Sem este aviso a nota continuaria andando enquanto a pessoa acha que só está
 * dando zoom — quem escuta `pointercancel` (o arraste do post-it, por exemplo) desfaz o
 * gesto sozinho ao receber isto.
 */
export function cancelPointerGesture(surface: Element, pointerId: number | undefined): void {
  if (pointerId === undefined) return;

  if (surface.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
  surface.dispatchEvent(new PointerEvent("pointercancel", { pointerId, bubbles: true }));
}
