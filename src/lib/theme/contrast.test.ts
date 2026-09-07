import { describe, expect, it } from "vitest";
import { contrastRatio, parseHexColor, relativeLuminance } from "./contrast";

describe("parseHexColor", () => {
  it("aceita hex de 6 e de 3 dígitos", () => {
    expect(parseHexColor("#18181b")).toEqual({ r: 24, g: 24, b: 27 });
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("devolve null para valor inválido", () => {
    expect(parseHexColor("azul")).toBeNull();
    expect(parseHexColor("#12345")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("vai de 0 no preto a 1 no branco", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
  });
});

describe("contrastRatio", () => {
  it("dá 21 entre preto e branco e 1 entre cores iguais", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#4f46e5", "#4f46e5")).toBeCloseTo(1, 5);
  });

  it("é simétrico", () => {
    expect(contrastRatio("#18181b", "#fde68a")).toBeCloseTo(contrastRatio("#fde68a", "#18181b"), 5);
  });

  it("lança para cor inválida, porque isso é erro de programação, não dado do usuário", () => {
    expect(() => contrastRatio("#zzz", "#ffffff")).toThrow();
  });
});
