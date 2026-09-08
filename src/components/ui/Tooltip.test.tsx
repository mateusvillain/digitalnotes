import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip, TOOLTIP_DELAY_MS } from "./Tooltip";

function renderTooltip(label = "Compartilhar whiteboard") {
  const onClick = vi.fn();
  render(
    <Tooltip label={label}>
      <button type="button" onClick={onClick} aria-label={label}>
        <svg aria-hidden="true" />
      </button>
    </Tooltip>,
  );
  return { button: screen.getByRole("button", { name: label }), onClick };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Tooltip", () => {
  it("não aparece antes de o cursor parar sobre o botão", async () => {
    const { button } = renderTooltip();

    await userEvent.hover(button);

    // Atravessar a fileira de controles a caminho do quadro não pode piscar caixas.
    expect(screen.queryByText("Compartilhar whiteboard")).toBeNull();
  });

  it("aparece depois da espera, com o cursor parado", async () => {
    const { button } = renderTooltip();

    await userEvent.hover(button);
    await vi.advanceTimersByTimeAsync(TOOLTIP_DELAY_MS);

    expect(await screen.findByText("Compartilhar whiteboard")).toBeDefined();
  });

  it("some quando o cursor sai", async () => {
    const { button } = renderTooltip();
    await userEvent.hover(button);
    await vi.advanceTimersByTimeAsync(TOOLTIP_DELAY_MS);
    await screen.findByText("Compartilhar whiteboard");

    await userEvent.unhover(button);

    await waitFor(() => expect(screen.queryByText("Compartilhar whiteboard")).toBeNull());
  });

  it("aparece na hora ao chegar no botão pelo teclado", async () => {
    const { button } = renderTooltip();

    await userEvent.tab();

    // Pelo teclado a intenção já está declarada pelo foco; esperar seria atraso à toa.
    expect(document.activeElement).toBe(button);
    expect(await screen.findByText("Compartilhar whiteboard")).toBeDefined();
  });

  it("some ao perder o foco", async () => {
    const { button } = renderTooltip();
    await userEvent.tab();
    await screen.findByText("Compartilhar whiteboard");

    button.blur();

    await waitFor(() => expect(screen.queryByText("Compartilhar whiteboard")).toBeNull());
  });

  it("fecha com Esc sem tirar o foco do botão", async () => {
    const { button } = renderTooltip();
    await userEvent.tab();
    await screen.findByText("Compartilhar whiteboard");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByText("Compartilhar whiteboard")).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it("não aparece em interação por toque", async () => {
    const { button } = renderTooltip();

    // No toque o `pointerenter` chega junto com o toque, e a caixa cobriria justamente o
    // que a pessoa acabou de tocar.
    await userEvent.pointer({ target: button, keys: "[TouchA]" });
    await vi.advanceTimersByTimeAsync(TOOLTIP_DELAY_MS);

    expect(screen.queryByText("Compartilhar whiteboard")).toBeNull();
  });

  it("não repete a descrição para o leitor de tela", async () => {
    const { button } = renderTooltip();
    const nameBefore = button.getAttribute("aria-label");

    await userEvent.tab();
    await screen.findByText("Compartilhar whiteboard");

    // O `aria-label` do botão já diz isso; a caixa é ajuda visual, e abri-la não pode
    // acrescentar nada ao que o leitor de tela lê.
    expect(button.getAttribute("aria-label")).toBe(nameBefore);
    expect(
      screen.queryByText("Compartilhar whiteboard", { ignore: "[aria-hidden=true]" }),
    ).toBeNull();
  });

  it("não engole o clique do botão", async () => {
    const { button, onClick } = renderTooltip();

    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não fica aberto depois de o botão ser clicado com o mouse", async () => {
    const { button } = renderTooltip();
    await userEvent.hover(button);
    await vi.advanceTimersByTimeAsync(TOOLTIP_DELAY_MS);
    await screen.findByText("Compartilhar whiteboard");

    await userEvent.click(button);
    await userEvent.unhover(button);

    // O botão já agiu; manter a dica na tela só atrapalharia a leitura do resultado.
    await waitFor(() => expect(screen.queryByText("Compartilhar whiteboard")).toBeNull());
  });

  it("não engole os handlers que o próprio botão já tinha", async () => {
    const onFocus = vi.fn();
    const onPointerEnter = vi.fn();
    render(
      <Tooltip label="Ação">
        <button type="button" aria-label="Ação" onFocus={onFocus} onPointerEnter={onPointerEnter} />
      </Tooltip>,
    );

    await userEvent.hover(screen.getByRole("button", { name: "Ação" }));
    await userEvent.tab();

    // Engolir os eventos do gatilho quebraria em silêncio um controle que já os tratava.
    expect(onPointerEnter).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
  });
});
