"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShareApi } from "@/lib/board/useShareBoard";

/** Mesma métrica e mesmas cores dos controles de zoom: é a mesma classe de ação. */
const buttonClass =
  "flex h-8 w-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/** Quanto tempo o botão de copiar confirma a cópia antes de voltar ao normal. */
const COPIED_FEEDBACK_MS = 2000;

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
  const url = state.status === "shared" ? state.url : null;
  const copied = url !== null && copiedUrl === url;

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

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="rounded-control border border-border bg-surface p-1 shadow-control">
        <button
          type="button"
          className={buttonClass}
          onClick={share}
          disabled={state.status === "sharing"}
          aria-label="Compartilhar whiteboard"
          title="Compartilhar whiteboard"
        >
          <ShareIcon />
        </button>
      </div>

      {state.status === "sharing" ? (
        <p
          className="rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink-muted shadow-control"
          role="status"
        >
          Gerando o link…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div
          className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-xs shadow-control"
          role="status"
        >
          <span className="text-ink">Não foi possível compartilhar agora.</span>
          <button type="button" className="text-ink-muted hover:text-ink" onClick={share}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      {url === null ? null : (
        <div
          className="flex items-center gap-2 rounded-control border border-border bg-surface p-1 pl-3 shadow-control"
          role="status"
        >
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
            className={buttonClass}
            onClick={dismiss}
            aria-label="Fechar o link compartilhado"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
