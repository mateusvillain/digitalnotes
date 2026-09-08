/**
 * `GET /api/cron/cleanup-boards` — apaga os boards vazios antigos (issue #55).
 *
 * Quem chama é o agendador da Vercel, declarado em `vercel.json`. Diferente do resto da
 * API, este endpoint não é público: possuir a URL não basta, é preciso apresentar o
 * `CRON_SECRET` — senão qualquer pessoa que descobrisse o caminho poderia disparar
 * remoções à vontade.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteEmptyBoards } from "@/lib/db/boards";

/**
 * Compara dois segredos em tempo constante.
 *
 * `timingSafeEqual` exige buffers do mesmo tamanho, e comparar os tamanhos antes vaza
 * apenas o comprimento do segredo — não seu conteúdo.
 */
function secretMatches(received: string, expected: string): boolean {
  const a = Buffer.from(received, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Extrai o segredo de um cabeçalho `Authorization` do esquema Bearer.
 *
 * O nome do esquema é case-insensitive por especificação (RFC 7235), então compará-lo
 * literalmente recusaria um `bearer` minúsculo perfeitamente válido. O segredo em si, esse
 * sim, é comparado byte a byte mais adiante.
 */
function extractBearerToken(header: string): string | null {
  const match = /^Bearer +(.*)$/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * Diz se a requisição apresentou o segredo do agendador.
 *
 * Sem `CRON_SECRET` configurado a resposta é sempre `false`: uma variável ausente deixaria
 * a rota aberta justamente no ambiente em que ela apaga dados de verdade, então falhar
 * fechado é o único padrão aceitável.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  const token = extractBearerToken(header);
  if (token === null) return false;

  return secretMatches(token, secret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { deleted } = await deleteEmptyBoards();

    // O registro é o único jeito de conferir depois o que a rotina fez: ninguém está
    // olhando a resposta de uma execução agendada.
    console.log(`Limpeza de boards vazios: ${deleted} registro(s) apagado(s).`);

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Falha ao limpar boards vazios:", error);
    return NextResponse.json({ error: "Não foi possível limpar os boards." }, { status: 500 });
  }
}
