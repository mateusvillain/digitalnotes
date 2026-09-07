import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IDENTITY_VIEWPORT } from "@/lib/canvas/coords";
import { Viewport } from "./Viewport";

/**
 * O zoom escuta a roda por listener nativo não passivo, então o teste também precisa
 * disparar um evento de verdade — o `fireEvent.wheel` do React não passaria por ele.
 */
function wheelEvent(init: WheelEventInit): WheelEvent {
  return new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
}

function setup() {
  const pan = vi.fn();
  const zoomBy = vi.fn();

  render(
    <Viewport viewport={IDENTITY_VIEWPORT} pan={pan} zoomBy={zoomBy}>
      <span>post-it</span>
    </Viewport>,
  );

  const surface = screen.getByTestId("viewport-surface");
  // jsdom não implementa a API de captura de ponteiro.
  surface.setPointerCapture = vi.fn();
  surface.releasePointerCapture = vi.fn();
  surface.hasPointerCapture = vi.fn(() => true);

  return { surface, pan, zoomBy };
}

describe("Viewport", () => {
  it("mantém uma única camada transformada por mais elementos que existam", () => {
    const { container } = render(
      <Viewport viewport={{ x: 10, y: 20, scale: 1.5 }} pan={vi.fn()} zoomBy={vi.fn()}>
        {Array.from({ length: 200 }, (_, index) => (
          <span key={index}>post-it {index}</span>
        ))}
      </Viewport>,
    );

    // O custo de pan e zoom não cresce com a quantidade de post-its: quem se move é uma
    // transform só, não cada elemento.
    const transformados = [...container.querySelectorAll<HTMLElement>("[style]")].filter(
      (element) => element.style.transform !== "",
    );

    expect(transformados).toHaveLength(1);
    expect(transformados[0]?.dataset.testid).toBe("viewport-layer");
  });

  it("renderiza o conteúdo do canvas", () => {
    setup();

    expect(screen.getByText("post-it")).toBeDefined();
  });

  it("arrastar o fundo desloca a visualização pela diferença de posição", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 112, clientY: 93 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 122, clientY: 93 });

    expect(pan).toHaveBeenNthCalledWith(1, 12, -7);
    expect(pan).toHaveBeenNthCalledWith(2, 10, 0);
  });

  it("arrastar a camada do canvas também desloca, não só o fundo", () => {
    const { pan } = setup();
    const layer = screen.getByTestId("viewport-layer");

    fireEvent.pointerDown(layer, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(layer, { pointerId: 1, clientX: 5, clientY: 5 });

    expect(pan).toHaveBeenCalledWith(5, 5);
  });

  it("não desloca quando o arraste começa em cima do conteúdo", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(screen.getByText("post-it"), { pointerId: 1, button: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 12, clientY: 12 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("ignora botão que não seja o principal", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 2 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 12, clientY: 12 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("para de deslocar depois de soltar o ponteiro, liberando a captura", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(surface, { pointerId: 1 });
    expect(surface.releasePointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 20, clientY: 20 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("ignora o movimento de um segundo ponteiro durante o arraste", () => {
    const { surface, pan } = setup();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 30, clientY: 30 });

    expect(pan).not.toHaveBeenCalled();
  });

  it("solta a captura sem lançar quando o ponteiro é cancelado", () => {
    const { surface } = setup();
    surface.hasPointerCapture = vi.fn(() => false);

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });

    expect(() => fireEvent.pointerCancel(surface, { pointerId: 1 })).not.toThrow();
    expect(surface.releasePointerCapture).not.toHaveBeenCalled();
  });

  it("a roda amplia para cima e reduz para baixo, ancorada no cursor", () => {
    const { surface, zoomBy } = setup();

    surface.dispatchEvent(wheelEvent({ deltaY: -100, clientX: 200, clientY: 150 }));
    surface.dispatchEvent(wheelEvent({ deltaY: 100, clientX: 200, clientY: 150 }));

    const [ampliar, reduzir] = zoomBy.mock.calls;
    expect(ampliar?.[0]).toBeGreaterThan(1);
    expect(reduzir?.[0]).toBeLessThan(1);
    expect(ampliar?.[1]).toEqual({ x: 200, y: 150 });
  });

  it("cancela o zoom da página no ctrl+roda e no pinch do trackpad", () => {
    const { surface, zoomBy } = setup();
    const event = wheelEvent({ deltaY: -50, clientX: 10, clientY: 10, ctrlKey: true });

    surface.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(zoomBy).toHaveBeenCalledOnce();
  });

  it("normaliza a rolagem em linhas para não ficar lenta no Firefox", () => {
    const { surface, zoomBy } = setup();

    surface.dispatchEvent(wheelEvent({ deltaY: -3, deltaMode: WheelEvent.DOM_DELTA_LINE }));
    surface.dispatchEvent(wheelEvent({ deltaY: -48 }));

    expect(zoomBy.mock.calls[0]?.[0]).toBeCloseTo(zoomBy.mock.calls[1]?.[0] as number, 10);
  });
});
