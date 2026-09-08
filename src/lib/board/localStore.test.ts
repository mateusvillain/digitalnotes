import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadBoard, saveBoard } from "./localStore";
import { SCHEMA_VERSION, createEmptyBoard, type Board } from "./types";

const originalIndexedDB = globalThis.indexedDB;

function boardWith(text: string): Board {
  return {
    version: SCHEMA_VERSION,
    notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text, z: 1 }],
  };
}

beforeEach(() => {
  // Banco novo a cada teste: `fake-indexeddb` guarda os dados no processo, e um autosave
  // vazando de um teste para o outro esconderia exatamente o bug que estes testes procuram.
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
});

describe("saveBoard / loadBoard", () => {
  it("devolve null quando nada foi salvo ainda", async () => {
    expect(await loadBoard()).toBeNull();
  });

  it("restaura o board gravado", async () => {
    const board = boardWith("anotação");

    expect(await saveBoard(board)).toBe(true);
    expect(await loadBoard()).toEqual(board);
  });

  it("guarda só o último board salvo", async () => {
    await saveBoard(boardWith("primeira"));
    await saveBoard(boardWith("segunda"));

    const restored = await loadBoard();

    expect(restored?.notes[0]?.text).toBe("segunda");
  });

  it("restaura um board vazio sem confundi-lo com ausência de dados", async () => {
    await saveBoard(createEmptyBoard());

    expect(await loadBoard()).toEqual(createEmptyBoard());
  });

  it("descarta board gravado com versão de schema incompatível", async () => {
    await saveBoard({ ...boardWith("de outra versão"), version: SCHEMA_VERSION + 1 });

    expect(await loadBoard()).toBeNull();
  });

  it("descarta board gravado corrompido", async () => {
    await saveBoard({ naoEUmBoard: true } as unknown as Board);

    expect(await loadBoard()).toBeNull();
  });

  it("descarta notes inválidas e mantém o resto do board", async () => {
    const board = boardWith("válida");
    await saveBoard({
      ...board,
      notes: [...board.notes, { id: "", x: 0, y: 0 } as unknown as Board["notes"][number]],
    });

    const restored = await loadBoard();

    expect(restored?.notes.map((note) => note.text)).toEqual(["válida"]);
  });
});

describe("IndexedDB indisponível", () => {
  it("não quebra ao salvar, apenas reporta que não gravou", async () => {
    // @ts-expect-error simula navegador sem suporte / modo privado restritivo
    delete globalThis.indexedDB;

    expect(await saveBoard(boardWith("sem banco"))).toBe(false);
  });

  it("não quebra ao restaurar, apenas devolve null", async () => {
    // @ts-expect-error simula navegador sem suporte / modo privado restritivo
    delete globalThis.indexedDB;

    expect(await loadBoard()).toBeNull();
  });

  it("não quebra quando abrir o banco lança", async () => {
    vi.spyOn(globalThis.indexedDB, "open").mockImplementation(() => {
      throw new DOMException("cota de armazenamento excedida");
    });

    expect(await saveBoard(boardWith("cota cheia"))).toBe(false);
    expect(await loadBoard()).toBeNull();
  });

  it("não quebra quando a gravação falha", async () => {
    await saveBoard(boardWith("primeira"));
    const board = boardWith("segunda");
    // Um board que a clonagem estruturada não consegue copiar: é assim que o navegador
    // recusa uma gravação sem que dê para prever antes.
    const impossible = { ...board, notes: [{ ...board.notes[0], onError: () => {} }] };

    expect(await saveBoard(impossible as unknown as Board)).toBe(false);
    // E o que já estava salvo continua lá.
    expect((await loadBoard())?.notes[0]?.text).toBe("primeira");
  });
});
