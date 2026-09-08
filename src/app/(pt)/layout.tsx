import type { Metadata } from "next";
import { Document } from "@/components/shell/Document";
import { localeMetadata } from "@/lib/seo/metadata";

/**
 * O layout raiz do português, servido sob o prefixo `/pt`.
 *
 * Um layout raiz separado do inglês, e não um layout aninhado, porque o que muda entre os
 * dois é o `lang` do `<html>` — atributo que só o layout raiz controla.
 */
export const metadata: Metadata = localeMetadata("pt");

// `LayoutProps<"/">` e não `<"/pt">`: os dois grupos de idioma são layouts *raiz*, e para
// o Next os dois estão na raiz da árvore de rotas. O `/pt` da URL vem do segmento abaixo.
export default function PtLayout({ children }: LayoutProps<"/">) {
  return <Document locale="pt">{children}</Document>;
}
