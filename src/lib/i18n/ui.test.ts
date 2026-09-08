import { describe, expect, it } from "vitest";
import { NOTE_COLORS } from "@/lib/board/types";
import { LOCALES } from "@/lib/seo/site";
import { UI, type UiCopy } from "./ui";

/** Todas as folhas de texto do dicionário, com o caminho até cada uma. */
function entries(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node !== "object" || node === null) return [];

  return Object.entries(node).flatMap(([key, value]) =>
    entries(value, path === "" ? key : `${path}.${key}`),
  );
}

describe("dicionário da interface", () => {
  /**
   * O erro que este arquivo existe para impedir: uma dica de botão que ficou só em
   * português numa página que se declara em inglês. O tipo garante que a chave existe; o
   * teste garante que ela tem texto.
   */
  it("não deixa nenhum texto vazio em nenhum idioma", () => {
    for (const locale of LOCALES) {
      for (const [path, text] of entries(UI[locale])) {
        expect(text.trim(), `${locale}.${path}`).not.toBe("");
      }
    }
  });

  it("cobre exatamente as mesmas chaves nos dois idiomas", () => {
    const [first, ...rest] = LOCALES.map((locale) => entries(UI[locale]).map(([path]) => path));

    for (const other of rest) expect(other).toEqual(first);
  });

  /**
   * Um rótulo por cor da paleta, e nenhum repetido: são eles que um leitor de tela usa
   * para diferenciar os seis botões do seletor, que fora isso são quadrados iguais.
   */
  it("dá um rótulo próprio a cada cor, nos dois idiomas", () => {
    for (const locale of LOCALES) {
      const labels = NOTE_COLORS.map((name) => UI[locale].note.colors[name]);

      expect(new Set(labels).size, locale).toBe(NOTE_COLORS.length);
    }
  });

  /**
   * O `Tooltip` deste projeto repete o `aria-label` do gatilho. Uma chave por botão é o
   * que impede a tela e o leitor de tela de dizerem coisas diferentes sobre o mesmo botão.
   */
  it("não diz mais 'post-it': a peça se chama nota", () => {
    for (const locale of LOCALES) {
      for (const [path, text] of entries(UI[locale] as UiCopy)) {
        expect(text.toLowerCase(), `${locale}.${path}`).not.toMatch(/post-?it/);
      }
    }
  });
});
