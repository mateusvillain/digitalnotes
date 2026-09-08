import type { Metadata } from "next";
import { Document } from "@/components/shell/Document";
import { NotFoundScreen } from "@/components/shell/NotFoundScreen";
import { COPY } from "@/lib/seo/copy";
import { DEFAULT_LOCALE } from "@/lib/seo/site";

/**
 * O 404 de qualquer endereço que não casa com rota nenhuma (issue #47).
 *
 * Precisa monter o próprio `<html>` porque é o único arquivo da árvore que fica fora dos
 * grupos de idioma — e é neles que moram os layouts raiz. Sem o `Document`, o Next
 * renderiza esta tela sem layout algum: sem folha de estilo, sem `lang` e com o 404
 * técnico do framework no título, que é exatamente o que a #47 existe para evitar.
 *
 * Responde no idioma padrão, inclusive para um endereço errado abaixo de `/pt`. Um
 * `not-found` dentro daquele grupo até acertaria o idioma, mas o Next renderiza a tela de
 * `not-found` aninhada na própria casca de erro dele, fora dos layouts raiz — ou seja, sem
 * folha de estilo. Uma página 404 legível em inglês vale mais do que uma sem estilo em
 * português, ainda mais numa tela que ninguém indexa e da qual só se quer sair.
 */
export const metadata: Metadata = {
  title: COPY[DEFAULT_LOCALE].notFound.title,
  description: COPY[DEFAULT_LOCALE].notFound.description,
  // Nem indexar nem seguir: a página não existe, e o `404` no cabeçalho já resolve para o
  // buscador — mas não há por que passar autoridade adiante a partir de um link errado.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Document locale={DEFAULT_LOCALE}>
      <NotFoundScreen home="/" locale={DEFAULT_LOCALE} />
    </Document>
  );
}
