import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NOTE_MAX_TEXT_LENGTH } from "@/lib/board/types";
import { PostItEditor } from "./PostItEditor";

function editor() {
  return screen.getByTestId("post-it-editor") as HTMLTextAreaElement;
}

describe("PostItEditor", () => {
  it("abre focado e com o cursor no fim do texto existente", () => {
    render(<PostItEditor initialText="comprar pão" onFinish={vi.fn()} />);

    expect(document.activeElement).toBe(editor());
    expect(editor().selectionStart).toBe("comprar pão".length);
    expect(editor().selectionEnd).toBe("comprar pão".length);
  });

  it("aceita múltiplas linhas, com o Enter quebrando linha", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PostItEditor initialText="" onFinish={onFinish} />);

    await user.keyboard("primeira{Enter}segunda");

    expect(editor().value).toBe("primeira\nsegunda");
    // Enter é quebra de linha, não confirmação: não encerra a edição.
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("publica o texto ao perder o foco", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <>
        <PostItEditor initialText="antes" onFinish={onFinish} />
        <button type="button">fora</button>
      </>,
    );

    await user.type(editor(), " e depois");
    await user.click(screen.getByRole("button", { name: "fora" }));

    expect(onFinish).toHaveBeenCalledExactlyOnceWith("antes e depois");
  });

  it("publica o texto ao pressionar Escape", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PostItEditor initialText="antes" onFinish={onFinish} />);

    await user.keyboard("!{Escape}");

    expect(onFinish).toHaveBeenCalledExactlyOnceWith("antes!");
  });

  it("publica uma vez só quando o Escape é seguido de perda de foco", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <>
        <PostItEditor initialText="texto" onFinish={onFinish} />
        <button type="button">fora</button>
      </>,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "fora" }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("não deixa atalho global disparar enquanto se digita", async () => {
    const user = userEvent.setup();
    const atalhoGlobal = vi.fn();
    render(
      <div onKeyDown={atalhoGlobal}>
        <PostItEditor initialText="" onFinish={vi.fn()} />
      </div>,
    );

    // Delete dentro da edição apaga caractere; apagar o post-it (#19) é para fora dela.
    await user.keyboard("ab{Delete}{Backspace}{Escape}");

    expect(atalhoGlobal).not.toHaveBeenCalled();
  });

  it("entrega texto puro ao colar conteúdo formatado", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PostItEditor initialText="" onFinish={onFinish} />);

    await user.paste("<b>negrito</b> e <i>itálico</i>");

    // O textarea não interpreta marcação: o que entra é o que se vê, sem nada a higienizar.
    expect(editor().value).toBe("<b>negrito</b> e <i>itálico</i>");
    expect(editor().innerHTML).toBe("");
  });

  it("respeita o limite de texto do contrato", () => {
    render(<PostItEditor initialText="" onFinish={vi.fn()} />);

    expect(editor().maxLength).toBe(NOTE_MAX_TEXT_LENGTH);
  });

  it("tem nome acessível próprio, já que o texto some do post-it durante a edição", () => {
    render(<PostItEditor initialText="" onFinish={vi.fn()} />);

    expect(screen.getByLabelText("Texto do post-it")).toBe(editor());
  });
});
