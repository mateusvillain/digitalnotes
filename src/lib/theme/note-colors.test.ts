import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_COLORS, STROKE_COLOR_BLACK } from "@/lib/board/types";
import { WCAG_AA_NORMAL_TEXT, contrastRatio, parseHexColor } from "./contrast";
import { NOTE_INK_VAR, noteBackgroundVar, strokeColor } from "./note-colors";

const globalsCss = readFileSync(resolve(import.meta.dirname, "../../app/globals.css"), "utf8");

/**
 * Conteúdo do bloco `@theme` de globals.css, sem comentários.
 *
 * Ler o CSS de verdade é o que faz este teste valer alguma coisa: ele prova o contraste dos
 * tokens que a aplicação realmente usa, não de uma cópia dos valores mantida no teste. Em
 * troca, precisa isolar o bloco e ignorar comentários, senão um valor citado em prosa
 * passaria por token.
 */
const themeBlock = (() => {
  const start = globalsCss.indexOf("@theme {");
  if (start === -1) throw new Error("Bloco @theme não encontrado em globals.css");

  let depth = 0;
  for (let index = globalsCss.indexOf("{", start); index < globalsCss.length; index += 1) {
    if (globalsCss[index] === "{") depth += 1;
    if (globalsCss[index] === "}") {
      depth -= 1;
      if (depth === 0) return globalsCss.slice(start, index).replace(/\/\*[\s\S]*?\*\//g, "");
    }
  }
  throw new Error("Bloco @theme não fecha em globals.css");
})();

/** Lê o valor declarado de um token no bloco `@theme`. */
function tokenValue(name: string): string {
  const match = themeBlock.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"));
  if (match?.[1] === undefined) throw new Error(`Token ${name} não declarado em @theme`);
  return match[1].trim();
}

describe("tokenValue", () => {
  it("não confunde um token com outro de nome mais longo", () => {
    expect(tokenValue("--color-ink")).not.toBe(tokenValue("--color-ink-muted"));
  });

  it("falha alto quando o token não existe, em vez de devolver algo errado", () => {
    expect(() => tokenValue("--color-inexistente")).toThrow();
  });
});

describe("tokens de cor do post-it", () => {
  it("resolve o índice do board para a variável CSS correspondente", () => {
    expect(noteBackgroundVar(0)).toBe("--color-note-yellow");
    expect(noteBackgroundVar(5)).toBe("--color-note-orange");
  });

  it.each(NOTE_COLORS.map((_, index) => index as Parameters<typeof noteBackgroundVar>[0]))(
    "declara a cor de índice %i como hex válido em @theme",
    (index) => {
      expect(parseHexColor(tokenValue(noteBackgroundVar(index)))).not.toBeNull();
    },
  );

  it.each(NOTE_COLORS.map((_, index) => index as Parameters<typeof noteBackgroundVar>[0]))(
    "atende WCAG AA para texto normal na cor de índice %i",
    (index) => {
      const ratio = contrastRatio(tokenValue(NOTE_INK_VAR), tokenValue(noteBackgroundVar(index)));

      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    },
  );
});

describe("tokens de cor do traço (#69)", () => {
  it("o preto do lápis reusa --color-ink, e não um token próprio", () => {
    expect(strokeColor(STROKE_COLOR_BLACK)).toBe("var(--color-ink)");
  });

  /**
   * O critério de aceite pede o mesmo contraste que as cores de nota já garantem — aqui
   * sobre `--color-canvas`, e não `--color-surface`: é sobre o quadro que o traço é
   * desenhado, nunca sobre o fundo de um post-it.
   */
  it("atende WCAG AA sobre a superfície do quadro", () => {
    const ratio = contrastRatio(tokenValue("--color-ink"), tokenValue("--color-canvas"));

    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});

describe("tokens de texto sobre as superfícies da interface", () => {
  it.each([
    ["--color-ink", "--color-surface"],
    ["--color-ink", "--color-canvas"],
    ["--color-ink-muted", "--color-surface"],
    ["--color-ink-muted", "--color-canvas"],
  ])("atende WCAG AA para %s sobre %s", (ink, surface) => {
    expect(contrastRatio(tokenValue(ink), tokenValue(surface))).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    );
  });
});
