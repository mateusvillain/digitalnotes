/**
 * `POST /api/boards` — cria um board compartilhado (issue #44).
 *
 * Sem autenticação e sem verificação de identidade: quem chama esse endpoint recebe um
 * link público de volta, igual a compartilhar um arquivo.
 */

import { NextResponse } from "next/server";
import { BoardPayloadTooLargeError, createBoard } from "@/lib/db/boards";

function isValidPayload(body: unknown): body is { content: object } {
  return (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).content === "object" &&
    (body as Record<string, unknown>).content !== null &&
    !Array.isArray((body as Record<string, unknown>).content)
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "O corpo deve conter um campo `content` com um objeto." },
      { status: 400 },
    );
  }

  try {
    const { id } = await createBoard(body.content);
    const url = new URL(`/board/${id}`, request.url).toString();
    return NextResponse.json({ id, url }, { status: 201 });
  } catch (error) {
    if (error instanceof BoardPayloadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error("Falha ao criar board:", error);
    return NextResponse.json({ error: "Não foi possível salvar o board." }, { status: 500 });
  }
}
