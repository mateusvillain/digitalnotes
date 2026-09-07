"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { NOTE_MAX_TEXT_LENGTH } from "@/lib/board/types";

interface PostItEditorProps {
  /** Texto inicial. O editor é não controlado: quem manda enquanto digita é o DOM. */
  initialText: string;
  /** Chamado ao sair da edição, com o texto final. */
  onFinish: (text: string) => void;
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
 */
export function PostItEditor({ initialText, onFinish }: PostItEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  /** Escape publica e o blur do desmonte publicaria de novo: o texto sobe uma vez só. */
  const finished = useRef(false);

  useEffect(() => {
    const textarea = ref.current;
    if (textarea === null) return;

    textarea.focus();
    // Cursor no fim, e não selecionando tudo: quem abre a edição quase sempre quer
    // continuar escrevendo, não substituir o que já está lá.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function finish(): void {
    if (finished.current) return;
    finished.current = true;
    onFinish(ref.current?.value ?? initialText);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // Enquanto se digita, tecla é texto: Delete apaga caractere, não post-it (#19). Por
    // isso o evento para aqui, antes de chegar aos atalhos globais.
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
    // Enter não é tratado: num textarea ele já quebra linha, que é o que o PRD pede.
  }

  return (
    <textarea
      ref={ref}
      // As mesmas medidas de texto do post-it em leitura: sem isso o conteúdo "pula" ao
      // entrar em edição.
      className="absolute inset-0 h-full w-full resize-none rounded-note bg-transparent p-3 text-sm break-words whitespace-pre-wrap text-note-ink outline-none"
      defaultValue={initialText}
      maxLength={NOTE_MAX_TEXT_LENGTH}
      onKeyDown={handleKeyDown}
      onBlur={finish}
      data-testid="post-it-editor"
      aria-label="Texto do post-it"
    />
  );
}
