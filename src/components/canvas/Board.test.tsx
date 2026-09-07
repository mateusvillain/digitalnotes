import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/board/types";
import { defined } from "@/test-utils/defined";
import { Board } from "./Board";

function note(overrides: Partial<Note> = {}): Note {
  return { id: "abc123", x: 0, y: 0, w: 200, h: 200, color: 0, text: "", z: 1, ...overrides };
}

describe("Board", () => {
  it("não desenha nada num board vazio", () => {
    render(<Board notes={[]} />);

    expect(screen.queryAllByTestId("post-it")).toEqual([]);
  });

  it("desenha um post-it por note, na ordem da store", () => {
    render(
      <Board notes={[note({ id: "aaa111" }), note({ id: "bbb222" }), note({ id: "ccc333" })]} />,
    );

    expect(screen.getAllByTestId("post-it").map((element) => element.dataset.noteId)).toEqual([
      "aaa111",
      "bbb222",
      "ccc333",
    ]);
  });

  it("põe em edição só o post-it apontado", () => {
    render(<Board notes={[note({ id: "aaa111" }), note({ id: "bbb222" })]} editingId="bbb222" />);

    expect(screen.getAllByTestId("post-it").map((element) => element.dataset.editing)).toEqual([
      "false",
      "true",
    ]);
    expect(screen.getAllByTestId("post-it-editor")).toHaveLength(1);
  });

  it("repassa o pedido de edição com o id do post-it clicado", async () => {
    const user = userEvent.setup();
    const onEditStart = vi.fn();
    render(
      <Board notes={[note({ id: "aaa111" }), note({ id: "bbb222" })]} onEditStart={onEditStart} />,
    );

    await user.dblClick(defined(screen.getAllByTestId("post-it")[1], "o segundo post-it"));

    expect(onEditStart).toHaveBeenCalledExactlyOnceWith("bbb222");
  });

  it("repassa o texto final com o id do post-it editado", async () => {
    const user = userEvent.setup();
    const onEditCommit = vi.fn();
    render(
      <Board
        notes={[note({ id: "aaa111", text: "antes" })]}
        editingId="aaa111"
        onEditCommit={onEditCommit}
      />,
    );

    await user.keyboard(" e depois{Escape}");

    expect(onEditCommit).toHaveBeenCalledExactlyOnceWith("aaa111", "antes e depois");
  });
});

describe("Board — seleção", () => {
  it("marca visualmente só os post-its da seleção", () => {
    render(
      <Board
        notes={[note({ id: "aaa111" }), note({ id: "bbb222" }), note({ id: "ccc333" })]}
        selection={new Set(["aaa111", "ccc333"])}
      />,
    );

    expect(screen.getAllByTestId("post-it").map((element) => element.dataset.selected)).toEqual([
      "true",
      "false",
      "true",
    ]);
  });

  it("desmarca tudo quando não recebe seleção", () => {
    render(<Board notes={[note({ id: "aaa111" })]} />);

    expect(defined(screen.getAllByTestId("post-it")[0], "o post-it").dataset.selected).toBe(
      "false",
    );
  });

  it("repassa o pedido de seleção com o id e o shift", () => {
    const onSelect = vi.fn();
    render(<Board notes={[note({ id: "aaa111" }), note({ id: "bbb222" })]} onSelect={onSelect} />);

    const segundo = defined(screen.getAllByTestId("post-it")[1], "o segundo post-it");
    fireEvent.pointerDown(segundo, { button: 0, shiftKey: true });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("bbb222", true);
  });
});
