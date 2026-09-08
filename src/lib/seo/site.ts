/**
 * Identidade do site e tudo que os buscadores leem sobre ele.
 *
 * Um arquivo só para o nome, o domínio e o texto de cada idioma porque essas strings
 * aparecem em lugares que não se enxergam: `<title>`, Open Graph, JSON-LD, sitemap,
 * manifest. Espalhadas, uma mudança de posicionamento vira uma caçada — e um `title` que
 * discorda do `og:title` é exatamente o tipo de incoerência que custa clique na busca.
 *
 * O idioma padrão é o inglês e ele mora na raiz: é o mercado maior, e a home é a URL com
 * mais autoridade do domínio. O português ganha um prefixo (`/pt`) em vez de dividir a
 * raiz por `Accept-Language` — sem URL própria não existe `hreflang`, e sem `hreflang` o
 * Google escolhe uma versão só e ignora a outra.
 */

export const SITE_NAME = "Virtual Notes";

/**
 * A origem canônica. Fixa, e não derivada de `VERCEL_URL`: cada deploy de preview tem um
 * host diferente, e um `canonical` apontando para um deles ensinaria o buscador a indexar
 * uma URL que morre na semana seguinte.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtualnot.es";

export const LOCALES = ["en", "pt"] as const;

export type Locale = (typeof LOCALES)[number];

/** O idioma da raiz — e o `x-default` que os buscadores servem a quem não casa com nenhum. */
export const DEFAULT_LOCALE: Locale = "en";

/** Valor do atributo `lang` do `<html>` e do `hreflang` de cada versão. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  pt: "pt-BR",
};

/** Open Graph usa o formato `idioma_TERRITÓRIO`, diferente do `hreflang`. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  pt: "pt_BR",
};

/** Prefixo de cada idioma na URL. O padrão fica na raiz, por isso o prefixo vazio. */
const PATH_PREFIX: Record<Locale, string> = {
  en: "",
  pt: "/pt",
};

/**
 * O caminho de `path` no idioma pedido — `/board/x` vira `/pt/board/x`.
 *
 * Normaliza a barra final porque `/` e `/pt/` são URLs diferentes para um buscador, e
 * duas URLs com o mesmo conteúdo dividem entre si a autoridade que deveria ser de uma.
 */
export function localePath(locale: Locale, path = "/"): string {
  const suffix = path === "/" ? "" : path;

  return `${PATH_PREFIX[locale]}${suffix}` || "/";
}

/** A URL absoluta de `path` naquele idioma. Canonical e sitemap exigem absoluta. */
export function localeUrl(locale: Locale, path = "/"): string {
  return new URL(localePath(locale, path), SITE_URL).toString();
}

/**
 * O bloco `alternates` de uma página: o canonical dela e as outras versões de idioma.
 *
 * Todas as versões se listam mutuamente, inclusive a si mesmas — é o que a documentação do
 * Google pede, e um conjunto de `hreflang` que não fecha é descartado inteiro.
 */
export function alternatesFor(
  locale: Locale,
  path = "/",
): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: localeUrl(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((it) => [HTML_LANG[it], localeUrl(it, path)])),
      "x-default": localeUrl(DEFAULT_LOCALE, path),
    },
  };
}
