"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Diz se o teclado desta máquina usa `⌘` no lugar de `Ctrl`.
 *
 * Só a dica de atalho precisa saber: o próprio atalho aceita as duas teclas, porque um
 * navegador desconhecido num sistema desconhecido continua tendo uma delas. O que muda
 * aqui é o que está **escrito** na tela — mostrar "Ctrl" a quem tem um Mac ensina o atalho
 * errado, e é a metade dos visitantes de um produto assim.
 *
 * Lido por `useSyncExternalStore` para não quebrar a hidratação: o servidor não tem
 * `navigator`, então ele responde `false`, e a troca acontece depois que o React casa o
 * HTML do servidor com o do cliente. Sem isso, o React acusaria diferença entre os dois.
 */
export function useIsMac(): boolean {
  const subscribe = useCallback(() => () => {}, []);

  const getSnapshot = useCallback(() => {
    if (typeof navigator === "undefined") return false;

    // `platform` está obsoleto mas continua sendo o dado mais direto; o `userAgent` cobre
    // os navegadores que já o esvaziaram. Um iPad reporta "MacIntel" aqui, e acerta: com
    // teclado acoplado ele também usa ⌘.
    return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
