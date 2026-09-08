import type { Metadata } from "next";
import { SharedBoard } from "@/components/canvas/SharedBoard";
import { boardMetadata } from "@/lib/seo/metadata";

/**
 * Rota de um board compartilhado (issue #21).
 *
 * A busca acontece no cliente, e não aqui: o board é uma cópia de trabalho que vive na
 * store do navegador, e renderizá-lo no servidor obrigaria a esperar o backend antes de
 * mandar qualquer HTML — sem ganho nenhum para um documento que não é indexável.
 */
export const metadata: Metadata = boardMetadata("en");

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SharedBoard id={id} />;
}
