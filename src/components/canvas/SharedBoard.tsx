"use client";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { panelButtonClass } from "@/components/ui/iconButton";
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
    /**
     * Aciona a fronteira de "não encontrado" da rota, que a issue #47 transforma numa
     * página amigável.
     *
     * `notFound()` chamado do cliente é usado à margem do que a documentação do Next
     * descreve (ela fala em Server Components e Route Handlers), mas a fronteira que o
     * captura é client-side, e a alternativa — buscar no servidor — obrigaria a esperar o
     * backend antes de mandar qualquer HTML de um documento que nem é indexável.
     */
    notFound();
  }

  if (state.status === "error") {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-ink-muted" role="status">
            Não foi possível abrir este whiteboard agora.
          </p>
          <button type="button" className={panelButtonClass} onClick={state.retry}>
            Tentar de novo
          </button>
        </div>
      </AppShell>
    );
  }

  if (state.status === "loading") {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-ink-muted" role="status">
            Abrindo o whiteboard…
          </p>
        </div>
      </AppShell>
    );
  }

  return <Whiteboard initialBoard={state.board} autosave={false} />;
}
