import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Viewport } from "@/components/canvas/Viewport";
import { NOTE_COLORS, type Note } from "@/lib/board/types";
import { noteBackgroundVar } from "@/lib/theme/note-colors";
import { PostIt } from "./PostIt";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "abc123",
    x: 40,
    y: 80,
    w: 200,
    h: 160,
    color: 0,
    text: "primeira linha",
    z: 3,
    ...overrides,
  };
}

describe("PostIt", () => {
  it("posiciona e dimensiona em coordenadas de canvas", () => {
    render(<PostIt note={note()} />);
    const element = screen.getByTestId("post-it");

    expect(element.style.left).toBe("40px");
    expect(element.style.top).toBe("80px");
    expect(element.style.width).toBe("200px");
    expect(element.style.height).toBe("160px");
  });

  it("empilha pelo z da note", () => {
    render(<PostIt note={note({ z: 7 })} />);

    expect(screen.getByTestId("post-it").style.zIndex).toBe("7");
  });

  it.each(NOTE_COLORS.map((_, index) => index as Note["color"]))(
    "usa o token de cor do índice %i, sem valor literal",
    (color) => {
      render(<PostIt note={note({ color })} />);

      expect(screen.getByTestId("post-it").style.backgroundColor).toBe(
        `var(${noteBackgroundVar(color)})`,
      );
    },
  );

  it("preserva as quebras de linha do texto", () => {
    render(<PostIt note={note({ text: "primeira\nsegunda" })} />);
    const element = screen.getByTestId("post-it");

    expect(element.textContent).toBe("primeira\nsegunda");
    expect(element.className).toContain("whitespace-pre-wrap");
  });

  it("contém texto longo dentro do post-it, sem vazar", () => {
    render(<PostIt note={note({ text: "palavra".repeat(300) })} />);
    const element = screen.getByTestId("post-it");

    // Sem quebra de palavra o texto empurraria a caixa; sem overflow escondido, escorreria
    // por cima dos post-its vizinhos.
    expect(element.className).toContain("break-words");
    expect(element.className).toContain("overflow-hidden");
  });

  it("distingue visualmente o post-it selecionado", () => {
    const { rerender } = render(<PostIt note={note()} />);
    expect(screen.getByTestId("post-it").className).not.toContain("outline-selection");
    expect(screen.getByTestId("post-it").dataset.selected).toBe("false");

    rerender(<PostIt note={note()} selected />);
    expect(screen.getByTestId("post-it").className).toContain("outline-selection");
    expect(screen.getByTestId("post-it").dataset.selected).toBe("true");
  });

  it("expõe o id da note para as interações encontrarem o alvo", () => {
    render(<PostIt note={note({ id: "xyz789" })} />);

    expect(screen.getByTestId("post-it").dataset.noteId).toBe("xyz789");
  });

  it("não muda de estilo com o zoom: quem escala é a camada do viewport", () => {
    const { rerender } = render(
      <Viewport viewport={{ x: 0, y: 0, scale: 1 }} pan={vi.fn()} zoomBy={vi.fn()}>
        <PostIt note={note()} />
      </Viewport>,
    );
    const semZoom = screen.getByTestId("post-it").getAttribute("style");

    rerender(
      <Viewport viewport={{ x: 30, y: 10, scale: 2.5 }} pan={vi.fn()} zoomBy={vi.fn()}>
        <PostIt note={note()} />
      </Viewport>,
    );

    // O post-it segue descrito em coordenadas de canvas; o zoom se aplica uma vez só, na
    // camada, e vale para a caixa e para o texto junto.
    expect(screen.getByTestId("post-it").getAttribute("style")).toBe(semZoom);
    expect(screen.getByTestId("viewport-layer").style.transform).toBe(
      "translate(30px, 10px) scale(2.5)",
    );
  });

  it("dá um rótulo acessível ao post-it vazio", () => {
    render(<PostIt note={note({ text: "" })} />);

    expect(screen.getByLabelText("Post-it vazio")).toBeDefined();
  });
});
