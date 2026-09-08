import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test-utils/matchMedia";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/seo/site";
import { Onboarding } from "./Onboarding";
import { ONBOARDING } from "@/lib/i18n/onboarding";

afterEach(() => vi.unstubAllGlobals());

/** Finge a máquina de quem está lendo: teclado ou dedo, Mac ou não. */
function aparelho({ toque = false, mac = false } = {}) {
  stubMatchMedia(toque);
  vi.stubGlobal("navigator", { platform: mac ? "MacIntel" : "Win32", userAgent: "" });
}

/** Monta a apresentação no idioma pedido, como o layout raiz faz em produção. */
function renderiza(locale: Locale) {
  return render(
    <LocaleProvider locale={locale}>
      <Onboarding />
    </LocaleProvider>,
  );
}

describe("apresentação do quadro vazio", () => {
  it("fala o idioma da rota", () => {
    aparelho();
    const { unmount } = renderiza("pt");

    expect(screen.getByRole("heading", { name: "Boas-vindas ao Virtual Notes" })).toBeDefined();
    expect(screen.getByText(ONBOARDING.pt.shortcuts[0]!.label)).toBeDefined();

    unmount();
    renderiza("en");

    expect(screen.getByRole("heading", { name: "Welcome to Virtual Notes" })).toBeDefined();
    expect(screen.getByText(ONBOARDING.en.shortcuts[0]!.label)).toBeDefined();
  });

  it("ensina três coisas, e não a lista inteira de atalhos", () => {
    aparelho();
    renderiza("pt");

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("mostra as teclas como teclas", () => {
    aparelho();
    const { container } = renderiza("pt");

    const teclas = [...container.querySelectorAll("kbd")].map((it) => it.textContent);

    expect(teclas).toEqual(["N", "Espaço", "Ctrl", "S"]);
  });

  /**
   * Metade dos visitantes de um produto assim está num Mac, e lá a tecla é `⌘`. Mostrar
   * "Ctrl" a essas pessoas ensina um atalho que não funciona na máquina delas.
   */
  it("escreve ⌘ no Mac e Ctrl no resto", () => {
    aparelho({ mac: true });
    const { container, unmount } = renderiza("en");

    expect([...container.querySelectorAll("kbd")].map((it) => it.textContent)).toContain("⌘");

    unmount();
    aparelho({ mac: false });
    const segundo = renderiza("en");

    expect([...segundo.container.querySelectorAll("kbd")].map((it) => it.textContent)).toContain(
      "Ctrl",
    );
  });

  /**
   * A dica errada é pior do que dica nenhuma: num celular não há tecla nenhuma para
   * apertar, então as três linhas viram gestos.
   */
  it("no toque, troca as teclas por gestos", () => {
    aparelho({ toque: true });
    const { container } = renderiza("pt");

    expect(container.querySelector("kbd")).toBeNull();
    expect(screen.getByText(/Toque duas vezes/)).toBeDefined();
    expect(screen.getByText(/Arraste um dedo/)).toBeDefined();
    expect(screen.getByText(/Junte dois dedos/)).toBeDefined();
  });

  /**
   * O primeiro post-it costuma nascer de um duplo clique dado bem no meio do quadro — ou
   * seja, em cima desta peça. Se ela capturasse o ponteiro, ensinaria o gesto e ao mesmo
   * tempo o impediria de funcionar.
   */
  it("não intercepta o ponteiro: o quadro continua clicável por baixo", () => {
    aparelho();
    renderiza("pt");

    expect(screen.getByTestId("onboarding").className).toContain("pointer-events-none");
  });

  it("não compete com o título da página: entra como subtítulo", () => {
    aparelho();
    renderiza("en");

    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });
});
