import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const iconPath = resolve(import.meta.dirname, "icon.svg");
const icon = readFileSync(iconPath, "utf8");

/**
 * O favicon, verificado como arquivo.
 *
 * Existe por uma falha que aconteceu de verdade e não deu sinal nenhum: o comentário no
 * topo do arquivo citava um token CSS pelo nome completo, com os dois hifens da frente. XML
 * proíbe dois hifens seguidos dentro de um comentário, então o arquivo inteiro virou
 * malformado — e o navegador simplesmente não desenhou o ícone. O servidor respondia `200`,
 * o `<link rel="icon">` estava na página, o arquivo estava lá, e a aba ficava sem marca.
 *
 * Nenhum outro teste pegaria isso: não há componente para montar nem função para chamar.
 */
describe("favicon", () => {
  it("é XML bem-formado", () => {
    const parsed = new DOMParser().parseFromString(icon, "image/svg+xml");

    expect(parsed.querySelector("parsererror")?.textContent ?? null).toBeNull();
    expect(parsed.documentElement.tagName).toBe("svg");
  });

  it("não tem dois hifens seguidos dentro do comentário", () => {
    // A regra que o parser cobre acima, dita de novo em cima da causa: é o erro que se
    // comete escrevendo prosa, e a mensagem aqui é o que explica o que houve.
    for (const comment of icon.match(/<!--[\s\S]*?-->/g) ?? []) {
      expect(comment.slice(4, -3)).not.toContain("--");
    }
  });

  it("declara o viewBox, sem o qual não escala para os tamanhos que os sistemas pedem", () => {
    expect(icon).toContain('viewBox="0 0 32 32"');
  });
});
