// @vitest-environment node

/**
 * Testes da limpeza de boards vazios (issue #55) contra um banco libSQL de verdade, em
 * memória.
 *
 * Aqui não cabe mock: o que precisa ser garantido é o comportamento das funções JSON do
 * SQLite sobre `content` — que um `content` ilegível não derruba a rotina, e que um
 * `notes` de tipo inesperado não é confundido com uma lista vazia. Um `execute` falso
 * conferiria a string da query, não o efeito dela; e é justamente o efeito que apaga dados
 * em produção.
 */

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let db: Client;

vi.mock("./client", () => ({ getDbClient: () => db }));

const { deleteEmptyBoards } = await import("./boards");

/** Um board qualquer, do formato que o frontend grava. */
const EMPTY = '{"version":1,"notes":[]}';
const WITH_NOTE = '{"version":1,"notes":[{"id":"n1","text":"oi"}]}';

/** Idades em horas, dos dois lados da janela de carência de 24 horas. */
const OLD = -48;
const RECENT = -1;

async function insert(id: string, content: string, ageInHours: number) {
  await db.execute({
    sql: `INSERT INTO boards (id, content, created_at)
          VALUES (?, ?, datetime('now', ?))`,
    args: [id, content, `${ageInHours} hours`],
  });
}

async function remainingIds(): Promise<string[]> {
  const result = await db.execute("SELECT id FROM boards ORDER BY id");
  return result.rows.map((row) => String(row.id));
}

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await db.execute(`CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
});

afterEach(() => {
  db.close();
});

describe("deleteEmptyBoards", () => {
  it("apaga o board vazio criado há mais de 24 horas", async () => {
    await insert("antigo", EMPTY, OLD);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 1 });
    expect(await remainingIds()).toEqual([]);
  });

  it("preserva o board vazio criado nas últimas 24 horas", async () => {
    await insert("recente", EMPTY, RECENT);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 0 });
    expect(await remainingIds()).toEqual(["recente"]);
  });

  it("preserva o board com post-it, por mais velho que seja", async () => {
    await insert("com-nota", WITH_NOTE, -24 * 365);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 0 });
    expect(await remainingIds()).toEqual(["com-nota"]);
  });

  it.each([
    ["json ilegível", "{isso não é json"],
    ["json truncado", '{"version":1,"notes":['],
    ["não é objeto", '"apenas uma string"'],
    ["sem o campo notes", '{"version":1}'],
    ["notes nulo", '{"version":1,"notes":null}'],
    ["notes como objeto", '{"version":1,"notes":{}}'],
    ["notes como string", '{"version":1,"notes":"oi"}'],
    ["notes como número", '{"version":1,"notes":0}'],
  ])("não apaga content que não consegue interpretar: %s", async (_caso, content) => {
    await insert("indecifravel", content, OLD);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 0 });
    expect(await remainingIds()).toEqual(["indecifravel"]);
  });

  it("um registro ilegível não impede a limpeza dos demais", async () => {
    await insert("ilegivel", "{isso não é json", OLD);
    await insert("vazio-1", EMPTY, OLD);
    await insert("vazio-2", EMPTY, OLD);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 2 });
    expect(await remainingIds()).toEqual(["ilegivel"]);
  });

  it("apaga só o que deve, com a tabela cheia de casos misturados", async () => {
    await insert("vazio-antigo", EMPTY, OLD);
    await insert("vazio-recente", EMPTY, RECENT);
    await insert("com-nota-antigo", WITH_NOTE, OLD);
    await insert("ilegivel-antigo", "{quebrado", OLD);

    expect(await deleteEmptyBoards()).toEqual({ deleted: 1 });
    expect(await remainingIds()).toEqual(["com-nota-antigo", "ilegivel-antigo", "vazio-recente"]);
  });

  it("não apaga nada quando a tabela está vazia", async () => {
    expect(await deleteEmptyBoards()).toEqual({ deleted: 0 });
  });
});
