"use client";

import { notFound } from "next/navigation";
import { Whiteboard } from "@/components/canvas/Whiteboard";
import { useHydrateFromBackend } from "@/lib/board/useHydrateFromBackend";

interface SharedBoardProps {
  /** Identificador do board na URL. */
  id: string;
}

/**
 * Um board aberto por link compartilhado (issue #21).
 *
 * O quadro só é montado depois que o conteúdo chega: montá-lo antes mostraria um quadro
 * vazio que ninguém pediu, e os post-its apareceriam num segundo salto.
 *
 * O que chega é uma cópia de trabalho. O autosave local fica desligado de propósito: o
 * `IndexedDB` guarda o board da rota raiz, e um link aberto por curiosidade não pode
 * apagar o trabalho de quem o abriu. Editar aqui também nunca toca o registro remoto —
 * compartilhar de novo (#46) cria outro documento.
 */
export function SharedBoard({ id }: SharedBoardProps) {
  const state = useHydrateFromBackend(id);

  if (state.status === "not-found") {
    // Aciona a fronteira de "não encontrado" da rota, que a issue #47 transforma numa
    // página amigável. Aqui só o estado é sinalizado.
    notFound();
  }

  if (state.status === "loading") {
    return (
      <main className="flex h-dvh items-center justify-center bg-canvas">
        <p className="text-sm text-ink-muted" role="status">
          Abrindo o whiteboard…
        </p>
      </main>
    );
  }

  return <Whiteboard initialBoard={state.board} autosave={false} />;
}
