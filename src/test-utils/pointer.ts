import { vi } from "vitest";

/**
 * Instala a API de captura de ponteiro, que o jsdom não implementa.
 *
 * Sem ela, `setPointerCapture` lança e derruba o handler inteiro — inclusive o que não tem
 * nada a ver com arrastar. Todo teste de gesto precisa disto.
 */
export function stubPointerCapture(element: Element): void {
  element.setPointerCapture = vi.fn();
  element.releasePointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => true);
}
