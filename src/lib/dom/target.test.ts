import { describe, expect, it } from "vitest";
import { isEditableTarget, isInteractiveTarget } from "./target";

/** Cria um elemento anexado ao documento, para `closest` ter árvore por onde subir. */
function elemento(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  document.body.append(node);
  return node;
}

/** O jsdom não deriva `isContentEditable` do atributo. */
function editavel(): HTMLElement {
  const node = elemento("div", { contenteditable: "true" });
  Object.defineProperty(node, "isContentEditable", { value: true });
  return node;
}

describe("isEditableTarget", () => {
  it("reconhece input, textarea e select", () => {
    for (const tag of ["input", "textarea", "select"]) {
      expect(isEditableTarget(elemento(tag))).toBe(true);
    }
  });

  it("reconhece contenteditable", () => {
    expect(isEditableTarget(editavel())).toBe(true);
  });

  it("não reconhece um div comum", () => {
    expect(isEditableTarget(elemento("div"))).toBe(false);
  });

  it("aguenta alvo nulo e alvo que não é elemento", () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(document)).toBe(false);
  });
});

describe("isInteractiveTarget", () => {
  it("inclui tudo que é editável", () => {
    expect(isInteractiveTarget(elemento("textarea"))).toBe(true);
    expect(isInteractiveTarget(editavel())).toBe(true);
  });

  it("reconhece botão, link e os papéis que ativam com espaço", () => {
    expect(isInteractiveTarget(elemento("button"))).toBe(true);
    expect(isInteractiveTarget(elemento("a", { href: "#" }))).toBe(true);
    expect(isInteractiveTarget(elemento("div", { role: "radio" }))).toBe(true);
    expect(isInteractiveTarget(elemento("div", { role: "note" }))).toBe(true);
  });

  it("reconhece pelo ancestral, e não só pelo próprio nó", () => {
    const botao = elemento("button");
    const dentro = document.createElement("span");
    botao.append(dentro);

    // O alvo de um clique num botão costuma ser o que está dentro dele.
    expect(isInteractiveTarget(dentro)).toBe(true);
  });

  it("não reconhece o fundo do quadro", () => {
    expect(isInteractiveTarget(elemento("div"))).toBe(false);
    expect(isInteractiveTarget(document.body)).toBe(false);
  });

  it("aguenta alvo nulo", () => {
    expect(isInteractiveTarget(null)).toBe(false);
  });
});
