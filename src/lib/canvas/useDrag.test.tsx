import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { stubPointerCapture } from "@/test-utils/pointer";
import { CLICK_SLOP, type Point } from "./coords";
import { useDrag } from "./useDrag";

interface AlvoProps {
  onStart?: () => void;
  onMove?: (delta: Point) => void;
  onEnd?: (delta: Point) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

function Alvo({ onStart, onMove = vi.fn(), onEnd = vi.fn(), onCancel, disabled }: AlvoProps) {
  const handlers = useDrag({ onStart, onMove, onEnd, onCancel, disabled });

  return <div data-testid="alvo" {...handlers} />;
}

function alvo(): HTMLElement {
  const element = screen.getByTestId("alvo");
  stubPointerCapture(element);
  return element;
}

/** Aperta, anda até o ponto pedido e solta. */
function arrasta(ate: [number, number], de: [number, number] = [0, 0]): void {
  const element = alvo();
  fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: de[0], clientY: de[1] });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: ate[0], clientY: ate[1] });
}

describe("useDrag", () => {
  it("reporta o deslocamento desde a origem, em pixels de tela", () => {
    const onMove = vi.fn();
    render(<Alvo onMove={onMove} />);

    arrasta([130, 70], [30, 20]);

    expect(onMove).toHaveBeenLastCalledWith({ x: 100, y: 50 });
  });

  it("mede sempre desde a origem, e não somando passos", () => {
    const onMove = vi.fn();
    render(<Alvo onMove={onMove} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    for (const passo of [20, 40, 60]) {
      fireEvent.pointerMove(element, { pointerId: 1, clientX: passo, clientY: 0 });
    }

    // Somar passos acumularia erro de arredondamento ao longo de um arrasto longo.
    expect(onMove).toHaveBeenLastCalledWith({ x: 60, y: 0 });
  });

  it("não começa o arraste antes de passar da folga", () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    render(<Alvo onStart={onStart} onMove={onMove} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: CLICK_SLOP, clientY: 0 });

    // A mão treme ao clicar; sem a folga, o post-it andaria um pixel e essa posição seria
    // gravada na store.
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("reconhece o arraste lento, que anda pouco por evento", () => {
    const onStart = vi.fn();
    render(<Alvo onStart={onStart} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    for (let passo = 1; passo <= 5; passo += 1) {
      fireEvent.pointerMove(element, { pointerId: 1, clientX: passo * 2, clientY: 0 });
    }

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("não termina um arraste que nunca começou", () => {
    const onEnd = vi.fn();
    render(<Alvo onEnd={onEnd} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 0, clientY: 0 });

    // Um clique parado não é um arraste de deslocamento zero: nada a gravar.
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("entrega o deslocamento final ao soltar", () => {
    const onEnd = vi.fn();
    render(<Alvo onEnd={onEnd} />);

    arrasta([200, 100]);

    expect(onEnd).toHaveBeenCalledExactlyOnceWith({ x: 200, y: 100 });
  });

  it("desfaz, e não confirma, quando o sistema cancela o gesto", () => {
    const onEnd = vi.fn();
    const onCancel = vi.fn();
    render(<Alvo onEnd={onEnd} onCancel={onCancel} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 100, clientY: 0 });
    fireEvent.pointerCancel(element, { pointerId: 1 });

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("captura o ponteiro, para o gesto sobreviver a sair de cima do elemento", () => {
    render(<Alvo />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0 });

    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("ignora ponteiro que não é o do gesto em curso", () => {
    const onMove = vi.fn();
    render(<Alvo onMove={onMove} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 2, clientX: 500, clientY: 500 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("não age em botão que não é o primário", () => {
    const onMove = vi.fn();
    render(<Alvo onMove={onMove} />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 200, clientY: 0 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("não arrasta quando desabilitado", () => {
    const onMove = vi.fn();
    render(<Alvo onMove={onMove} disabled />);
    const element = alvo();

    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 200, clientY: 0 });

    expect(onMove).not.toHaveBeenCalled();
  });
});
