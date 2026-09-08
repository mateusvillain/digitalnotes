/**
 * Cliente de acesso ao Turso (libSQL), reutilizável pelas Vercel Functions.
 *
 * O backend nunca precisa conhecer a estrutura interna do board (issue #43): ele apenas
 * guarda e devolve o `content` como veio, então este módulo não expõe nada além de uma
 * conexão pronta para uso pelos endpoints da API.
 */

import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

/**
 * Retorna o cliente singleton do banco, criando-o na primeira chamada.
 *
 * Lança um erro explícito se as variáveis de ambiente não estiverem configuradas, em vez
 * de falhar mais tarde com um erro de conexão difícil de diagnosticar.
 */
export function getDbClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL não configurada. Defina em .env.local (local) ou nas variáveis " +
        "de ambiente do projeto na Vercel.",
    );
  }
  if (!authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN não configurada. Defina em .env.local (local) ou nas variáveis de " +
        "ambiente do projeto na Vercel.",
    );
  }

  client = createClient({ url, authToken });
  return client;
}
