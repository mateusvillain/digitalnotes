"use client";

import { useCallback, useEffect, useState } from "react";
import { parseBoard } from "./schema";
import type { Board } from "./types";

/**
 * Estado da busca de um board compartilhado.
 *
 * "Não encontrado" e "falhou" são estados distintos de propósito. O primeiro é uma tela de
 * produto (#47): aquele documento não existe, e dizer isso é a resposta certa. O segundo é
 * o backend fora do ar ou a rede caída — dizer "não existe" para um board que existe seria
 * mentira, e ainda tiraria do usuário a única ação que resolve, que é tentar de novo.
 */
export type HydrationState =
  | { status: "loading" }
  | { status: "ready"; board: Board }
  | { status: "not-found" }
  | { status: "error"; retry: () => void };

/** O que a busca concluiu, antes de virar estado. */
type FetchOutcome =
  { status: "ready"; board: Board } | { status: "not-found" } | { status: "error" };

/** Resultado já concluído, junto da busca que o produziu. */
interface Resolved {
  id: string;
  attempt: number;
  outcome: FetchOutcome;
}

/**
 * Busca no backend o board de um link compartilhado (issue #21).
 *
 * O que volta é uma **cópia** de trabalho: a partir daqui o board vive na store local como
 * qualquer outro, e editá-lo nunca toca o registro remoto. Só compartilhar de novo (#46)
 * cria outro documento no backend.
 *
 * O backend já responde a mesma coisa para board inexistente e id malformado (#45), então
 * quem chama não tem como — nem por que — distinguir os dois. O que **é** distinguido é
 * "não existe" de "não deu para saber".
 */
export function useHydrateFromBackend(id: string): HydrationState {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBoard(): Promise<FetchOutcome> {
      let response: Response;
      try {
        response = await fetch(`/api/boards/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
      } catch {
        // Rede fora, DNS, requisição abortada: não é resposta do backend, então não dá
        // para afirmar que o board não existe.
        return { status: "error" };
      }

      // 404 é a resposta do backend para inexistente, removido e malformado (#45).
      if (response.status === 404) return { status: "not-found" };
      // Qualquer outra falha é do servidor, e o documento pode muito bem existir.
      if (!response.ok) return { status: "error" };

      try {
        const payload: unknown = await response.json();
        const content =
          typeof payload === "object" && payload !== null
            ? (payload as { content?: unknown }).content
            : undefined;

        // O que veio do backend é dado de fora: passa pelo mesmo contrato que valida um
        // autosave ou um board colado. O backend guarda o `content` sem olhar o que é.
        const result = parseBoard(content);
        // Um 200 com corpo que não é um board é resposta ilegível, não documento ausente.
        return result.ok ? { status: "ready", board: result.board } : { status: "error" };
      } catch {
        return { status: "error" };
      }
    }

    void fetchBoard().then((outcome) => {
      // A busca pode ter sido abortada por troca de link ou desmonte; aplicar o resultado
      // agora escreveria num estado que ninguém mais mostra.
      if (controller.signal.aborted) return;
      setResolved({ id, attempt, outcome });
    });

    return () => controller.abort();
  }, [id, attempt]);

  // "Carregando" é derivado, e não guardado: o resultado que não corresponde à busca atual
  // (link trocado, nova tentativa) simplesmente não conta. Guardar o estado obrigaria a
  // reescrevê-lo dentro do efeito, e o board do link anterior apareceria por um render sob
  // a URL nova.
  const current =
    resolved !== null && resolved.id === id && resolved.attempt === attempt
      ? resolved.outcome
      : null;

  if (current === null) return { status: "loading" };
  return current.status === "error" ? { status: "error", retry } : current;
}
