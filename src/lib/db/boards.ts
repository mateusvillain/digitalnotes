/**
 * Acesso à tabela `boards`: criação de boards compartilhados (issue #44).
 *
 * O backend nunca valida a estrutura interna de `content` — quem garante que é um board
 * válido é o frontend (`lib/board/schema.ts`). Aqui só existem duas regras: o payload
 * precisa caber em um limite razoável, e cada chamada sempre cria um registro novo, nunca
 * atualiza um existente — compartilhar é sempre um documento novo.
 */

import { randomBytes } from "node:crypto";
import { getDbClient } from "./client";

/** Limite de tamanho do `content` serializado. Generoso para o caso de uso (boards de
 * anotação), mas evita que um payload absurdo sobrecarregue o plano gratuito do Turso. */
export const MAX_BOARD_CONTENT_BYTES = 1_000_000;

const MAX_INSERT_ATTEMPTS = 5;

export class BoardPayloadTooLargeError extends Error {
  constructor() {
    super("Conteúdo do board excede o tamanho máximo aceito.");
    this.name = "BoardPayloadTooLargeError";
  }
}

/** Gera um identificador aleatório, curto e seguro para URL. */
function generateBoardId(): string {
  return randomBytes(9).toString("base64url");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

/**
 * Insere um novo board com um identificador aleatório e devolve o `id` gerado.
 *
 * Em caso de colisão de identificador (extremamente improvável, dado o espaço de valores),
 * tenta de novo com um novo id em vez de sobrescrever o registro existente.
 */
export async function createBoard(content: unknown): Promise<{ id: string }> {
  const serialized = JSON.stringify(content);
  if (Buffer.byteLength(serialized, "utf-8") > MAX_BOARD_CONTENT_BYTES) {
    throw new BoardPayloadTooLargeError();
  }

  const db = getDbClient();

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const id = generateBoardId();
    try {
      await db.execute({
        sql: "INSERT INTO boards (id, content) VALUES (?, ?)",
        args: [id, serialized],
      });
      return { id };
    } catch (error) {
      const isLastAttempt = attempt === MAX_INSERT_ATTEMPTS - 1;
      if (isUniqueConstraintError(error) && !isLastAttempt) continue;
      throw error;
    }
  }

  throw new Error("Não foi possível gerar um identificador único para o board.");
}
