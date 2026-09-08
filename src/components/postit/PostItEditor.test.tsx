import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NOTE_MAX_TEXT_LENGTH } from "@/lib/board/types";
import { PostItEditor } from "./PostItEditor";
import { UI } from "@/lib/i18n/ui";

function editor() {
  return screen.getByTestId("post-it-editor") as HTMLTextAreaElement;
}

describe("PostItEditor", () => {
  it("abre focado e com o cursor no fim do texto existente", () => {
    render(<PostItEditor initialText="comprar pão" onCommit={vi.fn()} />);

    expect(document.activeElement).toBe(editor());
    expect(editor().selectionStart).toBe("comprar pão".length);
    expect(editor().selectionEnd).toBe("comprar pão".length);
  });

  it("aceita múltiplas linhas, com o Enter quebrando linha", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<PostItEditor initialText="" onCommit={onCommit} />);

    await user.keyboard("primeira{Enter}segunda");

    expect(editor().value).toBe("primeira\nsegunda");
    // Enter é quebra de linha, não confirmação: não encerra a edição.
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("publica o texto ao perder o foco", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <>
        <PostItEditor initialText="antes" onCommit={onCommit} />
        <button type="button">fora</button>
      </>,
    );

    await user.type(editor(), " e depois");
    await user.click(screen.getByRole("button", { name: "fora" }));

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("antes e depois");
  });

  it("publica o texto ao pressionar Escape, saindo pelo foco", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<PostItEditor initialText="antes" onCommit={onCommit} />);

    await user.keyboard("!{Escape}");

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("antes!");
    // Escape não publica sozinho: ele tira o foco e deixa o único caminho de saída
    // publicar. Um segundo caminho exigiria um cadeado contra publicação dupla.
    expect(document.activeElement).not.toBe(editor());
  });

  it("publica uma vez por saída, e volta a publicar numa segunda edição", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <>
        <PostItEditor initialText="texto" onCommit={onCommit} />
        <button type="button">fora</button>
      </>,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "fora" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("texto");

    // Quem edita de novo sem o editor ter sido desmontado precisa que o texto suba de
    // novo: um cadeado de publicação única transformaria isto em perda silenciosa.
    await user.click(editor());
    await user.keyboard(" mais");
    await user.click(screen.getByRole("button", { name: "fora" }));

    expect(onCommit).toHaveBeenLastCalledWith("texto mais");
  });

  it("não deixa atalho global do documento disparar enquanto se digita", async () => {
    const user = userEvent.setup();
    const atalhoGlobal = vi.fn();
    document.addEventListener("keydown", atalhoGlobal);
    render(<PostItEditor initialText="" onCommit={vi.fn()} />);

    // Delete dentro da edição apaga caractere; apagar o post-it (#19) é para fora dela.
    await user.keyboard("ab{Delete}{Backspace}");

    document.removeEventListener("keydown", atalhoGlobal);
    expect(atalhoGlobal).not.toHaveBeenCalled();
  });

  it("não barra ouvinte de captura, que é o limite conhecido desta proteção", async () => {
    const user = userEvent.setup();
    const emCaptura = vi.fn();
    document.addEventListener("keydown", emCaptura, true);
    render(<PostItEditor initialText="" onCommit={vi.fn()} />);

    await user.keyboard("{Delete}");

    document.removeEventListener("keydown", emCaptura, true);
    // Documenta a fronteira em vez de fingir que ela não existe: parar a propagação não
    // alcança a fase de captura. O atalho de #19 precisa, além disto, ignorar evento cujo
    // alvo seja campo editável.
    expect(emCaptura).toHaveBeenCalled();
  });

  it("não tem onde guardar formatação: o campo é um textarea", async () => {
    const user = userEvent.setup();
    render(<PostItEditor initialText="" onCommit={vi.fn()} />);

    await user.paste("<b>negrito</b> e <i>itálico</i>");

    // A garantia contra formatação rica é estrutural, não uma higienização: um textarea só
    // guarda string, então não existe marcação a limpar depois. O jsdom não simula uma
    // colagem com flavor text/html — o que dá para afirmar aqui é a estrutura, e é ela que
    // sustenta o critério.
    expect(editor().tagName).toBe("TEXTAREA");
    expect(editor().value).toBe("<b>negrito</b> e <i>itálico</i>");
    expect(editor().childElementCount).toBe(0);
  });

  it("respeita o limite de texto do contrato", () => {
    render(<PostItEditor initialText="" onCommit={vi.fn()} />);

    expect(editor().maxLength).toBe(NOTE_MAX_TEXT_LENGTH);
  });

  it("tem nome acessível próprio, já que o texto some do post-it durante a edição", () => {
    render(<PostItEditor initialText="" onCommit={vi.fn()} />);

    expect(screen.getByLabelText(UI.en.note.text)).toBe(editor());
  });
});
