"use client";

import { useEffect, useState } from "react";
import { parseBoard } from "./schema";
import type { Board } from "./types";

/**
 * Estado da busca de um board compartilhado.
 *
 * "Não encontrado" é um estado de primeira classe, e não um erro: a página de link
 * inválido (#47) é uma tela de produto, não uma falha a ser tratada.
 */
export type HydrationState =
  { status: "loading" } | { status: "ready"; board: Board } | { status: "not-found" };

/**
 * Busca no backend o board de um link compartilhado (issue #21).
 *
 * O que volta é uma **cópia** de trabalho: a partir daqui o board vive na store local como
 * qualquer outro, e editá-lo nunca toca o registro remoto. Só compartilhar de novo (#46)
 * cria outro documento no backend.
 *
 * Todo caminho que não devolve um board utilizável — 404, rede fora, resposta ilegível,
 * conteúdo que não passa no contrato — termina em `not-found`. O backend já responde a
 * mesma coisa para inexistente e malformado (#45), e a interface não teria o que fazer de
 * diferente com a distinção.
 */
export function useHydrateFromBackend(id: string): HydrationState {
  const [state, setState] = useState<HydrationState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBoard() {
      try {
        const response = await fetch(`/api/boards/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return { status: "not-found" } as const;

        const payload: unknown = await response.json();
        const content =
          typeof payload === "object" && payload !== null
            ? (payload as { content?: unknown }).content
            : undefined;

        // O que veio do backend é dado de fora: passa pelo mesmo contrato que valida um
        // autosave ou um board colado. O backend guarda o `content` sem olhar o que é.
        const result = parseBoard(content);
        return result.ok
          ? ({ status: "ready", board: result.board } as const)
          : ({ status: "not-found" } as const);
      } catch {
        // Inclui o abort do cleanup; o `if` abaixo impede que ele vire estado.
        return { status: "not-found" } as const;
      }
    }

    void fetchBoard().then((next) => {
      if (!controller.signal.aborted) setState(next);
    });

    return () => controller.abort();
  }, [id]);

  return state;
}
