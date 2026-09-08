"use client";

import { useCallback, useState } from "react";
import type { Board } from "./types";

/**
 * Estado da ação de compartilhar.
 *
 * `shared` guarda a URL da **última** vez que o board foi enviado. Ela não é o "link deste
 * board": compartilhar de novo cria outro documento (#44), e o link anterior continua
 * valendo, apontando para o board como ele estava naquele momento.
 */
export type ShareState =
  | { status: "idle" }
  | { status: "sharing" }
  | { status: "shared"; url: string }
  | { status: "error" };

export interface ShareApi {
  state: ShareState;
  /** Envia o board atual ao backend e guarda o link devolvido. */
  share: () => void;
  /** Volta ao estado inicial, fechando o link exibido. */
  dismiss: () => void;
}

/**
 * Envia o board ao backend e devolve o link público (issue #46).
 *
 * É a única ação que faz o board sair da máquina de quem escreveu: abrir a aplicação e
 * desenhar nunca cria nada remoto. Por isso o envio é sempre explícito, e nunca reage a
 * mudanças da store.
 *
 * Uma falha aqui não custa nada além do link: o board segue na store e no autosave local
 * (#22), então tentar de novo é sempre seguro.
 */
export function useShareBoard(getBoard: () => Board): ShareApi {
  const [state, setState] = useState<ShareState>({ status: "idle" });

  const share = useCallback(() => {
    setState({ status: "sharing" });

    void (async () => {
      try {
        const response = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: getBoard() }),
        });
        if (!response.ok) {
          setState({ status: "error" });
          return;
        }

        const payload: unknown = await response.json();
        const url =
          typeof payload === "object" && payload !== null
            ? (payload as { url?: unknown }).url
            : undefined;

        setState(typeof url === "string" ? { status: "shared", url } : { status: "error" });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, [getBoard]);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  return { state, share, dismiss };
}
