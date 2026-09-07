import { describe, expect, it } from "vitest";
import { parseBoard } from "./schema";
import {
  CANVAS_MAX_ABS_COORDINATE,
  NOTE_MAX_TEXT_LENGTH,
  NOTE_SIZE,
  SCHEMA_VERSION,
} from "./types";

function note(overrides: Record<string, unknown> = {}) {
  return { id: "a", x: 10, y: 20, w: 200, h: 200, color: 0, text: "oi", z: 1, ...overrides };
}

describe("parseBoard", () => {
  it("aceita um board válido", () => {
    const result = parseBoard({ version: SCHEMA_VERSION, notes: [note()] });

    expect(result).toEqual({
      ok: true,
      board: { version: SCHEMA_VERSION, notes: [note()] },
      warnings: [],
    });
  });

  it("aceita um board vazio", () => {
    const result = parseBoard({ version: SCHEMA_VERSION, notes: [] });

    expect(result.ok && result.board.notes).toEqual([]);
  });

  it.each([
    ["null", null],
    ["string", "board"],
    ["array", []],
    ["sem versão", { notes: [] }],
    ["versão não inteira", { version: 1.5, notes: [] }],
    ["versão zero", { version: 0, notes: [] }],
    ["sem lista de notes", { version: SCHEMA_VERSION }],
    ["notes não é lista", { version: SCHEMA_VERSION, notes: {} }],
  ])("rejeita board malformado (%s) sem lançar", (_caso, input) => {
    const result = parseBoard(input);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.length).toBeGreaterThan(0);
  });

  it("rejeita board escrito por versão futura do schema", () => {
    const result = parseBoard({ version: SCHEMA_VERSION + 1, notes: [] });

    expect(result.ok).toBe(false);
  });

  it("descarta notes inválidas e reporta o motivo", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [
        note(),
        null,
        note({ id: "" }),
        note({ id: "b", x: "10" }),
        note({ id: "c", color: 9 }),
      ],
    });

    expect(result.ok && result.board.notes.map((n) => n.id)).toEqual(["a"]);
    expect(result.ok && result.warnings).toHaveLength(4);
  });

  it("renomeia id duplicado em vez de descartar o post-it", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [note({ text: "primeira" }), note({ text: "segunda" }), note({ text: "terceira" })],
    });

    expect(result.ok && result.board.notes.map((n) => [n.id, n.text])).toEqual([
      ["a", "primeira"],
      ["a-2", "segunda"],
      ["a-3", "terceira"],
    ]);
    expect(result.ok && result.warnings).toHaveLength(2);
  });

  it("não colide ao renomear com um id que já existe no board", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [note(), note({ id: "a-2" }), note({ text: "renomeada" })],
    });

    expect(result.ok && result.board.notes.map((n) => n.id)).toEqual(["a", "a-2", "a-3"]);
  });

  it("aplica tamanho padrão quando largura e altura faltam ou não são números", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [note({ w: undefined, h: "grande" })],
    });

    expect(result.ok && result.board.notes[0]?.w).toBe(NOTE_SIZE.defaultWidth);
    expect(result.ok && result.board.notes[0]?.h).toBe(NOTE_SIZE.defaultHeight);
  });

  it("limita tamanho, coordenadas e texto aos extremos aceitos", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [
        note({
          x: -CANVAS_MAX_ABS_COORDINATE * 10,
          y: CANVAS_MAX_ABS_COORDINATE * 10,
          w: 1,
          h: NOTE_SIZE.maxHeight * 10,
          text: "x".repeat(NOTE_MAX_TEXT_LENGTH + 50),
        }),
      ],
    });

    const parsed = result.ok ? result.board.notes[0] : undefined;
    expect(parsed?.x).toBe(-CANVAS_MAX_ABS_COORDINATE);
    expect(parsed?.y).toBe(CANVAS_MAX_ABS_COORDINATE);
    expect(parsed?.w).toBe(NOTE_SIZE.minWidth);
    expect(parsed?.h).toBe(NOTE_SIZE.maxHeight);
    expect(parsed?.text).toHaveLength(NOTE_MAX_TEXT_LENGTH);
  });

  it("normaliza z para inteiro e texto ausente para vazio", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [note({ z: 3.7, text: undefined })],
    });

    expect(result.ok && result.board.notes[0]?.z).toBe(3);
    expect(result.ok && result.board.notes[0]?.text).toBe("");
  });

  it("normaliza a versão do board para a versão atual do schema", () => {
    const result = parseBoard({ version: 1, notes: [] });

    expect(result.ok && result.board.version).toBe(SCHEMA_VERSION);
  });

  it("não lança para valores não finitos", () => {
    const result = parseBoard({
      version: SCHEMA_VERSION,
      notes: [note({ x: Number.NaN }), note({ id: "b", w: Number.POSITIVE_INFINITY })],
    });

    expect(result.ok && result.board.notes.map((n) => n.id)).toEqual(["b"]);
    expect(result.ok && result.board.notes[0]?.w).toBe(NOTE_SIZE.defaultWidth);
  });
});
