import type { Metadata } from "next";
import { COPY } from "./copy";
import { alternatesFor, HTML_LANG, OG_LOCALE, SITE_NAME, SITE_URL, type Locale } from "./site";

/**
 * A metadata que toda página de um idioma compartilha.
 *
 * Fica na raiz do layout daquele idioma, e não repetida em cada rota, porque o Next herda
 * e sobrescreve campo a campo: uma página que só muda o título não precisa redeclarar o
 * Open Graph inteiro, e quando ela esquece, é este bloco que ainda responde.
 *
 * `metadataBase` existe para que os caminhos relativos daqui para baixo (o `og:image`,
 * cada `canonical`) virem URLs absolutas — sem ele o Next avisa no build e as redes
 * sociais recebem um caminho que não resolve.
 */
export function localeMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: copy.title,
      template: copy.titleTemplate,
    },
    description: copy.description,
    applicationName: SITE_NAME,
    keywords: copy.keywords,
    alternates: alternatesFor(locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      url: alternatesFor(locale).canonical,
      locale: OG_LOCALE[locale],
      // Os outros idiomas viram `og:locale:alternate`, que é como o Facebook e o LinkedIn
      // descobrem que existe uma versão traduzida daquele mesmo endereço.
      alternateLocale: Object.values(OG_LOCALE).filter((it) => it !== OG_LOCALE[locale]),
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
    // O buscador já sabe indexar por padrão; o que este bloco acrescenta é a permissão
    // explícita de mostrar o texto inteiro no resultado, em vez do trecho curto que o
    // Google usa quando não recebe instrução nenhuma.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    other: {
      "content-language": HTML_LANG[locale],
    },
  };
}

/**
 * A metadata de um board compartilhado (`/board/[id]`).
 *
 * `noindex` porque o conteúdo é de quem criou o link: um board indexado colocaria anotação
 * pessoal no resultado de busca de qualquer pessoa. O `follow` fica ligado — o link de
 * volta para a home continua valendo — e nenhuma dessas URLs entra no sitemap.
 *
 * O `canonical` e o `hreflang` são apagados de propósito, e não esquecidos: o Next herda
 * os do layout, e herdados eles diriam que **todo** board é uma cópia da home. Isso é pior
 * do que não ter nenhum — a página passaria a disputar com a home a busca que é dela, e um
 * `canonical` para outra URL brigando com um `noindex` é instrução contraditória, do tipo
 * que o Google resolve sozinho e sem avisar qual lado escolheu.
 *
 * Nada assume o lugar deles: o identificador é a página inteira, então não existe uma URL
 * mais canônica do que ela mesma para apontar.
 */
export function boardMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];

  return {
    title: copy.board.title,
    description: copy.board.description,
    alternates: { canonical: null, languages: {} },
    robots: {
      index: false,
      follow: true,
      nocache: true,
      googleBot: { index: false, follow: true },
    },
    openGraph: {
      title: copy.board.title,
      description: copy.board.description,
    },
  };
}
