import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NOTE_COLORS } from "@/lib/board/types";
import { ColorPicker } from "./ColorPicker";

function cores(): HTMLElement[] {
  return screen.getAllByRole("radio");
}

describe("ColorPicker", () => {
  it("mostra as seis cores da paleta", () => {
    render(<ColorPicker value={0} onChange={vi.fn()} />);

    expect(cores()).toHaveLength(NOTE_COLORS.length);
  });

  it("marca a cor atual, e só ela", () => {
    render(<ColorPicker value={2} onChange={vi.fn()} />);

    expect(cores().map((cor) => cor.getAttribute("aria-checked"))).toEqual([
      "false",
      "false",
      "true",
      "false",
      "false",
      "false",
    ]);
  });

  it("não marca nenhuma quando a seleção tem cores diferentes", () => {
    render(<ColorPicker value={null} onChange={vi.fn()} />);

    expect(cores().every((cor) => cor.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("avisa a cor escolhida no clique", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={0} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Azul" }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("anuncia cada cor pelo nome, em português", () => {
    render(<ColorPicker value={0} onChange={vi.fn()} />);

    expect(cores().map((cor) => cor.getAttribute("aria-label"))).toEqual([
      "Amarelo",
      "Rosa",
      "Verde",
      "Azul",
      "Roxo",
      "Laranja",
    ]);
  });

  it("é um grupo de rádio com nome próprio", () => {
    render(<ColorPicker value={0} onChange={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: "Cor do post-it" })).toBeDefined();
  });
});

describe("ColorPicker — teclado", () => {
  it("o grupo inteiro é uma parada só de Tab", () => {
    render(<ColorPicker value={2} onChange={vi.fn()} />);

    // O papel de radiogroup pede um ponto de entrada só: seis paradas obrigariam a passar
    // por todas as cores para sair do seletor.
    expect(cores().filter((cor) => cor.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("o Tab entra na cor marcada", () => {
    render(<ColorPicker value={4} onChange={vi.fn()} />);

    expect(cores()[4]?.getAttribute("tabindex")).toBe("0");
  });

  it("sem cor marcada, o Tab ainda entra no grupo", () => {
    render(<ColorPicker value={null} onChange={vi.fn()} />);

    // Sem isto o seletor inteiro sairia da ordem de tabulação, e o teclado não o alcançaria.
    expect(cores()[0]?.getAttribute("tabindex")).toBe("0");
  });

  it("a seta para a direita anda e já escolhe", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={0} onChange={onChange} />);

    cores()[0]?.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(cores()[1]);
  });

  it("a seta para a esquerda volta", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={3} onChange={onChange} />);

    cores()[3]?.focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("as setas dão a volta nas duas pontas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={0} onChange={onChange} />);

    cores()[0]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(5);

    cores()[5]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("as setas verticais andam como as horizontais", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={2} onChange={onChange} />);

    cores()[2]?.focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(3);

    cores()[3]?.focus();
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("Home e End vão às pontas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={2} onChange={onChange} />);

    cores()[2]?.focus();
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith(0);

    cores()[2]?.focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("o espaço escolhe sem andar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={0} onChange={onChange} />);

    cores()[4]?.focus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith(4);
    expect(document.activeElement).toBe(cores()[4]);
  });
});
