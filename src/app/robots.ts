import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * O `robots.txt`, gerado em vez de escrito à mão para que o domínio saia de um lugar só.
 *
 * Os boards ficam de fora do rastreamento por serem documentos de quem compartilhou o
 * link (o `noindex` de cada um já diz isso, mas `robots.txt` evita a visita antes dela
 * acontecer). A API sai junto: são respostas JSON que não têm o que fazer num índice de
 * busca, e cada uma delas rastreada é orçamento gasto fora das páginas que importam.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/board/", "/pt/board/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
