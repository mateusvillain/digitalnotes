import { COPY } from "@/lib/seo/copy";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

/** O cartão social da home em inglês. Vale para `/` e, por herança, para `/board/[id]`. */
export const alt = COPY.en.ogAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgImage("en");
}
