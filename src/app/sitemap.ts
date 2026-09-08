import type { MetadataRoute } from "next";
import { alternatesFor, DEFAULT_LOCALE, localeUrl, LOCALES } from "@/lib/seo/site";

/**
 * O sitemap — só as duas homes, porque só elas são páginas indexáveis.
 *
 * Cada entrada declara as versões de idioma da outra em `alternates.languages`, que é o
 * `hreflang` dito no sitemap em vez de na `<head>`. Os dois lugares valem, e repetir o
 * sinal é o que o Google recomenda quando o conjunto é pequeno: se uma das versões deixar
 * de ser rastreada, a outra ainda declara que ela existe.
 *
 * Nenhum board entra aqui. Listar URLs `noindex` num sitemap é pedir ao rastreador que
 * visite páginas que ele foi instruído a não indexar.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const { languages } = alternatesFor(DEFAULT_LOCALE);

  return LOCALES.map((locale) => ({
    url: localeUrl(locale),
    changeFrequency: "monthly",
    // A home do idioma padrão é a que deve ganhar quando as duas disputam a mesma busca.
    priority: locale === DEFAULT_LOCALE ? 1 : 0.8,
    alternates: { languages },
  }));
}
