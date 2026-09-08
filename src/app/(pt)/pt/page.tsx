import { Whiteboard } from "@/components/canvas/Whiteboard";
import { HomeJsonLd } from "@/lib/seo/JsonLd";

/** A home em português, em `/pt`. Mesmo quadro da raiz, com a metadata do outro idioma. */
export default function HomePt() {
  return (
    <>
      <HomeJsonLd locale="pt" />
      <Whiteboard />
    </>
  );
}
