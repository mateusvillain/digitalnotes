/**
 * Acesso à tabela `boards`: criação (issue #44), leitura (issue #45) e limpeza dos
 * registros vazios (issue #55) de boards compartilhados.
 *
 * O backend nunca valida a estrutura interna de `content` — quem garante que é um board
 * válido é o frontend (`lib/board/schema.ts`). Aqui existem três regras: o payload precisa
 * caber em um limite razoável; cada chamada sempre cria um registro novo, nunca atualiza um
 * existente — compartilhar é sempre um documento novo; e toda leitura indisponível, seja
 * qual for o motivo, devolve o mesmo `null`.
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
 *
 * Descartar antes da consulta poupa o banco de tráfego de lixo, ao custo de um id
 * malformado responder mais rápido que um id bem formado e inexistente. A diferença é
 * observável por quem medir o tempo, e o que ela revela é só o formato do identificador —
 * que já é público, já que todo link compartilhado o exibe. Nenhuma informação sobre
 * *quais* boards existem vaza por esse caminho.
 */
function isValidBoardId(id: string): boolean {
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
/**
 * Janela de carência antes de um board vazio virar candidato à remoção.
 *
 * Existe para não apagar debaixo de quem está usando: alguém pode compartilhar o quadro
 * vazio e começar a preencher logo depois, e o link recém-enviado precisa continuar
 * abrindo enquanto a conversa acontece.
 */
export const EMPTY_BOARD_RETENTION_HOURS = 24;

/**
 * Query da limpeza (issue #55). Apaga apenas o que é comprovadamente um board sem nenhum
 * post-it e mais velho que a janela de carência.
 *
 * Os `CASE` aninhados não são estilo: as funções JSON do SQLite **lançam**
 * `SQLITE_ERROR: malformed JSON` quando `content` não é JSON válido, em vez de devolver
 * `NULL`. Um único registro ilegível na tabela abortaria o `DELETE` inteiro e deixaria a
 * rotina sem apagar nada. `AND` encadeado não bastaria: o planejador do SQLite pode
 * reordenar os termos de um `WHERE`, então a guarda só é confiável dentro de um `CASE`,
 * cuja avaliação é preguiçosa por definição.
 *
 * `json_type(...) = 'array'` é a segunda guarda, e também não é redundante:
 * `json_array_length` devolve `0` — indistinguível de uma lista vazia — para um `notes`
 * que seja objeto (`{"notes": {}}`). Sem checar o tipo antes, um board malformado seria
 * apagado como se estivesse vazio.
 */
const DELETE_EMPTY_BOARDS_SQL = `
  DELETE FROM boards
  WHERE created_at < datetime('now', ?)
    AND CASE WHEN json_valid(content)
             THEN CASE WHEN json_type(content, '$.notes') = 'array'
                       THEN json_array_length(content, '$.notes') = 0
                       ELSE 0 END
             ELSE 0 END
`;

/**
 * Remove os boards sem nenhum post-it criados há mais de
 * {@link EMPTY_BOARD_RETENTION_HOURS} horas e devolve quantos foram apagados.
 *
 * Compartilhar sempre cria um documento novo, e nada nunca é apagado: sem esta rotina, um
 * clique acidental no botão de compartilhar com o quadro vazio deixa uma linha permanente
 * no banco. São registros sem conteúdo nenhum — não há o que preservar neles.
 *
 * Nada que a rotina não consiga interpretar é removido: `content` ilegível ou com formato
 * inesperado fica onde está.
 */
export async function deleteEmptyBoards(): Promise<{ deleted: number }> {
  const db = getDbClient();

  const result = await db.execute({
    sql: DELETE_EMPTY_BOARDS_SQL,
    args: [`-${EMPTY_BOARD_RETENTION_HOURS} hours`],
  });

  return { deleted: result.rowsAffected };
}
