/**
 * `GET /api/boards/:id` — devolve um board compartilhado (issue #45).
 *
 * Sem autenticação: possuir o identificador é o único requisito de acesso. Todo caso de
 * indisponibilidade (id malformado, inexistente ou removido) responde exatamente o mesmo
 * `404`, para que ninguém consiga inferir quais boards existem.
 */

import { NextResponse } from "next/server";
import { getBoard } from "@/lib/db/boards";

/** Resposta única para qualquer board indisponível — sem pistas sobre o motivo. */
function notFound() {
  return NextResponse.json({ error: "Board não encontrado." }, { status: 404 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const board = await getBoard(id);
    if (!board) return notFound();

    return NextResponse.json({ content: board.content });
  } catch (error) {
    console.error("Falha ao buscar board:", error);
    return NextResponse.json({ error: "Não foi possível buscar o board." }, { status: 500 });
  }
}
