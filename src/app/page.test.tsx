import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renderiza o título do app", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "digitalnotes" })).toBeDefined();
  });
});
