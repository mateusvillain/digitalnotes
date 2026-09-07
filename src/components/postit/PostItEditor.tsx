"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { NOTE_MAX_TEXT_LENGTH } from "@/lib/board/types";
import { NOTE_TEXT_CLASS } from "./note-text";

interface PostItEditorProps {
  /** Texto inicial. O editor é não controlado: quem manda enquanto digita é o DOM. */
  initialText: string;
  /** Chamado ao sair da edição, com o texto final. Sair confirma; não existe descartar. */
  onCommit: (text: string) => void;
}

/**
 * Área de edição do post-it.
 *
 * É um `textarea` simples, de propósito: o PRD deixa formatação rica fora de escopo, e
 * texto puro é o que mantém a serialização na URL viável. Colar conteúdo formatado num
 * `textarea` já entrega texto puro — não há marcação a higienizar depois.
 *
 * O editor não é controlado por estado React. Digitar não deveria publicar na store a cada
 * tecla: quem escuta é a persistência, que reescreveria a URL letra por letra. O texto sobe
 * uma vez, ao terminar.
 *
 * **Só existe um caminho de saída: perder o foco.** O Escape não publica sozinho, ele tira
 * o foco e deixa o mesmo caminho publicar. Com dois caminhos seria preciso um cadeado para
 * não publicar duas vezes, e um cadeado que não se abre transforma a segunda edição em
 * silêncio — o texto sumiria sem erro.
 */
export function PostItEditor({ initialText, onCommit }: PostItEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (textarea === null) return;

    textarea.focus();
    // Cursor no fim, e não selecionando tudo: quem abre a edição quase sempre quer
    // continuar escrevendo, não substituir o que já está lá.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // Enquanto se digita, tecla é texto: Delete apaga caractere, não post-it (#19). Por
    // isso o evento para aqui, antes de chegar aos atalhos globais.
    //
    // Isto barra ouvinte de bolha, inclusive no documento, mas não ouvinte de captura: o
    // atalho global de #19 precisa, além disto, ignorar evento cujo alvo é campo editável.
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    // Enter não é tratado: num textarea ele já quebra linha, que é o que o PRD pede.
  }

  return (
    <textarea
      ref={ref}
      // As mesmas medidas de texto do post-it em leitura, vindas da mesma constante: sem
      // isso o conteúdo "pula" ao entrar em edição.
      className={`absolute inset-0 h-full w-full resize-none bg-transparent outline-none ${NOTE_TEXT_CLASS}`}
      defaultValue={initialText}
      maxLength={NOTE_MAX_TEXT_LENGTH}
      onKeyDown={handleKeyDown}
      onBlur={(event) => onCommit(event.currentTarget.value)}
      data-testid="post-it-editor"
      aria-label="Texto do post-it"
    />
  );
}
