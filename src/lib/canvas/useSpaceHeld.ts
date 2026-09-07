"use client";

import { useEffect, useState } from "react";
import { isInteractiveTarget } from "@/lib/dom/target";

/**
 * A barra de espaço está segurada, fora de um campo ou controle.
 *
 * É o modificador que transforma arrastar em navegar: sem ele, arrastar o fundo desenha o
 * retângulo de seleção. Segurar espaço é a convenção que as ferramentas de quadro usam
 * justamente porque os dois gestos disputam o mesmo botão do mouse.
 *
 * Ouve o documento, e não um nó do quadro: o modificador vale com o foco em qualquer lugar
 * da página — inclusive no `body`, que é onde ele fica depois de um clique no fundo.
 *
 * Ignora o espaço nascido num campo de texto ou num controle que já o usa para ativar:
 * botões, rádios do seletor de cor e o próprio post-it, que se seleciona com espaço desde a
 * #17. Sem essa guarda, selecionar um post-it pelo teclado passaria a armar o pan.
 */
export function useSpaceHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== " " || event.repeat) return;
      if (isInteractiveTarget(event.target)) return;

      // Sem isto o espaço rola a página por baixo do quadro.
      event.preventDefault();
      setHeld(true);
    }

    function handleKeyUp(event: KeyboardEvent): void {
      if (event.key === " ") setHeld(false);
    }

    /**
     * Trocar de janela solta o modificador.
     *
     * O `keyup` acontece na outra janela e nunca chega aqui. Sem isto, voltar para a aba
     * encontraria o quadro preso em modo de navegação, e arrastar não selecionaria mais.
     */
    function handleBlur(): void {
      setHeld(false);
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return held;
}
