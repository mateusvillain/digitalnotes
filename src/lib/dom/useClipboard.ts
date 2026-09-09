"use client";

import { useEffect, useRef } from "react";
import { isEditableTarget } from "@/lib/dom/target";

/**
 * Copiar a seleção, pelo evento nativo de `copy` (#88).
 *
 * Este é o caminho que **funciona**, e a primeira tentativa não era ele: copiar chamava
 * `navigator.clipboard.writeText()` de dentro do `keydown`. Duas coisas quebram essa versão,
 * e as duas são invisíveis porque copiar não tem retorno na tela.
 *
 * A primeira é o relógio. `writeText` é assíncrono, e o navegador segue com a operação de
 * cópia **dele** no mesmo gesto: o que a gente escreveu pode ser sobrescrito depois, pela
 * cópia nativa de uma seleção de texto que não existe. A segunda é o Safari, que exige que a
 * escrita aconteça de forma síncrona dentro do gesto e recusa a promessa fora dele.
 *
 * Aqui não há relógio nem permissão: `setData` é síncrono, acontece dentro do evento que o
 * navegador já abriu para isso, e o `preventDefault` substitui a cópia nativa em vez de
 * disputar com ela.
 *
 * `onCopy` devolve `null` quando não há nada marcado. Aí o evento segue intacto: um `Ctrl+C`
 * no vazio não pode apagar o que a pessoa tinha copiado de outro programa.
 */
export function useCopy(onCopy: () => string | null): void {
  const handler = useRef(onCopy);
  useEffect(() => {
    handler.current = onCopy;
  }, [onCopy]);

  useEffect(() => {
    function handleCopy(event: ClipboardEvent): void {
      // Dentro de um post-it, copiar é do texto.
      if (isEditableTarget(event.target)) return;

      const text = handler.current();
      if (text === null) return;

      event.clipboardData?.setData("text/plain", text);
      event.preventDefault();
    }

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);
}

/**
 * Colar no quadro, pelo evento nativo de `paste` (#88).
 *
 * Pelo evento, e não por `navigator.clipboard.readText()`: a leitura programática do
 * clipboard não existe no Firefox e, onde existe, pede permissão. O evento `paste` funciona
 * em todo navegador, sem permissão nenhuma, porque quem autorizou foi a própria pessoa ao
 * apertar as teclas — o conteúdo chega dentro do evento, e só naquele instante.
 *
 * É também por isso que colar não mora no `useKeyboardShortcuts` junto dos outros atalhos:
 * `Ctrl+V` visto como tecla não traz o que há na área de transferência. Copiar acabou no
 * mesmo lugar, por razão diferente — ver {@link useCopy} —, e o par ficou simétrico: os dois
 * são eventos de área de transferência, e não atalhos de teclado.
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
