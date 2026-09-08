import type { Metadata } from "next";
import { SharedBoard } from "@/components/canvas/SharedBoard";
import { boardMetadata } from "@/lib/seo/metadata";

/** O mesmo board compartilhado da raiz (#21), servido sob o prefixo do português. */
export const metadata: Metadata = boardMetadata("pt");

export default async function BoardPagePt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SharedBoard id={id} />;
}
