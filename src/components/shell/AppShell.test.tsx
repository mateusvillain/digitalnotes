import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("não desenha barra superior nenhuma", () => {
    const { container } = render(<AppShell />);

    // O quadro é a interface inteira: uma faixa fixa no topo custaria altura de tela.
    expect(container.querySelector("header")).toBeNull();
  });

  it("mantém o nome do app para leitor de tela", () => {
    render(<AppShell />);

    // Invisível, mas presente: uma página sem cabeçalho nenhum não tem como ser anunciada.
    expect(screen.getByRole("heading", { name: "digitalnotes" }).className).toContain("sr-only");
  });

  it("põe os controles no canto inferior direito, fora da borda", () => {
    const { container } = render(<AppShell controls={<button type="button">zoom</button>} />);
    const faixa = container.querySelector(".shadow-control")?.parentElement;

    expect(faixa?.className).toContain("bottom-0");
    expect(faixa?.className).toContain("justify-end");
    // O respiro da borda vem do padding da faixa, não de um deslocamento do próprio bloco.
    expect(faixa?.className).toContain("p-4");
  });

  it("mantém os controles acima da barra de seleção", () => {
    const { container } = render(<AppShell controls={<button type="button">zoom</button>} />);
    const faixa = container.querySelector(".shadow-control")?.parentElement;

    // A SelectionToolbar é z-20 e segue os post-its: pode cair justamente sob os controles.
    expect(faixa?.className).toContain("z-30");
  });

  it("renderiza o conteúdo do canvas", () => {
    render(<AppShell>conteúdo do quadro</AppShell>);

    expect(screen.getByText("conteúdo do quadro")).toBeDefined();
  });

  it("só reserva a faixa de controles quando há controles", () => {
    const { container, rerender } = render(<AppShell />);
    expect(container.querySelector(".shadow-control")).toBeNull();

    rerender(<AppShell controls={<button type="button">zoom</button>} />);
    expect(screen.getByRole("button", { name: "zoom" })).toBeDefined();
  });
});
