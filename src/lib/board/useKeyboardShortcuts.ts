"use client";

import { useEffect, useRef } from "react";

interface KeyboardShortcutsOptions {
  /** Apagar o que está marcado. Não recebe nada: quem sabe o que está marcado é quem trata. */
  onDelete: () => void;
}

/**
 * Teclas que apagam a seleção.
 *
 * Duas, e não só `Delete`: no teclado do Mac a tecla escrita "delete" emite `Backspace`, e
 * um atalho que só ouvisse `Delete` seria inalcançável na maior parte dos laptops.
 */
const DELETE_KEYS = new Set(["Delete", "Backspace"]);

/**
 * O alvo do evento aceita digitação.
 *
 * A pergunta é sobre o **alvo**, e não sobre o estado do quadro: o atalho é global e ouve o
 * documento inteiro, então precisa se calar diante de qualquer campo editável — o editor do
 * post-it, mas também um `input` que ainda vá existir numa barra de busca ou num diálogo.
 * Perguntar só ao board se há alguém em edição responderia por um campo e ignoraria todos os
 * outros.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  // `isContentEditable` cobre o elemento herdando a propriedade de um ancestral, que é como
  // um editor rico normalmente marca a área de escrita.
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Atalhos de teclado do quadro.
 *
 * O ouvinte mora no `document`, e não num nó do quadro: apagar é uma ação sobre a seleção, e
 * a seleção continua existindo com o foco em qualquer lugar da página — inclusive no
 * `body`, que é onde ele fica depois de um clique no fundo.
 *
 * Em **captura**, e não em bolha. O editor do post-it já para o evento na bolha, o que
 * bastaria para ele; mas depender disso deixaria a guarda espalhada, com cada campo de texto
 * futuro tendo de lembrar de parar o evento para não ser apagado enquanto se digita nele. Na
 * captura o atalho vê todo evento e decide sozinho, olhando o alvo.
 */
export function useKeyboardShortcuts({ onDelete }: KeyboardShortcutsOptions): void {
  /**
   * O tratador atual, lido por ref dentro do ouvinte.
   *
   * Sem isto, um `onDelete` recriado a cada render faria o efeito remover e registrar o
   * ouvinte no documento a cada quadro do arraste.
   */
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!DELETE_KEYS.has(event.key)) return;
      if (isEditableTarget(event.target)) return;

      // No Mac, Backspace fora de um campo é "voltar" no histórico em navegadores antigos.
      event.preventDefault();
      onDeleteRef.current();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
