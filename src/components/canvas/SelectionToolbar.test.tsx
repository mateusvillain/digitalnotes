import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IDENTITY_VIEWPORT, type Rect, type Viewport } from "@/lib/canvas/coords";
import { SelectionToolbar } from "./SelectionToolbar";

function barra(): HTMLElement {
  return screen.getByTestId("selection-toolbar");
}

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

function renderiza(rects: readonly Rect[], viewport: Viewport = IDENTITY_VIEWPORT) {
  return render(
    <SelectionToolbar rects={rects} viewport={viewport}>
      <button type="button">conteúdo</button>
    </SelectionToolbar>,
  );
}

describe("SelectionToolbar", () => {
  it("não desenha nada sem seleção", () => {
    renderiza([]);

    expect(screen.queryByTestId("selection-toolbar")).toBeNull();
  });

  it("centra a barra na horizontal sobre a caixa da seleção", () => {
    renderiza([rect(100, 300, 200, 200)]);

    // O centro de 100..300 é 200; a barra se centra sobre ele pela própria largura.
    expect(barra().style.left).toBe("200px");
    expect(barra().style.transform).toBe("translate(-50%, -100%)");
  });

  it("fica acima da caixa, com folga", () => {
    renderiza([rect(100, 300, 200, 200)]);

    expect(barra().style.top).toBe("292px");
    expect(barra().dataset.placement).toBe("above");
  });

  it("envolve a seleção inteira quando há vários post-its", () => {
    renderiza([rect(0, 300, 100, 100), rect(300, 300, 100, 100)]);

    // A caixa vai de 0 a 400: o centro é 200, e não o de nenhum post-it isolado.
    expect(barra().style.left).toBe("200px");
  });

  it("desce para baixo da caixa quando não há espaço acima", () => {
    renderiza([rect(100, 0, 200, 200)]);

    // Encostada no topo, subir jogaria a barra para fora da área visível.
    expect(barra().dataset.placement).toBe("below");
    expect(barra().style.top).toBe("208px");
    expect(barra().style.transform).toBe("translate(-50%, 0)");
  });

  it("acompanha o zoom sem escalar junto", () => {
    renderiza([rect(100, 300, 200, 200)], { x: 0, y: 0, scale: 2 });

    // A posição dobra porque o post-it dobrou; a barra em si não ganha transform de escala,
    // porque é interface e não conteúdo do quadro.
    expect(barra().style.left).toBe("400px");
    expect(barra().style.top).toBe("592px");
    expect(barra().style.transform).toBe("translate(-50%, -100%)");
  });

  it("acompanha o pan do quadro", () => {
    renderiza([rect(100, 300, 200, 200)], { x: 50, y: -100, scale: 1 });

    expect(barra().style.left).toBe("250px");
    expect(barra().style.top).toBe("192px");
  });

  it("desenha o que recebe dentro", () => {
    renderiza([rect(100, 300, 200, 200)]);

    expect(screen.getByRole("button", { name: "conteúdo" })).toBeDefined();
  });
});
