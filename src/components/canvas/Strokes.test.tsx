import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StrokePreview, Strokes, polylinePoints } from "./Strokes";
import { STROKE_COLORS, type Stroke } from "@/lib/board/types";

function stroke(overrides: Partial<Stroke> = {}): Stroke {
  return { id: "s1", color: 6, points: [0, 0, 10, 10], z: 1, ...overrides };
}

function desenhados(): (string | null)[] {
  return screen.queryAllByTestId("stroke").map((element) => element.getAttribute("points"));
}

describe("polylinePoints", () => {
  it("converte a lista achatada do contrato no formato do SVG", () => {
    expect(polylinePoints([0, 0, 10, 20, -3, 4])).toBe("0,0 10,20 -3,4");
  });

  it("ignora uma coordenada solta no fim, que não forma ponto", () => {
    expect(polylinePoints([0, 0, 10, 20, 7])).toBe("0,0 10,20");
  });

  it("devolve vazio para lista vazia", () => {
    expect(polylinePoints([])).toBe("");
  });
});

describe("Strokes", () => {
  it("desenha um polyline por traço", () => {
    render(<Strokes strokes={[stroke(), stroke({ id: "s2", points: [5, 5, 6, 6] })]} />);

    expect(desenhados()).toEqual(["0,0 10,10", "5,5 6,6"]);
  });

  it("desenha do menor z para o maior, que é quem fica por cima", () => {
    render(
      <Strokes
        strokes={[
          stroke({ id: "cima", z: 9, points: [1, 1, 2, 2] }),
          stroke({ id: "baixo", z: 2, points: [3, 3, 4, 4] }),
        ]}
      />,
    );

    // O último do documento é o último a ser pintado: o de maior z.
    expect(desenhados()).toEqual(["3,3 4,4", "1,1 2,2"]);
  });

  it("não reordena a lista que recebeu", () => {
    const strokes = [stroke({ id: "a", z: 9 }), stroke({ id: "b", z: 1 })];

    render(<Strokes strokes={strokes} />);

    expect(strokes.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("pinta cada traço com a cor do índice que ele guarda", () => {
    render(<Strokes strokes={[stroke({ color: 0 }), stroke({ id: "s2", color: 6 })]} />);

    const cores = screen
      .queryAllByTestId("stroke")
      .map((element) => element.getAttribute("stroke"));
    expect(cores).toEqual(["var(--color-note-yellow)", "var(--color-ink)"]);
  });

  it("cobre a paleta inteira sem cor indefinida", () => {
    const todas = STROKE_COLORS.map((_, index) =>
      stroke({ id: `s${index}`, color: index as Stroke["color"] }),
    );

    render(<Strokes strokes={todas} />);

    const cores = screen
      .queryAllByTestId("stroke")
      .map((element) => element.getAttribute("stroke"));
    expect(cores).toHaveLength(STROKE_COLORS.length);
    expect(cores.some((cor) => cor?.includes("undefined"))).toBe(false);
  });

  it("não captura ponteiro: tinta não é alvo de clique", () => {
    render(<Strokes strokes={[stroke()]} />);

    expect(screen.getByTestId("strokes").getAttribute("class")).toContain("pointer-events-none");
  });

  it("desenha o quadro vazio sem traço nenhum", () => {
    render(<Strokes strokes={[]} />);

    expect(desenhados()).toEqual([]);
  });
});

describe("StrokePreview", () => {
  it("desenha o traço em curso a partir dos pontos do gesto", () => {
    render(
      <StrokePreview
        points={[
          { x: 0, y: 0 },
          { x: 10, y: 5 },
        ]}
      />,
    );

    expect(
      screen.getByTestId("stroke-preview").querySelector("polyline")?.getAttribute("points"),
    ).toBe("0,0 10,5");
  });

  it("não desenha nada fora de um gesto", () => {
    render(<StrokePreview points={null} />);

    expect(screen.queryByTestId("stroke-preview")).toBeNull();
  });

  it("não desenha um ponto só, que ainda não é linha", () => {
    render(<StrokePreview points={[{ x: 3, y: 3 }]} />);

    expect(screen.queryByTestId("stroke-preview")).toBeNull();
  });
});
