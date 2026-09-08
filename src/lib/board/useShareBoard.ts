"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Falha que tentar de novo pode resolver: rede fora, backend indisponível. */
  | { status: "error" }
  /**
   * O board não cabe no limite que o backend aceita.
   *
   * Estado separado porque é a única falha que o usuário **pode** resolver, e a única em
   * que "tentar de novo" é conselho ruim: sem apagar post-its, a próxima tentativa falha
   * igual.
   */
  | { status: "too-large" };

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
  /**
   * Qual envio é o atual.
   *
   * Dois cliques seguidos (ou um retry logo depois de uma falha lenta) podem voltar fora
   * de ordem, e a resposta velha sobrescreveria a nova. O contador também é o que impede
   * a escrita de estado depois do desmonte.
   */
  const currentAttempt = useRef(0);

  useEffect(() => {
    // Marca todo envio em andamento como obsoleto ao desmontar.
    return () => {
      currentAttempt.current += 1;
    };
  }, []);

  const share = useCallback(() => {
    currentAttempt.current += 1;
    const attempt = currentAttempt.current;
    const isCurrent = () => attempt === currentAttempt.current;

    setState({ status: "sharing" });

    void (async () => {
      const outcome = await postBoard(getBoard());
      if (isCurrent()) setState(outcome);
    })();
  }, [getBoard]);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  return { state, share, dismiss };
}

/** Envia o board e traduz a resposta em estado. Nunca lança. */
async function postBoard(board: Board): Promise<ShareState> {
  try {
    const response = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: board }),
    });

    // 413 é o backend dizendo que o board passou do tamanho aceito (#44): é falha do
    // conteúdo, não da rede, e insistir não resolve.
    if (response.status === 413) return { status: "too-large" };
    if (!response.ok) return { status: "error" };

    const payload: unknown = await response.json();
    const url =
      typeof payload === "object" && payload !== null
        ? (payload as { url?: unknown }).url
        : undefined;

    return typeof url === "string" ? { status: "shared", url } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
