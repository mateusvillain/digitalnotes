import { COPY } from "./copy";
import { HTML_LANG, localeUrl, SITE_NAME, SITE_URL, type Locale } from "./site";

/**
 * Os dados estruturados da home, em JSON-LD (schema.org).
 *
 * É a única parte do SEO que fala com o buscador em vez de com uma pessoa: descreve o que
 * o produto é — uma aplicação web, gratuita, que roda no navegador — num formato que o
 * Google lê sem precisar interpretar o texto da página. Numa aplicação de canvas como esta
 * isso pesa mais do que o normal, porque não há parágrafo nenhum para ele interpretar.
 *
 * `WebSite` e `WebApplication` juntos, ligados por `@id`: o primeiro é o site como entidade
 * (o que dá ao Google o nome que ele mostra no lugar do domínio), o segundo é o software.
 * Declarar os dois soltos faria parecerem coisas sem relação.
 */
export function HomeJsonLd({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const url = localeUrl(locale);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: copy.description,
        inLanguage: HTML_LANG[locale],
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url,
        description: copy.description,
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": `${SITE_URL}/#website` },
        applicationCategory: "ProductivityApplication",
        // Roda inteiro no navegador: não há binário para baixar nem sistema operacional
        // que a resposta precise citar.
        browserRequirements: "Requires JavaScript.",
        operatingSystem: "Any",
        // Gratuito **e** sem cadastro são coisas diferentes, e as duas são o argumento de
        // venda. `price: "0"` é o que habilita o selo de preço no resultado de busca.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: copy.keywords,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // O conteúdo é constante e escrito aqui — não vem de board nenhum. A troca de `<`
      // fecha o único jeito de o JSON encerrar a tag `script` antes da hora.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
