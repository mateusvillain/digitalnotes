import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test-utils/matchMedia";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/seo/site";
import { Onboarding } from "./Onboarding";
import { ONBOARDING } from "@/lib/i18n/onboarding";
import { UI } from "@/lib/i18n/ui";

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

  /**
   * Quatro é o teto que a peça aguenta de relance; a quinta linha já é manual. Se este
   * número subir, é sinal de que uma linha antiga devia ter saído no lugar.
   */
  it("ensina quatro coisas, e não a lista inteira de atalhos", () => {
    aparelho();
    renderiza("pt");

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("mostra as teclas como teclas", () => {
    aparelho();
    const { container } = renderiza("pt");

    const teclas = [...container.querySelectorAll("kbd")].map((it) => it.textContent);

    expect(teclas).toEqual(["N", "P", "Espaço", "Ctrl", "S"]);
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
   * O rótulo, e não só a tecla: a tecla já está coberta pelo caso acima, e o que este
   * guarda é a palavra — que precisa existir nos dois idiomas e ser a mesma que o botão do
   * lápis usa, senão a apresentação e a interface passam a chamar a mesma coisa de dois
   * nomes.
   */
  it("dá ao lápis um rótulo próprio nos dois idiomas", () => {
    aparelho();
    const { unmount } = renderiza("pt");

    expect(screen.getByText("Lápis").textContent).toBe(UI.pt.pencil.action);

    unmount();
    aparelho();
    renderiza("en");

    expect(screen.getByText("Pencil").textContent).toBe(UI.en.pencil.action);
  });

  /**
   * A mesma regra do lápis, agora sobre a peça que mudou de nome (#81): a apresentação e o
   * botão precisam chamar a nota pelo mesmo nome, senão a interface passa a ter dois.
   *
   * Comparado com `UI`, e não com o literal: um teste que fixasse "Nota adesiva" continuaria
   * passando no dia em que só o botão fosse renomeado, que é exatamente o defeito que ele
   * existe para pegar.
   */
  it("chama a nota pelo mesmo nome que o botão, nos dois idiomas", () => {
    aparelho();
    const { unmount } = renderiza("pt");

    expect(screen.getByText(UI.pt.note.action)).toBeDefined();

    unmount();
    aparelho();
    renderiza("en");

    expect(screen.getByText(UI.en.note.action)).toBeDefined();
  });

  /**
   * A lista de toque **não** acompanhou o nome (#81).
   *
   * Ela é a única das duas escrita como resultado de um gesto, e não como nome de
   * ferramenta: lá não há tecla `N` para associar a um nome, há um duplo toque e o que ele
   * produz. O nome completo importa onde a peça é escolhida — o botão e a linha de teclado.
   */
  it("no toque, a linha da nota continua nomeando o gesto, e não a ferramenta", () => {
    aparelho({ toque: true });
    const { unmount } = renderiza("pt");

    expect(screen.getByText("Nova nota")).toBeDefined();
    expect(screen.queryByText(UI.pt.note.action)).toBeNull();

    unmount();
    aparelho({ toque: true });
    renderiza("en");

    expect(screen.getByText("New note")).toBeDefined();
    expect(screen.queryByText(UI.en.note.action)).toBeNull();
  });

  /**
   * No toque o lápis não é gesto nenhum: é um botão que fica na tela o tempo todo. A
   * apresentação existe para ensinar o que não se descobre olhando, e uma linha mandando
   * tocar num botão visível gastaria uma das poucas que cabem.
   */
  it("não leva o lápis para a lista de toque, onde não há tecla para apertar", () => {
    aparelho({ toque: true });
    const { unmount } = renderiza("pt");

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Lápis")).toBeNull();

    unmount();
    aparelho({ toque: true });
    renderiza("en");

    expect(screen.queryByText("Pencil")).toBeNull();
  });

  /**
   * A dica errada é pior do que dica nenhuma: num celular não há tecla nenhuma para
   * apertar, então as linhas viram gestos.
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
