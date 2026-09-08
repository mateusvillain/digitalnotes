import { COPY } from "@/lib/seo/copy";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

/** O mesmo cartão, com a chamada em português. */
export const alt = COPY.pt.ogAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImagePt() {
  return renderOgImage("pt");
}
