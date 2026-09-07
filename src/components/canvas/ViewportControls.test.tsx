import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MAX_SCALE, MIN_SCALE } from "@/lib/canvas/coords";
import { ZOOM_STEP } from "@/lib/canvas/useViewport";
import { ViewportControls } from "./ViewportControls";

function setup(scale: number) {
  const zoomBy = vi.fn();
  const reset = vi.fn();
  const anchor = () => ({ x: 50, y: 40 });

  render(
    <ViewportControls
      viewport={{ x: 0, y: 0, scale }}
      zoomBy={zoomBy}
      reset={reset}
      anchor={anchor}
    />,
  );

  return { zoomBy, reset };
}

describe("ViewportControls", () => {
  it("mostra a escala atual em porcentagem", () => {
    setup(1.5);

    expect(screen.getByRole("button", { name: "Voltar o zoom para 100%" }).textContent).toBe(
      "150%",
    );
  });

  it("amplia e reduz ancorando no centro informado", async () => {
    const { zoomBy } = setup(1);

    await userEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    await userEvent.click(screen.getByRole("button", { name: "Diminuir zoom" }));

    expect(zoomBy).toHaveBeenNthCalledWith(1, ZOOM_STEP, { x: 50, y: 40 });
    expect(zoomBy).toHaveBeenNthCalledWith(2, 1 / ZOOM_STEP, { x: 50, y: 40 });
  });

  it("reseta o viewport", async () => {
    const { reset } = setup(2);

    await userEvent.click(screen.getByRole("button", { name: "Voltar o zoom para 100%" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("desabilita ampliar no zoom máximo", () => {
    setup(MAX_SCALE);

    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toHaveProperty("disabled", false);
  });

  it("desabilita reduzir no zoom mínimo", () => {
    setup(MIN_SCALE);

    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toHaveProperty("disabled", false);
  });
});
