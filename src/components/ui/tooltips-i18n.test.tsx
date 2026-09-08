import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test-utils/matchMedia";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { UI } from "@/lib/i18n/ui";
import { LOCALES } from "@/lib/seo/site";
import { TOOLTIP_DELAY_MS } from "@/components/ui/Tooltip";
import { Whiteboard } from "@/components/canvas/Whiteboard";

afterEach(() => vi.unstubAllGlobals());

/**
 * O idioma dos botões flutuantes do quadro.
 *
 * A regressão que este arquivo existe para impedir aconteceu de verdade: a página em `/`
 * passou a se declarar `lang="en"` e as dicas dos botões continuaram em português, porque
 * cada uma era uma string solta dentro do seu componente. Um teste por componente não
 * pegaria isso — o que falha aqui é a montagem inteira, no idioma da rota.
 */
describe("interface do quadro em cada idioma", () => {
  it("nomeia os botões no idioma da rota", () => {
    for (const locale of LOCALES) {
      stubMatchMedia(false);
      const { unmount } = render(
        <LocaleProvider locale={locale}>
          <Whiteboard />
        </LocaleProvider>,
      );
      const ui = UI[locale];

      expect(screen.getByRole("button", { name: ui.save.action })).toBeDefined();
      expect(screen.getByRole("button", { name: ui.newBoard.action })).toBeDefined();
      expect(screen.getByRole("button", { name: ui.zoom.in })).toBeDefined();
      expect(screen.getByRole("button", { name: ui.zoom.out })).toBeDefined();
      expect(screen.getByRole("button", { name: ui.zoom.reset })).toBeDefined();

      unmount();
    }
  });

  /**
   * O `Tooltip` deste projeto **repete** o `aria-label` do gatilho, em vez de derivá-lo. Se
   * os dois textos divergirem, a tela e o leitor de tela passam a dizer coisas diferentes
   * sobre o mesmo botão — e a única defesa contra isso é os dois saírem da mesma chave.
   */
  it("escreve na dica o mesmo que anuncia ao leitor de tela", async () => {
    // Mesmo par do teste do Tooltip: sem `shouldAdvanceTime`, o `userEvent` fica esperando
    // um relógio que ninguém anda.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubMatchMedia(false);
    render(
      <LocaleProvider locale="pt">
        <Whiteboard />
      </LocaleProvider>,
    );

    await userEvent.hover(screen.getByRole("button", { name: UI.pt.save.action }));
    await vi.advanceTimersByTimeAsync(TOOLTIP_DELAY_MS);

    // A dica é escondida do leitor de tela justamente por repetir o `aria-label`; o que
    // este caso guarda é que ela **continua** repetindo, e no mesmo idioma.
    const dica = await screen.findByText(UI.pt.save.action);

    expect(dica.getAttribute("aria-hidden")).toBe("true");
    vi.useRealTimers();
  });
});
