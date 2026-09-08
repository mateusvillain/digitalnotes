import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NOTE_COLORS } from "@/lib/board/types";
import { ColorPicker } from "./ColorPicker";
import { UI } from "@/lib/i18n/ui";

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

    await user.click(screen.getByRole("radio", { name: UI.en.note.colors.blue }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("anuncia cada cor pelo nome, no idioma da rota", () => {
    render(<ColorPicker value={0} onChange={vi.fn()} />);

    expect(cores().map((cor) => cor.getAttribute("aria-label"))).toEqual([
      ...NOTE_COLORS.map((name) => UI.en.note.colors[name]),
    ]);
  });

  it("é um grupo de rádio com nome próprio", () => {
    render(<ColorPicker value={0} onChange={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: UI.en.note.color })).toBeDefined();
  });
});

describe("ColorPicker — teclado", () => {
  it("o grupo inteiro é uma parada só de Tab", () => {
    render(<ColorPicker value={2} onChange={vi.fn()} />);

    // O papel de radiogroup pede um ponto de entrada só: seis paradas obrigariam a passar
    // por todas as cores para sair do seletor.
    expect(cores().filter((cor) => cor.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("o Tab alcança o grupo vindo de fora", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">antes</button>
        <ColorPicker value={2} onChange={vi.fn()} />
      </>,
    );
    screen.getByRole("button", { name: "antes" }).focus();

    await user.tab();

    // Uma parada só, e ela existe: sem isto o seletor inteiro ficaria inalcançável.
    expect(document.activeElement).toBe(cores()[2]);
  });

  it("o Tab sai do grupo pela outra ponta", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ColorPicker value={2} onChange={vi.fn()} />
        <button type="button">depois</button>
      </>,
    );
    cores()[2]?.focus();

    await user.tab();

    // Não passa pelas outras cinco cores no caminho.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "depois" }));
  });

  it("o ponto de parada segue o foco, e não a cor marcada", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ColorPicker value={0} onChange={vi.fn()} />);
    cores()[0]?.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    // Marcar um segundo post-it de outra cor deixa a seleção sem cor comum.
    rerender(<ColorPicker value={null} onChange={vi.fn()} />);

    // O foco continua onde estava; prender o ponto de parada ao valor o deixaria com
    // tabIndex -1, e o Tab seguinte sairia do grupo por uma porta que não existe.
    expect(cores()[2]?.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(cores()[2]);
  });

  it("o Enter escolhe a cor focada", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value={0} onChange={onChange} />);

    cores()[3]?.focus();
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(3);
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
