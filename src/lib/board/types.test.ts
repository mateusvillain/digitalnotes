import { describe, expect, it } from "vitest";
import { NOTE_COLORS, SCHEMA_VERSION, createEmptyBoard, isNoteColor } from "./types";

describe("cores do post-it", () => {
  it("expõe exatamente 6 cores", () => {
    expect(NOTE_COLORS).toHaveLength(6);
  });

  it("aceita apenas índices inteiros dentro da paleta", () => {
    expect([0, 5].every(isNoteColor)).toBe(true);
    expect([-1, 6, 1.5, "0", null, undefined].some(isNoteColor)).toBe(false);
  });

  it("aceita todo índice da paleta, sem sobrar nem faltar", () => {
    expect(NOTE_COLORS.every((_, index) => isNoteColor(index))).toBe(true);
    expect(isNoteColor(NOTE_COLORS.length)).toBe(false);
  });
});

describe("createEmptyBoard", () => {
  it("cria um board vazio na versão atual", () => {
    expect(createEmptyBoard()).toEqual({ version: SCHEMA_VERSION, notes: [] });
  });
});
