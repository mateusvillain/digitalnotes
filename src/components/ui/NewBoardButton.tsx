"use client";

import { useCallback, useRef, useState } from "react";
import { iconButtonClass, panelButtonClass } from "@/components/ui/iconButton";
import type { ShareApi } from "@/lib/board/useShareBoard";

interface NewBoardButtonProps {
  /** Há post-its no quadro atual — ou seja, há trabalho que a substituição levaria junto. */
  hasNotes: boolean;
  /** Descarta o board atual e começa um quadro vazio. */
  onNewBoard: () => void;
  /** A mesma ação de compartilhar do resto da interface (#46), e não um segundo caminho. */
  share: ShareApi;
}

/** Ícone de documento novo: uma folha com um `+`. */
function NewBoardIcon() {
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
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M13.5 3 19 8.5V12" />
      <path d="M18 15.5v5M15.5 18h5" />
    </svg>
  );
}

/**
 * Ação de começar um whiteboard novo (issue #58).
 *
 * Com o quadro vazio, cria direto: não há trabalho para proteger, e perguntar seria só
 * atrito. Com post-its na tela, oferece antes gerar o link do quadro atual — como o
 * autosave local guarda um board só, o link é a única forma de voltar ao que estava ali.
 *
 * Quem pediu o link e não o recebeu continua com o quadro: limpar depois de uma falha
 * deixaria a pessoa sem o board **e** sem o link, que é pior do que não ter oferecido nada.
 */
export function NewBoardButton({ hasNotes, onNewBoard, share }: NewBoardButtonProps) {
  const [asking, setAsking] = useState(false);
  /** Esperando o link que o usuário pediu antes de limpar. */
  const [awaitingLink, setAwaitingLink] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    // Quadro vazio não tem o que perder: segue sem trava.
    if (!hasNotes) {
      onNewBoard();
      return;
    }
    setAsking(true);
  }, [hasNotes, onNewBoard]);

  const close = useCallback(() => {
    setAsking(false);
    setAwaitingLink(false);
    // Fechar desmonta o que tinha o foco; sem devolvê-lo, quem usa teclado é jogado para o
    // início do documento.
    buttonRef.current?.focus();
  }, []);

  const shareThenReset = useCallback(async () => {
    setAwaitingLink(true);
    const outcome = await share.share();
    setAwaitingLink(false);

    // Só limpa depois de o link existir: sem ele, quem pediu justamente para poder voltar
    // ficaria sem o quadro **e** sem o link. Em caso de falha, o painel de compartilhar já
    // explica o motivo, e ainda dá para seguir sem link.
    if (outcome.status !== "shared") return;

    setAsking(false);
    onNewBoard();
  }, [onNewBoard, share]);

  const resetNow = useCallback(() => {
    onNewBoard();
    close();
  }, [close, onNewBoard]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="rounded-control border border-border bg-surface p-1 shadow-control">
        <button
          ref={buttonRef}
          type="button"
          className={iconButtonClass}
          onClick={start}
          aria-label="Criar um novo whiteboard"
          aria-expanded={asking}
        >
          <NewBoardIcon />
        </button>
      </div>

      {asking ? (
        <div
          role="dialog"
          aria-label="Criar um novo whiteboard"
          className="flex w-72 flex-col gap-3 rounded-control border border-border bg-surface p-3 shadow-control"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <p className="text-xs text-ink">
            O quadro atual será substituído. Gere um link antes se quiser poder voltar a ele depois.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={panelButtonClass}
              onClick={() => void shareThenReset()}
              disabled={awaitingLink}
              // O foco entra no painel assim que ele abre: é o que faz o `Esc` chegar aqui
              // e o que evita deixar quem usa teclado preso no botão que abriu o aviso.
              autoFocus
            >
              {awaitingLink ? "Gerando o link…" : "Gerar link e começar"}
            </button>
            <button
              type="button"
              className="rounded-control px-2 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
              onClick={resetNow}
            >
              Começar sem link
            </button>
            <button
              type="button"
              className="rounded-control px-2 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
              onClick={close}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
