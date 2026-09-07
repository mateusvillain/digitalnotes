import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DragHandlers } from "@/lib/canvas/useDrag";
import { ResizeHandle } from "./ResizeHandle";

function handlers(): DragHandlers {
  return {
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerCancel: vi.fn(),
  };
}

describe("ResizeHandle", () => {
  it("fica visível o tempo todo no post-it selecionado", () => {
    render(<ResizeHandle handlers={handlers()} alwaysVisible />);

    expect(screen.getByTestId("resize-handle").className).toContain("opacity-100");
  });

  it("no post-it não selecionado, aparece com o ponteiro em cima", () => {
    render(<ResizeHandle handlers={handlers()} alwaysVisible={false} />);
    const handle = screen.getByTestId("resize-handle");

    expect(handle.className).toContain("opacity-0");
    expect(handle.className).toContain("group-hover:opacity-100");
  });

  it("repassa o gesto para quem redimensiona", () => {
    const drag = handlers();
    render(<ResizeHandle handlers={drag} alwaysVisible />);

    fireEvent.pointerDown(screen.getByTestId("resize-handle"), { pointerId: 1, button: 0 });

    expect(drag.onPointerDown).toHaveBeenCalledOnce();
  });

  it("não deixa o gesto chegar ao post-it, que o leria como arraste", () => {
    const noPostIt = vi.fn();
    render(
      <div onPointerDown={noPostIt}>
        <ResizeHandle handlers={handlers()} alwaysVisible />
      </div>,
    );

    fireEvent.pointerDown(screen.getByTestId("resize-handle"), { pointerId: 1, button: 0 });

    // Sem isto, puxar a alça moveria o post-it e o redimensionaria ao mesmo tempo.
    expect(noPostIt).not.toHaveBeenCalled();
  });

  it("não é anunciada por leitor de tela", () => {
    render(<ResizeHandle handlers={handlers()} alwaysVisible />);

    // É um alvo de ponteiro sem equivalente por teclado; anunciá-la prometeria uma ação que
    // não existe. Redimensionar por teclado não está no PRD.
    expect(screen.getByTestId("resize-handle").getAttribute("aria-hidden")).toBe("true");
  });
});
