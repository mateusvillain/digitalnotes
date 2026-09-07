import { describe, expect, it } from "vitest";
import type { Rect } from "@/lib/canvas/coords";
import {
  EMPTY_SELECTION,
  intersects,
  keepExisting,
  notesInRect,
  selectOnly,
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

describe("keepExisting", () => {
  it("esquece ids que sumiram do board", () => {
    const selecao = new Set(["aaa111", "bbb222"]);

    // Depois de apagar (#19), a seleção não pode continuar apontando para o que não existe.
    expect([...keepExisting(selecao, [note({ id: "bbb222" })])]).toEqual(["bbb222"]);
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
