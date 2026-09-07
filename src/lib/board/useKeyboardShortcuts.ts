"use client";

import { useEffect, useRef } from "react";
import { isEditableTarget } from "@/lib/dom/target";

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

      // Sempre, e não só quando algo foi apagado: fora de um campo de texto, Backspace é
      // "voltar" no histórico em navegadores antigos, e sair do quadro sem querer é pior do
      // que engolir uma tecla que não fez nada. Dentro de um campo o `return` acima já
      // devolveu a tecla a quem estava digitando.
      event.preventDefault();
      onDeleteRef.current();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
