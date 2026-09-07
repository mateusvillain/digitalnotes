import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IDENTITY_VIEWPORT } from "@/lib/canvas/coords";
import { Viewport } from "./Viewport";

function setup() {
  const pan = vi.fn();
  const zoomBy = vi.fn();

  render(
    <Viewport
      viewport={IDENTITY_VIEWPORT}
      pan={pan}
      zoomTo={vi.fn()}
      zoomBy={zoomBy}
      reset={vi.fn()}
    >
      <span>post-it</span>
    </Viewport>,
  );

  const surface = screen.getByTestId("viewport-surface");
  // jsdom não implementa a API de captura de ponteiro.
  surface.setPointerCapture = vi.fn();
  surface.releasePointerCapture = vi.fn();

  return { surface, pan, zoomBy };
}

describe("Viewport", () => {
  it("renderiza o conteúdo do canvas", () => {
    setup();

    expect(screen.getByText("post-it")).toBeDefined();
  });

  it("arrastar o fundo desloca a visualização", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, movementX: 12, movementY: -7 });

    expect(pan).toHaveBeenCalledWith(12, -7);
  });

  it("não desloca quando o arraste começa em cima do conteúdo", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(screen.getByText("post-it"), { pointerId: 1, button: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, movementX: 12, movementY: -7 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("ignora botão que não seja o principal", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 2 });
    fireEvent.pointerMove(surface, { pointerId: 1, movementX: 12, movementY: -7 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("para de deslocar depois de soltar o ponteiro", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(surface, { pointerId: 1 });
    fireEvent.pointerMove(surface, { pointerId: 1, movementX: 20, movementY: 20 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("ignora o movimento de um segundo ponteiro durante o arraste", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(surface, { pointerId: 2, movementX: 30, movementY: 30 });

    expect(pan).toHaveBeenCalledTimes(0);
  });

  it("a roda amplia para cima e reduz para baixo, ancorada no cursor", () => {
    const { surface, zoomBy } = setup();

    fireEvent.wheel(surface, { deltaY: -100, clientX: 200, clientY: 150 });
    fireEvent.wheel(surface, { deltaY: 100, clientX: 200, clientY: 150 });

    const [ampliar, reduzir] = zoomBy.mock.calls;
    expect(ampliar?.[0]).toBeGreaterThan(1);
    expect(reduzir?.[0]).toBeLessThan(1);
    expect(ampliar?.[1]).toEqual({ x: 200, y: 150 });
  });
});
