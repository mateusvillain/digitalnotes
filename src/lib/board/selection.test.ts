import { describe, expect, it } from "vitest";
import type { Rect } from "@/lib/canvas/coords";
import {
  EMPTY_SELECTION,
  intersects,
  notesInRect,
  selectOnly,
  selectedNotes,
  sharedColor,
  toggle,
} from "./selection";
import type { Note } from "./types";

function note(overrides: Partial<Note> = {}): Note {
  return { id: "abc123", x: 0, y: 0, w: 100, h: 100, color: 0, text: "", z: 1, ...overrides };
}

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

describe("selectOnly", () => {
  it("deixa só o post-it pedido", () => {
    expect([...selectOnly("aaa111")]).toEqual(["aaa111"]);
  });
});

describe("toggle", () => {
  it("acrescenta quem está de fora", () => {
    expect([...toggle(selectOnly("aaa111"), "bbb222")]).toEqual(["aaa111", "bbb222"]);
  });

  it("tira quem já está dentro", () => {
    expect([...toggle(selectOnly("aaa111"), "aaa111")]).toEqual([]);
  });

  it("não altera a seleção recebida", () => {
    const antes = selectOnly("aaa111");

    toggle(antes, "bbb222");

    // A seleção é valor, não caixa: quem a segura não pode vê-la mudar por baixo.
    expect([...antes]).toEqual(["aaa111"]);
  });
});

describe("intersects", () => {
  it("reconhece sobreposição parcial", () => {
    expect(intersects(note(), rect(50, 50, 100, 100))).toBe(true);
  });

  it("reconhece o post-it inteiramente dentro do retângulo", () => {
    expect(intersects(note(), rect(-10, -10, 200, 200))).toBe(true);
  });

  it("reconhece o retângulo inteiramente dentro do post-it", () => {
    // Tocar é tocar, venha de que lado vier: um retângulo pequeno sobre um post-it grande
    // seleciona esse post-it.
    expect(intersects(note(), rect(10, 10, 5, 5))).toBe(true);
  });

  it("não conta encostar como intersectar", () => {
    // Retângulo terminando exatamente na borda esquerda do post-it.
    expect(intersects(note(), rect(-50, 0, 50, 100))).toBe(false);
  });

  it("não seleciona nada com retângulo de área nula", () => {
    // É o que um clique sem arrasto produz. Sem a comparação estrita, ele marcaria todo
    // post-it cuja borda passasse pelo ponto clicado.
    expect(intersects(note(), rect(50, 50, 0, 0))).toBe(false);
  });

  it("ignora post-it fora do retângulo", () => {
    expect(intersects(note({ x: 500, y: 500 }), rect(0, 0, 100, 100))).toBe(false);
  });
});

describe("notesInRect", () => {
  it("devolve só os ids tocados pelo retângulo", () => {
    const notes = [
      note({ id: "dentro", x: 0, y: 0 }),
      note({ id: "borda", x: 90, y: 90 }),
      note({ id: "fora", x: 900, y: 900 }),
    ];

    expect([...notesInRect(notes, rect(0, 0, 100, 100))]).toEqual(["dentro", "borda"]);
  });

  it("devolve seleção vazia quando o retângulo não toca nada", () => {
    expect([...notesInRect([note()], rect(900, 900, 10, 10))]).toEqual([...EMPTY_SELECTION]);
  });
});

describe("selectedNotes", () => {
  const notes = [note({ id: "a" }), note({ id: "b" }), note({ id: "c" })];

  it("devolve só as marcadas", () => {
    const marcadas = selectedNotes(notes, new Set(["a", "c"]));

    expect(marcadas.map((each) => each.id)).toEqual(["a", "c"]);
  });

  it("mantém a ordem do board, e não a da seleção", () => {
    // A seleção é um conjunto: ela não tem ordem para oferecer. Quem tem é o board.
    const marcadas = selectedNotes(notes, new Set(["c", "a"]));

    expect(marcadas.map((each) => each.id)).toEqual(["a", "c"]);
  });

  it("ignora id marcado que não existe mais no board", () => {
    expect(selectedNotes(notes, new Set(["a", "sumiu"])).map((each) => each.id)).toEqual(["a"]);
  });

  it("devolve vazio sem seleção", () => {
    expect(selectedNotes(notes, EMPTY_SELECTION)).toEqual([]);
  });
});

describe("sharedColor", () => {
  it("devolve a cor quando todas têm a mesma", () => {
    expect(sharedColor([note({ color: 3 }), note({ color: 3 })])).toBe(3);
  });

  it("devolve null quando as cores divergem", () => {
    // Não há uma "cor atual" a marcar no seletor, e escolher a do primeiro mentiria sobre
    // as demais.
    expect(sharedColor([note({ color: 3 }), note({ color: 1 })])).toBeNull();
  });

  it("devolve null para lista vazia", () => {
    expect(sharedColor([])).toBeNull();
  });

  it("uma note só é a própria cor comum", () => {
    expect(sharedColor([note({ color: 5 })])).toBe(5);
  });

  it("distingue a cor 0 da ausência de cor comum", () => {
    // Amarelo é o índice 0, e um `?? null` descuidado o transformaria em "sem cor comum".
    expect(sharedColor([note({ color: 0 }), note({ color: 0 })])).toBe(0);
  });
});
