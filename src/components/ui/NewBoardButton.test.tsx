import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewBoardButton } from "./NewBoardButton";
import type { ShareApi, ShareState } from "@/lib/board/useShareBoard";
import { UI } from "@/lib/i18n/ui";

const SHARED: ShareState = { status: "shared", url: "https://site/board/abc" };

function renderButton({
  hasNotes = true,
  shareOutcome = SHARED,
}: { hasNotes?: boolean; shareOutcome?: ShareState | null } = {}) {
  const onNewBoard = vi.fn();
  const share = vi.fn<ShareApi["share"]>().mockResolvedValue(shareOutcome);
  render(<NewBoardButton hasNotes={hasNotes} onNewBoard={onNewBoard} share={share} />);
  return { onNewBoard, share };
}

function clickNew() {
  return userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.action }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewBoardButton", () => {
  it("é só ícone, e se anuncia por aria-label", () => {
    renderButton();

    const button = screen.getByRole("button", { name: UI.en.newBoard.action });
    // Sem rótulo escrito, e o desenho escondido do leitor de tela para não competir com o
    // `aria-label`.
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("com o quadro vazio, começa um novo sem perguntar nada", async () => {
    const { onNewBoard } = renderButton({ hasNotes: false });

    await clickNew();

    expect(onNewBoard).toHaveBeenCalledOnce();
    // Nada a proteger, então nada de atrito.
    expect(screen.queryByText(UI.en.newBoard.warning)).toBeNull();
  });

  it("com post-its na tela, oferece o link antes de substituir", async () => {
    const { onNewBoard } = renderButton({ hasNotes: true });

    await clickNew();

    expect(screen.getByText(UI.en.newBoard.warning)).toBeDefined();
    expect(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart })).toBeDefined();
    // Ainda não limpou nada: a decisão é de quem está lendo.
    expect(onNewBoard).not.toHaveBeenCalled();
  });

  it("gera o link pelo mesmo caminho de compartilhar e só então limpa", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart }));

    await waitFor(() => expect(onNewBoard).toHaveBeenCalledOnce());
    expect(share).toHaveBeenCalledOnce();
    expect(screen.queryByText(UI.en.newBoard.warning)).toBeNull();
  });

  it.each([
    ["falha passageira", { status: "error" } as ShareState],
    ["board grande demais", { status: "too-large" } as ShareState],
    ["envio substituído por outro", null],
  ])("não limpa o quadro quando o link não sai: %s", async (_caso, outcome) => {
    const { onNewBoard } = renderButton({ hasNotes: true, shareOutcome: outcome });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart }));

    // Limpar aqui deixaria a pessoa sem o quadro e sem o link.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart })).toBeDefined(),
    );
    expect(onNewBoard).not.toHaveBeenCalled();
  });

  it("permite seguir sem gerar link nenhum", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.startWithoutSaving }));

    expect(onNewBoard).toHaveBeenCalledOnce();
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByText(UI.en.newBoard.warning)).toBeNull();
  });

  it("desistir não mexe em nada", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.cancel }));

    expect(onNewBoard).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByText(UI.en.newBoard.warning)).toBeNull();
  });

  it("fecha com Esc e devolve o foco ao botão", async () => {
    const { onNewBoard } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByText(UI.en.newBoard.warning)).toBeNull();
    expect(onNewBoard).not.toHaveBeenCalled();
    // Sem devolver o foco, quem navega por teclado volta ao início do documento.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: UI.en.newBoard.action }),
    );
  });

  it("devolve o foco ao botão também quando o link é gerado com sucesso", async () => {
    const { onNewBoard } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart }));

    await waitFor(() => expect(onNewBoard).toHaveBeenCalledOnce());
    // O painel desmonta com o foco dentro dele; sem devolvê-lo, o foco cai no body.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: UI.en.newBoard.action }),
    );
  });

  it("avisa enquanto o link está sendo gerado", async () => {
    let resolveShare: ((state: ShareState) => void) | undefined;
    const share = vi.fn<ShareApi["share"]>().mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve;
      }),
    );
    render(<NewBoardButton hasNotes onNewBoard={vi.fn()} share={share} />);
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: UI.en.newBoard.saveAndStart }));

    const busy = await screen.findByRole("button", { name: UI.en.save.saving });
    // `aria-busy`, e não `disabled`: desabilitar tiraria o foco de quem acionou o botão
    // pelo teclado.
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy).toHaveProperty("disabled", false);
    expect(screen.getByRole("status").textContent).toBe(UI.en.save.saving);

    resolveShare?.(SHARED);
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
  });
});
