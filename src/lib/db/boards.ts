/**
 * Acesso à tabela `boards`: criação (issue #44) e leitura (issue #45) de boards
 * compartilhados.
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

/** Bytes aleatórios por identificador. 9 bytes viram 12 caracteres em base64url. */
const BOARD_ID_BYTES = 9;

/** Formato exato produzido por {@link generateBoardId}: base64url de tamanho fixo. */
const BOARD_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export class BoardPayloadTooLargeError extends Error {
  constructor() {
    super("Conteúdo do board excede o tamanho máximo aceito.");
    this.name = "BoardPayloadTooLargeError";
  }
}

/** Gera um identificador aleatório, curto e seguro para URL. */
function generateBoardId(): string {
  return randomBytes(BOARD_ID_BYTES).toString("base64url");
}

/**
 * Diz se `id` tem o formato que a aplicação gera.
 *
 * Serve para descartar identificador malformado antes de ir ao banco — nunca para
 * responder algo diferente de "não encontrado": quem consulta não pode distinguir um id
 * inválido de um board inexistente (issue #45).
 */
export function isValidBoardId(id: string): boolean {
  return BOARD_ID_PATTERN.test(id);
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

/**
 * Busca o `content` de um board pelo identificador.
 *
 * Devolve `null` para todos os casos de "não disponível" — id malformado, board
 * inexistente ou registro ilegível — para que quem chama não tenha como (nem por onde)
 * responder de forma diferente a cada motivo.
 */
export async function getBoard(id: string): Promise<{ content: unknown } | null> {
  if (!isValidBoardId(id)) return null;

  const db = getDbClient();
  const result = await db.execute({
    sql: "SELECT content FROM boards WHERE id = ?",
    args: [id],
  });

  const row = result.rows[0];
  if (!row) return null;

  try {
    return { content: JSON.parse(String(row.content)) };
  } catch (error) {
    // Só chega aqui se algo gravou um `content` que não é JSON. Registrar para
    // investigação, mas responder como qualquer outro board indisponível.
    console.error(`Board ${id} tem content ilegível:`, error);
    return null;
  }
}
