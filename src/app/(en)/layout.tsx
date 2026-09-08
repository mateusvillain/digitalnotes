import type { Metadata } from "next";
import { Document } from "@/components/shell/Document";
import { localeMetadata } from "@/lib/seo/metadata";

/**
 * O layout raiz do inglês, que é o idioma padrão e por isso mora na raiz do domínio.
 *
 * O grupo `(en)` não aparece na URL: `/` e `/board/[id]` continuam sendo os endereços de
 * sempre. Ele existe só para dar a este idioma um layout raiz próprio, já que o `<html>`
 * precisa declarar um `lang` diferente do de `/pt`.
 */
export const metadata: Metadata = localeMetadata("en");

export default function EnLayout({ children }: LayoutProps<"/">) {
  return <Document locale="en">{children}</Document>;
}
