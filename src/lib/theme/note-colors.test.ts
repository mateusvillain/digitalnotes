import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_COLORS } from "@/lib/board/types";
import { WCAG_AA_NORMAL_TEXT, contrastRatio, parseHexColor } from "./contrast";
import { NOTE_BACKGROUND_VARS, NOTE_INK_VAR, noteBackgroundVar } from "./note-colors";

const globalsCss = readFileSync(resolve(import.meta.dirname, "../../app/globals.css"), "utf8");

/** Lê o valor declarado de uma variável CSS no bloco `:root` de globals.css. */
function tokenValue(name: string): string {
  const match = globalsCss.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (match?.[1] === undefined) throw new Error(`Token ${name} não encontrado em globals.css`);
  return match[1].trim();
}

describe("tokens de cor do post-it", () => {
  it("tem um token para cada cor da paleta do contrato, na mesma ordem", () => {
    expect(Object.keys(NOTE_BACKGROUND_VARS)).toEqual([...NOTE_COLORS]);
  });

  it("resolve o índice do board para a variável CSS correspondente", () => {
    expect(noteBackgroundVar(0)).toBe("--color-note-yellow");
    expect(noteBackgroundVar(5)).toBe("--color-note-orange");
  });

  it.each(NOTE_COLORS)("declara %s como hex válido em globals.css", (name) => {
    expect(parseHexColor(tokenValue(NOTE_BACKGROUND_VARS[name]))).not.toBeNull();
  });

  it.each(NOTE_COLORS)("atende WCAG AA para texto normal em %s", (name) => {
    const ratio = contrastRatio(tokenValue(NOTE_INK_VAR), tokenValue(NOTE_BACKGROUND_VARS[name]));

    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});

describe("tokens de texto sobre as superfícies da interface", () => {
  it.each([
    ["--color-ink", "--color-surface"],
    ["--color-ink", "--color-canvas"],
    ["--color-ink-muted", "--color-surface"],
    ["--color-accent-contrast", "--color-accent"],
  ])("atende WCAG AA para %s sobre %s", (ink, surface) => {
    expect(contrastRatio(tokenValue(ink), tokenValue(surface))).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });
});
