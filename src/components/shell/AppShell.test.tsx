import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("mostra o nome do app na barra superior", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "digitalnotes" })).toBeDefined();
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
