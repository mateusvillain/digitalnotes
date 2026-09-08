"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { iconButtonClass } from "@/components/ui/iconButton";
import type { ShareApi } from "@/lib/board/useShareBoard";

/** Quanto tempo o botão de copiar confirma a cópia antes de voltar ao normal. */
const COPIED_FEEDBACK_MS = 2000;

const panelClass =
  "rounded-control border border-border bg-surface px-3 py-2 text-xs shadow-control";

/** Ícone de compartilhar: três nós ligados por duas linhas. */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

/** O que a região de anúncios diz em cada estado. Vazio quando não há o que dizer. */
function announcement(status: ShareApi["state"]["status"]): string {
  switch (status) {
    case "sharing":
      return "Gerando o link…";
    case "shared":
      return "Link gerado.";
    case "too-large":
      return "Este whiteboard é grande demais para ser compartilhado.";
    case "error":
      return "Não foi possível compartilhar agora.";
    default:
      return "";
  }
}

/**
 * Ação de compartilhar e o link que ela devolve (issue #46).
 *
 * Só o ícone, como os controles de zoom: o quadro é a interface inteira, e um rótulo
 * escrito custaria largura de tela para dizer o que o desenho já diz. Quem não vê o ícone
 * ouve o `aria-label`.
 *
 * O link aparece num painel logo abaixo, e não substitui o botão: compartilhar de novo
 * gera outro documento, então o botão continua sendo a ação principal mesmo com um link
 * na tela.
 */
export function ShareButton({ state, share, dismiss }: ShareApi) {
  /**
   * Qual link foi copiado, e não "se copiou".
   *
   * Guardar o link deixa a confirmação ser **derivada**: compartilhar de novo troca a URL,
   * e o "Copiado" do link anterior desaparece sozinho, sem um efeito para desfazê-lo.
   */
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const url = state.status === "shared" ? state.url : null;
  const copied = url !== null && copiedUrl === url;
  const sharing = state.status === "sharing";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopiedUrl(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    if (url === null) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      // Sem permissão de área de transferência (ou sem suporte): o link segue visível e
      // selecionável, que é o que importa.
      setCopiedUrl(null);
    }
  }, [url]);

  const close = useCallback(() => {
    dismiss();
    // Fechar o painel desmonta o que tinha o foco. Sem devolvê-lo ao botão, quem navega
    // por teclado é jogado para o início do documento.
    shareRef.current?.focus();
  }, [dismiss]);

  return (
    <div className="flex flex-col items-end gap-2">
      {/*
        Região de anúncio persistente, e só com texto.
        Uma live region que nasce junto do conteúdo costuma não ser lida, e envolver o
        painel do link faria o leitor reler a URL inteira a cada "Copiar" → "Copiado".
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement(state.status)}
      </p>

      <div className="rounded-control border border-border bg-surface p-1 shadow-control">
        <button
          ref={shareRef}
          type="button"
          className={iconButtonClass}
          onClick={sharing ? undefined : () => void share()}
          // `aria-busy` em vez de `disabled`: desabilitar tira o foco de quem acabou de
          // acionar o botão pelo teclado, e o clique já está barrado acima.
          aria-busy={sharing}
          aria-label="Compartilhar whiteboard"
          title="Compartilhar whiteboard"
        >
          <ShareIcon />
        </button>
      </div>

      {sharing ? <p className={`${panelClass} text-ink-muted`}>Gerando o link…</p> : null}

      {state.status === "too-large" ? (
        <p className={`${panelClass} w-64 text-ink`}>
          Este whiteboard é grande demais para ser compartilhado. Apague alguns post-its e tente de
          novo.
        </p>
      ) : null}

      {state.status === "error" ? (
        <div className={`${panelClass} flex items-center gap-2`}>
          <span className="text-ink">Não foi possível compartilhar agora.</span>
          <button
            type="button"
            className="text-ink-muted hover:text-ink"
            onClick={() => void share()}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {url === null ? null : (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 rounded-control border border-border bg-surface p-1 pl-3 shadow-control">
            <input
              readOnly
              value={url}
              aria-label="Link do whiteboard compartilhado"
              className="w-64 bg-transparent text-xs text-ink outline-none"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              className="rounded-control px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              onClick={copy}
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              className={iconButtonClass}
              onClick={close}
              aria-label="Fechar o link compartilhado"
            >
              ×
            </button>
          </div>
          {/*
            Compartilhar de novo gera outro documento e troca o link que está aqui. Sem
            este aviso, quem já mandou o anterior para alguém acharia que o quebrou.
          */}
          <p className="px-1 text-[11px] text-ink-muted">Links já enviados continuam valendo.</p>
        </div>
      )}
    </div>
  );
}
