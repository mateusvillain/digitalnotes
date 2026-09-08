"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Consulta que descreve um aparelho cuja entrada principal é o toque. */
const COARSE_QUERY = "(hover: none) and (pointer: coarse)";

/**
 * Diz se a entrada principal do aparelho é o toque (issue #57).
 *
 * As duas condições juntas, e não a largura da tela: um notebook com janela estreita
 * continua tendo mouse, e um tablet com teclado e trackpad acoplados deixa de ser "só
 * toque" no momento em que o trackpad aparece — a consulta acompanha essa mudança sozinha.
 *
 * Lido por `useSyncExternalStore` porque é exatamente isso: um estado que mora fora do
 * React e muda por conta própria. No servidor a resposta é `false`, porque não há aparelho
 * para perguntar e esconder controles de quem tem mouse seria o erro mais caro dos dois.
 */
export function useTouchPrimary(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};

    const query = window.matchMedia(COARSE_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia(COARSE_QUERY).matches;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
