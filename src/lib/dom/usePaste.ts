"use client";

import { useEffect, useRef } from "react";
import { isEditableTarget } from "@/lib/dom/target";

/**
 * Colar no quadro, pelo evento nativo de `paste` (#88).
 *
 * Pelo evento, e não por `navigator.clipboard.readText()`: a leitura programática do
 * clipboard não existe no Firefox e, onde existe, pede permissão. O evento `paste` funciona
 * em todo navegador, sem permissão nenhuma, porque quem autorizou foi a própria pessoa ao
 * apertar as teclas — o conteúdo chega dentro do evento, e só naquele instante.
 *
 * É também por isso que colar não mora no `useKeyboardShortcuts` junto dos outros atalhos:
 * `Ctrl+V` visto como tecla não traz o que há na área de transferência. O par assimétrico —
 * copiar pelo teclado, colar pelo evento — é uma consequência do navegador, e não uma
 * escolha de arquitetura.
 *
 * `onPaste` devolve se consumiu o conteúdo. Só então o evento é engolido: um texto que não
 * é recorte deste quadro continua sendo do navegador, que não fará nada com ele — mas
 * engolir o que não se entendeu é prometer um tratamento que não houve.
 */
export function usePaste(onPaste: (text: string) => boolean): void {
  // Lido por ref pelo mesmo motivo dos atalhos de teclado: um `onPaste` recriado a cada
  // render faria o efeito remover e registrar o ouvinte no documento a cada quadro.
  const handler = useRef(onPaste);
  useEffect(() => {
    handler.current = onPaste;
  }, [onPaste]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent): void {
      // Dentro de um post-it, colar é do texto. É a mesma guarda de `Ctrl+A` e `Ctrl+Z`, e
      // aqui ela é ainda mais literal: quem está escrevendo quer o texto na frase, não um
      // post-it novo no quadro.
      if (isEditableTarget(event.target)) return;

      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text === "") return;

      if (handler.current(text)) event.preventDefault();
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);
}
