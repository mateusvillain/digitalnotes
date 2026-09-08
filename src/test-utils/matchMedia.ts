import { vi } from "vitest";

/**
 * Simula o `matchMedia` do navegador, guardando quem escuta para a resposta poder mudar.
 *
 * O jsdom não implementa consultas de mídia, e o comportamento que importa aqui é
 * justamente a mudança — conectar um trackpad a um tablet troca a resposta sem recarregar.
 */
export function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  let current = matches;

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: current,
      media: query,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  );

  return {
    /** O aparelho mudou — um trackpad foi conectado, por exemplo. */
    change(next: boolean) {
      current = next;
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.size,
  };
}
