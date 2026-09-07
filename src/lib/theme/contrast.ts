/**
 * Cálculo de razão de contraste da WCAG 2.1, usado para provar que os tokens de cor
 * atendem ao nível AA em vez de ficarmos no achismo.
 *
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Contraste mínimo exigido pela WCAG AA para texto normal. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Converte `#rgb` ou `#rrggbb` em canais 0–255. Devolve `null` se não for um hex válido. */
export function parseHexColor(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

/** Luminância relativa de uma cor, conforme a WCAG. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Razão de contraste entre duas cores hex, de 1 (idênticas) a 21 (preto no branco). */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);

  if (fg === null || bg === null) {
    throw new Error(`Cor hex inválida: ${fg === null ? foreground : background}`);
  }

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));

  return (lighter + 0.05) / (darker + 0.05);
}
