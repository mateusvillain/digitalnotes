import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import { boardMetadata, localeMetadata } from "./metadata";
import { alternatesFor, DEFAULT_LOCALE, HTML_LANG, localePath, localeUrl, LOCALES } from "./site";

describe("caminhos por idioma", () => {
  it("põe o idioma padrão na raiz e o outro sob prefixo", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("pt")).toBe("/pt");
    expect(localePath("en", "/board/abc")).toBe("/board/abc");
    expect(localePath("pt", "/board/abc")).toBe("/pt/board/abc");
  });

  it("devolve URL absoluta, que é o que canonical e sitemap exigem", () => {
    expect(localeUrl("pt", "/board/abc")).toBe("https://virtualnot.es/pt/board/abc");
  });
});

describe("hreflang", () => {
  /**
   * O erro clássico: uma versão aponta para a outra, mas a outra não aponta de volta. O
   * Google descarta o conjunto inteiro quando isso acontece, e o sintoma é o idioma errado
   * aparecendo na busca — sem nenhum aviso de que as tags existem e estão sendo ignoradas.
   */
  it("é recíproco: toda versão lista todas, inclusive a si mesma", () => {
    for (const locale of LOCALES) {
      const { languages } = alternatesFor(locale);

      for (const other of LOCALES) {
        expect(languages[HTML_LANG[other]]).toBe(localeUrl(other));
      }
    }
  });

  it("aponta o x-default para o idioma padrão", () => {
    expect(alternatesFor("pt").languages["x-default"]).toBe(localeUrl(DEFAULT_LOCALE));
  });

  it("dá a cada idioma um canonical próprio, e não um compartilhado", () => {
    const canonicals = LOCALES.map((locale) => alternatesFor(locale).canonical);

    expect(new Set(canonicals).size).toBe(LOCALES.length);
  });
});

describe("metadata de board compartilhado", () => {
  it("não é indexável: o conteúdo é de quem criou o link", () => {
    expect(boardMetadata("en").robots).toMatchObject({ index: false });
  });

  /**
   * Herdado do layout, o canonical diria que todo board é uma cópia da home — e a home
   * passaria a disputar a própria busca com um documento que nem devia estar no índice.
   */
  it("apaga o canonical e o hreflang que herdaria do layout", () => {
    expect(boardMetadata("pt").alternates).toEqual({ canonical: null, languages: {} });
  });
});

describe("metadata de cada idioma", () => {
  it("descreve a página no idioma dela", () => {
    for (const locale of LOCALES) {
      expect(localeMetadata(locale).description).toBe(COPY[locale].description);
    }
  });

  it("declara as outras versões como og:locale:alternate, sem repetir a própria", () => {
    const openGraph = localeMetadata("en").openGraph;

    expect(openGraph).toMatchObject({ locale: "en_US", alternateLocale: ["pt_BR"] });
  });

  it("cabe no que o buscador mostra: título até 60 e descrição até 160 caracteres", () => {
    for (const locale of LOCALES) {
      expect(COPY[locale].title.length).toBeLessThanOrEqual(60);
      expect(COPY[locale].description.length).toBeLessThanOrEqual(160);
    }
  });
});
