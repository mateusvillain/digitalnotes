import type { MetadataRoute } from "next";
import { COPY } from "@/lib/seo/copy";
import { DEFAULT_LOCALE, HTML_LANG, SITE_NAME } from "@/lib/seo/site";

/**
 * O manifesto de aplicação web.
 *
 * Não é sinal de ranqueamento, mas é o que faz o quadro virar um ícone na tela inicial de
 * quem abre no celular — e instalação é uso recorrente, que é o sinal que conta. Escrito
 * no idioma padrão porque o manifesto é um só para o site inteiro.
 */
export default function manifest(): MetadataRoute.Manifest {
  const copy = COPY[DEFAULT_LOCALE];

  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: copy.description,
    lang: HTML_LANG[DEFAULT_LOCALE],
    start_url: "/",
    display: "standalone",
    // As mesmas cores de `globals.css`: a superfície do quadro e a tinta do texto.
    background_color: "#f4f4f5",
    theme_color: "#f4f4f5",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
