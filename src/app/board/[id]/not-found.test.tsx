import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BoardNotFound from "./not-found";

/**
 * Termos que só apareceriam se a tela contasse **por que** o link não abriu, ou de onde
 * veio a falha. É o que a spec proíbe: a mesma resposta para inexistente, removido e
 * malformado, sem nada que deixe alguém inferir quais boards existem.
 */
const LEAKY_TERMS = /inválid|malformad|removid|expirad|404|backend|servidor|banco de dados/i;

describe("página de board não encontrado", () => {
  it("diz que o whiteboard não está disponível, sem erro técnico", () => {
    render(<BoardNotFound />);

    expect(
      screen.getByRole("heading", {
        name: "Este whiteboard não existe ou não está mais disponível.",
      }),
    ).toBeDefined();
  });

  it("não deixa escapar o motivo nem detalhe do backend", () => {
    render(<BoardNotFound />);

    expect(document.body.textContent ?? "").not.toMatch(LEAKY_TERMS);
  });

  it("se anuncia ao aparecer, porque chega por troca de rota no cliente", () => {
    render(<BoardNotFound />);

    // Sem isso, quem usa leitor de tela seguiria no contexto anterior sem saber que o
    // link falhou.
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("oferece criar um novo whiteboard e voltar para a página inicial", () => {
    render(<BoardNotFound />);

    const create = screen.getByRole("link", { name: "Criar um novo whiteboard" });
    const home = screen.getByRole("link", { name: "Voltar para a página inicial" });

    expect(create.getAttribute("href")).toBe("/");
    expect(home.getAttribute("href")).toBe("/");
  });
});
