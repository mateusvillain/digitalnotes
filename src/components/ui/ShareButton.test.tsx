import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./ShareButton";
import type { ShareApi, ShareState } from "@/lib/board/useShareBoard";

function renderButton(state: ShareState, overrides: Partial<ShareApi> = {}) {
  const api: ShareApi = { state, share: vi.fn(), dismiss: vi.fn(), ...overrides };
  render(<ShareButton {...api} />);
  return api;
}

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  // `vi.stubGlobal` é desfeito no `afterEach`; `Object.assign(navigator, …)` vazaria o
  // clipboard falso para os testes seguintes do arquivo.
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ShareButton", () => {
  it("é só ícone, e se anuncia por aria-label", () => {
    renderButton({ status: "idle" });

    const button = screen.getByRole("button", { name: "Compartilhar whiteboard" });
    // Sem rótulo escrito: o quadro é a interface inteira, e o texto custaria largura.
    expect(button.textContent).toBe("");
  });

  it("compartilha ao clicar", async () => {
    const api = renderButton({ status: "idle" });

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar whiteboard" }));

    expect(api.share).toHaveBeenCalledOnce();
  });

  it("avisa enquanto o link está sendo gerado, sem travar o resto da tela", () => {
    renderButton({ status: "sharing" });

    expect(screen.getByRole("status").textContent).toBe("Gerando o link…");
    expect(screen.getByText("Gerando o link…", { selector: "p:not(.sr-only)" })).toBeDefined();
  });

  it("não perde o foco do botão enquanto o envio acontece", async () => {
    const api = renderButton({ status: "sharing" });

    const button = screen.getByRole("button", { name: "Compartilhar whiteboard" });
    button.focus();

    // Desabilitar tiraria o foco de quem acabou de acionar pelo teclado; o clique é
    // barrado sem desabilitar.
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.click(button);
    expect(api.share).not.toHaveBeenCalled();
  });

  it("explica o que fazer quando o board é grande demais, sem sugerir insistir", () => {
    renderButton({ status: "too-large" });

    // A região de anúncio e o painel visível dizem a mesma coisa, cada um para o seu
    // público.
    expect(screen.getByRole("status").textContent).toContain("grande demais");
    expect(screen.getByText(/Apague alguns post-its/)).toBeDefined();
    // Tentar de novo não resolveria: o próximo envio falharia igual.
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });

  it("mostra o link gerado num campo fácil de copiar", () => {
    renderButton({ status: "shared", url: "https://site/board/abc" });

    const field = screen.getByLabelText("Link do whiteboard compartilhado");
    expect(field).toHaveProperty("value", "https://site/board/abc");
    expect(field).toHaveProperty("readOnly", true);
  });

  it("copia o link e confirma", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderButton({ status: "shared", url: "https://site/board/abc" });

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith("https://site/board/abc");
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeDefined();
  });

  it("mantém o link visível quando copiar não é permitido", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("negado")));
    renderButton({ status: "shared", url: "https://site/board/abc" });

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    // Sem confirmação falsa, e com o link ainda na tela para selecionar na mão.
    expect(screen.getByRole("button", { name: "Copiar" })).toBeDefined();
    expect(screen.getByLabelText("Link do whiteboard compartilhado")).toBeDefined();
  });

  it("continua oferecendo compartilhar depois de já ter um link", () => {
    renderButton({ status: "shared", url: "https://site/board/abc" });

    // Compartilhar de novo cria outro documento; o botão não vira "compartilhado".
    expect(screen.getByRole("button", { name: "Compartilhar whiteboard" })).toHaveProperty(
      "disabled",
      false,
    );
    // E quem já mandou o link anterior precisa saber que ele não quebrou.
    expect(screen.getByText("Links já enviados continuam valendo.")).toBeDefined();
  });

  it("sinaliza a falha e deixa tentar de novo", async () => {
    const api = renderButton({ status: "error" });

    expect(screen.getByRole("status").textContent).toContain("Não foi possível compartilhar");

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(api.share).toHaveBeenCalledOnce();
  });

  it("fecha o link e devolve o foco ao botão", async () => {
    const api = renderButton({ status: "shared", url: "https://site/board/abc" });

    await userEvent.click(screen.getByRole("button", { name: "Fechar o link compartilhado" }));

    expect(api.dismiss).toHaveBeenCalledOnce();
    // Sem devolver o foco, quem navega por teclado volta para o início do documento.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Compartilhar whiteboard" }),
    );
  });
});
