import { render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BoardNotFound from "./not-found";
import { saveBoard } from "@/lib/board/localStore";
import { SCHEMA_VERSION, type Board } from "@/lib/board/types";

const originalIndexedDB = globalThis.indexedDB;

function boardWith(text: string): Board {
  return {
    version: SCHEMA_VERSION,
    notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text, z: 1 }],
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
  vi.restoreAllMocks();
});

describe("página de board não encontrado", () => {
  it("diz que o whiteboard não está disponível, sem erro técnico", () => {
    render(<BoardNotFound />);

    expect(
      screen.getByText("Este whiteboard não existe ou não está mais disponível."),
    ).toBeDefined();
  });

  it("não deixa escapar o motivo nem detalhe do backend", () => {
    render(<BoardNotFound />);

    // A mesma tela serve para inexistente, removido e malformado: distinguir os casos
    // deixaria alguém descobrir quais boards existem testando links.
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/inválid|malformad|removid|expirad|404|erro|servidor|banco/i);
  });

  it("oferece criar um novo whiteboard como ação principal", () => {
    render(<BoardNotFound />);

    const create = screen.getByRole("link", { name: "Criar um novo whiteboard" });
    // Começa em branco, em vez de restaurar o rascunho salvo.
    expect(create.getAttribute("href")).toBe("/?board=novo");
  });

  it("oferece voltar para a página inicial", () => {
    render(<BoardNotFound />);

    expect(
      screen.getByRole("link", { name: "Voltar para a página inicial" }).getAttribute("href"),
    ).toBe("/");
  });

  it("não carrega o board salvo localmente", async () => {
    await saveBoard(boardWith("rascunho local"));
    const open = vi.spyOn(globalThis.indexedDB, "open");

    render(<BoardNotFound />);

    // O conteúdo local e o de um link são independentes: mostrar o rascunho aqui faria
    // parecer que o link abriu.
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByText("rascunho local")).toBeNull();
  });
});
