import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("página de endereço inexistente", () => {
  it("diz que a página não existe, sem o texto técnico do framework", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Esta página não existe." })).toBeDefined();
    expect(document.body.textContent ?? "").not.toMatch(/could not be found|404/i);
  });

  it("oferece o caminho de volta", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: "Voltar para a página inicial" }).getAttribute("href"),
    ).toBe("/");
  });

  it("não fala de whiteboard: aqui o endereço nunca existiu", () => {
    render(<NotFound />);

    // Confundir "página inexistente" com "whiteboard indisponível" faria alguém achar que
    // perdeu um documento que nunca esteve nessa URL.
    expect(document.body.textContent ?? "").not.toMatch(/whiteboard não existe/i);
  });
});
