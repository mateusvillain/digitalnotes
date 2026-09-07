import { describe, expect, it } from "vitest";
import { NOTE_COLORS, createEmptyBoard, isNoteColor, noteColorName, SCHEMA_VERSION } from "./types";

describe("cores do post-it", () => {
  it("expõe exatamente 6 cores", () => {
    expect(NOTE_COLORS).toHaveLength(6);
  });

  it("aceita apenas índices inteiros dentro da paleta", () => {
    expect([0, 5].every(isNoteColor)).toBe(true);
    expect([-1, 6, 1.5, "0", null, undefined].some(isNoteColor)).toBe(false);
  });

  it("traduz o índice para o nome da cor", () => {
    expect(noteColorName(0)).toBe(NOTE_COLORS[0]);
    expect(noteColorName(5)).toBe(NOTE_COLORS[5]);
  });
});

describe("createEmptyBoard", () => {
  it("cria um board vazio na versão atual", () => {
    expect(createEmptyBoard()).toEqual({ version: SCHEMA_VERSION, notes: [] });
  });
});
