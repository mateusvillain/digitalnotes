import { Whiteboard } from "@/components/canvas/Whiteboard";

/** Valor de `?board=novo`, que pede um quadro em branco em vez do rascunho salvo (#47). */
const NEW_BOARD_PARAM = "novo";

/**
 * A rota raiz: o whiteboard de trabalho, restaurado do autosave local.
 *
 * `?board=novo` começa em branco. É o que a página de link inválido oferece como ação
 * principal: quem chegou por um link que não existe mais quer um quadro para usar agora,
 * e não necessariamente o rascunho que deixou pela metade.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;

  return <Whiteboard restoreLocal={board !== NEW_BOARD_PARAM} />;
}
