import { Whiteboard } from "@/components/canvas/Whiteboard";
import { HomeJsonLd } from "@/lib/seo/JsonLd";

/**
 * A home em inglês, na raiz do domínio.
 *
 * O JSON-LD entra aqui e não no layout porque descreve *esta* página como a aplicação. No
 * layout ele seria repetido em `/board/[id]`, e um board compartilhado anunciado como se
 * fosse a página do produto disputa com a home o resultado de busca que é dela.
 */
export default function Home() {
  return (
    <>
      <HomeJsonLd locale="en" />
      <Whiteboard />
    </>
  );
}
