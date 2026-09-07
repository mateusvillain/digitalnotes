import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SelectionBox } from "./SelectionBox";

describe("SelectionBox", () => {
  it("não desenha nada fora de um arrasto", () => {
    render(<SelectionBox rect={null} />);

    expect(screen.queryByTestId("selection-box")).toBeNull();
  });

  it("desenha em coordenadas de canvas, para acompanhar zoom e pan pela camada", () => {
    render(<SelectionBox rect={{ x: 40, y: 80, w: 200, h: 160 }} />);
    const box = screen.getByTestId("selection-box");

    expect(box.style.left).toBe("40px");
    expect(box.style.top).toBe("80px");
    expect(box.style.width).toBe("200px");
    expect(box.style.height).toBe("160px");
  });

  it("não captura o ponteiro, que está no meio do arrasto que o desenha", () => {
    render(<SelectionBox rect={{ x: 0, y: 0, w: 10, h: 10 }} />);

    expect(screen.getByTestId("selection-box").className).toContain("pointer-events-none");
  });
});
