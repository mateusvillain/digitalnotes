import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewBoardButton } from "./NewBoardButton";
import type { ShareApi, ShareState } from "@/lib/board/useShareBoard";

const SHARED: ShareState = { status: "shared", url: "https://site/board/abc" };

function renderButton({
  hasNotes = true,
  shareOutcome = SHARED,
  state = { status: "idle" } as ShareState,
}: {
  hasNotes?: boolean;
  shareOutcome?: ShareState;
  state?: ShareState;
} = {}) {
  const onNewBoard = vi.fn();
  const share = vi.fn<ShareApi["share"]>().mockResolvedValue(shareOutcome);
  render(
    <NewBoardButton
      hasNotes={hasNotes}
      onNewBoard={onNewBoard}
      share={{ state, share, dismiss: vi.fn() }}
    />,
  );
  return { onNewBoard, share };
}

function clickNew() {
  return userEvent.click(screen.getByRole("button", { name: "Criar um novo whiteboard" }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewBoardButton", () => {
  it("é só ícone, e se anuncia por aria-label", async () => {
    renderButton();

    const button = screen.getByRole("button", { name: "Criar um novo whiteboard" });
    expect(button.textContent).toBe("");
  });

  it("com o quadro vazio, começa um novo sem perguntar nada", async () => {
    const { onNewBoard } = renderButton({ hasNotes: false });

    await clickNew();

    expect(onNewBoard).toHaveBeenCalledOnce();
    // Nada a proteger, então nada de atrito.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("com post-its na tela, oferece o link antes de substituir", async () => {
    const { onNewBoard } = renderButton({ hasNotes: true });

    await clickNew();

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/quadro atual será substituído/i)).toBeDefined();
    // Ainda não limpou nada: a decisão é de quem está lendo.
    expect(onNewBoard).not.toHaveBeenCalled();
  });

  it("gera o link pelo mesmo caminho de compartilhar e só então limpa", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: "Gerar link e começar" }));

    await waitFor(() => expect(onNewBoard).toHaveBeenCalledOnce());
    expect(share).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["falha passageira", { status: "error" } as ShareState],
    ["board grande demais", { status: "too-large" } as ShareState],
  ])("não limpa o quadro quando o link não sai: %s", async (_caso, outcome) => {
    const { onNewBoard } = renderButton({ hasNotes: true, shareOutcome: outcome });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: "Gerar link e começar" }));

    // Limpar aqui deixaria a pessoa sem o quadro e sem o link.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Gerar link e começar" })).toBeDefined(),
    );
    expect(onNewBoard).not.toHaveBeenCalled();
  });

  it("permite seguir sem gerar link nenhum", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: "Começar sem link" }));

    expect(onNewBoard).toHaveBeenCalledOnce();
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("desistir não mexe em nada", async () => {
    const { onNewBoard, share } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onNewBoard).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("fecha com Esc e devolve o foco ao botão", async () => {
    const { onNewBoard } = renderButton({ hasNotes: true });
    await clickNew();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onNewBoard).not.toHaveBeenCalled();
    // Sem devolver o foco, quem navega por teclado volta ao início do documento.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Criar um novo whiteboard" }),
    );
  });

  it("avisa enquanto o link está sendo gerado", async () => {
    let resolveShare: ((state: ShareState) => void) | undefined;
    const share = vi.fn<ShareApi["share"]>().mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve;
      }),
    );
    render(
      <NewBoardButton
        hasNotes
        onNewBoard={vi.fn()}
        share={{ state: { status: "idle" }, share, dismiss: vi.fn() }}
      />,
    );
    await clickNew();

    await userEvent.click(screen.getByRole("button", { name: "Gerar link e começar" }));

    expect(await screen.findByRole("button", { name: "Gerando o link…" })).toHaveProperty(
      "disabled",
      true,
    );
    resolveShare?.(SHARED);
  });
});
