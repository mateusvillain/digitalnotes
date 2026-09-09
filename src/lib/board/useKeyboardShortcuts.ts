"use client";

import { useEffect, useRef } from "react";
import { isEditableTarget } from "@/lib/dom/target";

interface KeyboardShortcutsOptions {
  /** Apagar o que está marcado. Não recebe nada: quem sabe o que está marcado é quem trata. */
  onDelete: () => void;
  /**
   * `N`: entrar e sair do modo de colocação de nota (#73).
   *
   * Deixou de criar o post-it na hora. `N` agora arma a colocação, e é o clique seguinte
   * que diz onde a nota fica — a mesma precisão que o duplo clique sempre teve, agora
   * disponível para quem está no teclado. Como o lápis, a mesma tecla liga e desliga.
   */
  onPlaceNote: () => void;
  /** Salvar o quadro — a mesma ação do botão, num atalho que todo mundo já tem no dedo. */
  onSave: () => void;
  /** Ligar e desligar o modo lápis (#68). A mesma tecla faz as duas coisas. */
  onTogglePencil: () => void;
  /**
   * `V`: escolher a ferramenta de seleção (#83).
   *
   * Escolher, e não alternar. A seleção é a ferramenta de partida do quadro, e ela não tem
   * para onde ser desligada — `V` sobre ela já ativa não faz nada.
   */
  onSelectTool: () => void;
  /**
   * `Esc`: largar a ferramenta em curso.
   *
   * Genérico de propósito. `Esc` significa "sai disso", e quem sabe do que se está saindo é
   * o quadro — o lápis e a colocação de nota, hoje —, e o que vier depois entra no mesmo
   * lugar em vez de pendurar um segundo ouvinte de teclado na mesma tecla.
   */
  onCancel: () => void;
}

/**
 * Teclas que apagam a seleção.
 *
 * Duas, e não só `Delete`: no teclado do Mac a tecla escrita "delete" emite `Backspace`, e
 * um atalho que só ouvisse `Delete` seria inalcançável na maior parte dos laptops.
 */
const DELETE_KEYS = new Set(["Delete", "Backspace"]);

/** A tecla veio sozinha, sem nenhum modificador segurado junto. */
function isBareKey(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey;
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
export function useKeyboardShortcuts({
  onDelete,
  onPlaceNote,
  onSave,
  onTogglePencil,
  onSelectTool,
  onCancel,
}: KeyboardShortcutsOptions): void {
  /**
   * Os tratadores atuais, lidos por ref dentro do ouvinte.
   *
   * Sem isto, um `onDelete` recriado a cada render faria o efeito remover e registrar o
   * ouvinte no documento a cada quadro do arraste.
   */
  const handlers = useRef({
    onDelete,
    onPlaceNote,
    onSave,
    onTogglePencil,
    onSelectTool,
    onCancel,
  });
  useEffect(() => {
    handlers.current = { onDelete, onPlaceNote, onSave, onTogglePencil, onSelectTool, onCancel };
  }, [onDelete, onPlaceNote, onSave, onTogglePencil, onSelectTool, onCancel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      /**
       * Salvar é o único atalho que também vale com o cursor dentro de um post-it.
       *
       * Quem aperta `Ctrl+S` no meio de uma frase está salvando o quadro, não pedindo a
       * caixa de "salvar página" do navegador — e é justamente escrevendo que se tem mais a
       * perder. O `preventDefault` é o ponto do atalho: sem ele o navegador abre a caixa
       * dele por cima, e o quadro seria salvo com um diálogo de download na frente.
       */
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && !event.altKey) {
        event.preventDefault();
        handlers.current.onSave();
        return;
      }

      // Daqui para baixo, tudo é atalho de tecla nua. Com um modificador segurado a tecla
      // pertence ao navegador ou ao sistema — `Ctrl+N` abre uma janela, e roubá-la seria
      // pior do que não ter atalho.
      if (!isBareKey(event)) return;
      if (isEditableTarget(event.target)) return;

      if (DELETE_KEYS.has(event.key)) {
        // Sempre, e não só quando algo foi apagado: fora de um campo de texto, Backspace é
        // "voltar" no histórico em navegadores antigos, e sair do quadro sem querer é pior do
        // que engolir uma tecla que não fez nada. Dentro de um campo o `return` acima já
        // devolveu a tecla a quem estava digitando.
        event.preventDefault();
        handlers.current.onDelete();
        return;
      }

      // `toLowerCase` porque com Shift a tecla chega como `N`, e quem segurou Shift sem
      // querer não deveria ficar sem o atalho.
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        handlers.current.onPlaceNote();
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        handlers.current.onTogglePencil();
        return;
      }

      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        handlers.current.onSelectTool();
        return;
      }

      // Sem `preventDefault`: `Esc` é a tecla de "sai disso" do navegador inteiro, e engoli-la
      // aqui tiraria de quem não tem modo nenhum ligado o que ela já fazia — fechar um
      // diálogo, interromper um carregamento.
      if (event.key === "Escape") handlers.current.onCancel();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
