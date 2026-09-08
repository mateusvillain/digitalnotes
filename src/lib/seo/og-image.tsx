import { ImageResponse } from "next/og";
import { COPY } from "./copy";
import { SITE_NAME, type Locale } from "./site";

/** O tamanho que o Facebook, o LinkedIn e o X esperam de um cartão grande. */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_CONTENT_TYPE = "image/png";

/** As cores dos post-its, na mesma ordem de `globals.css`. */
const NOTES = ["#fde68a", "#fbcfe8", "#bbf7d0", "#bfdbfe"];

/**
 * O cartão que aparece quando alguém cola o link do site em qualquer lugar.
 *
 * Gerado, e não um PNG no repositório, para que o texto acompanhe o idioma da página e não
 * saia de sincronia com a `description` no dia em que ela mudar.
 *
 * O desenho mostra o produto — post-its inclinados sobre a superfície do quadro — em vez
 * de um logotipo centralizado: quem vê esse cartão está decidindo se clica, e o que
 * convence é reconhecer na hora o que tem do outro lado.
 */
export function renderOgImage(locale: Locale) {
  const copy = COPY[locale];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f4f4f5",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", gap: 32 }}>
        {NOTES.map((color, index) => (
          <div
            key={color}
            style={{
              width: 200,
              height: 200,
              background: color,
              borderRadius: 8,
              // Cada um torto para um lado: alinhados, pareceriam blocos de uma paleta
              // de cores em vez de papel largado num quadro.
              transform: `rotate(${(index - 1) * 4}deg)`,
              boxShadow: "0 10px 24px rgba(24,24,27,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 14,
              padding: 24,
            }}
          >
            <div style={{ height: 12, borderRadius: 6, background: "#27272a", opacity: 0.45 }} />
            <div
              style={{
                height: 12,
                width: "60%",
                borderRadius: 6,
                background: "#27272a",
                opacity: 0.45,
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 68, fontWeight: 700, color: "#18181b" }}>{SITE_NAME}</div>
        <div style={{ fontSize: 34, color: "#52525b" }}>{copy.tagline}</div>
      </div>
    </div>,
    OG_SIZE,
  );
}
