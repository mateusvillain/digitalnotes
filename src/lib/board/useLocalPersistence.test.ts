import { renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadBoard, saveBoard } from "./localStore";
import { createBoardStore } from "./store";
import { SCHEMA_VERSION, type Board } from "./types";
import { SAVE_DEBOUNCE_MS, useLocalPersistence } from "./useLocalPersistence";

const originalIndexedDB = globalThis.indexedDB;

function boardWith(text: string): Board {
  return {
    version: SCHEMA_VERSION,
    notes: [{ id: "a1b2c3", x: 10, y: 20, w: 200, h: 200, color: 0, text, z: 1 }],
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.indexedDB = originalIndexedDB;
});

describe("useLocalPersistence", () => {
  it("restaura o board salvo ao montar", async () => {
    await saveBoard(boardWith("de ontem"));
    const store = createBoardStore();

    renderHook(() => useLocalPersistence(store));

    await waitFor(() => {
      expect(store.getBoard().notes[0]?.text).toBe("de ontem");
    });
  });

  it("deixa o board vazio quando não há nada salvo", async () => {
    const store = createBoardStore();

    renderHook(() => useLocalPersistence(store));

    await waitFor(() => expect(store.getBoard().notes).toEqual([]));
  });

  it("grava as alterações da store com debounce", async () => {
    const store = createBoardStore();
    renderHook(() => useLocalPersistence(store));
    await waitFor(() => expect(store.getBoard().notes).toEqual([]));

    store.addNote({ x: 0, y: 0 });
    // Antes do debounce, nada foi gravado ainda.
    expect(await loadBoard()).toBeNull();

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    await waitFor(async () => expect((await loadBoard())?.notes).toHaveLength(1));
  });

  it("grava uma vez só para uma rajada de alterações", async () => {
    const store = createBoardStore();
    renderHook(() => useLocalPersistence(store));
    await waitFor(() => expect(store.getBoard().notes).toEqual([]));

    const note = store.addNote({ x: 0, y: 0 });
    for (const text of ["a", "an", "ano", "anot"]) {
      store.updateNote(note!.id, { text });
    }
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    // Só o estado final chega ao banco; os intermediários morreram no debounce.
    await waitFor(async () => expect((await loadBoard())?.notes[0]?.text).toBe("anot"));
  });

  it("não sobrescreve o board salvo antes de a restauração terminar", async () => {
    await saveBoard(boardWith("trabalho de ontem"));
    const store = createBoardStore();

    renderHook(() => useLocalPersistence(store));
    // O board da store neste instante ainda é o vazio do primeiro render.
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    await waitFor(() => expect(store.getBoard().notes[0]?.text).toBe("trabalho de ontem"));
    expect((await loadBoard())?.notes[0]?.text).toBe("trabalho de ontem");
  });

  it("preserva o que o usuário criou enquanto a restauração ainda corria", async () => {
    await saveBoard(boardWith("de ontem"));
    const store = createBoardStore();

    renderHook(() => useLocalPersistence(store));
    // Mais rápido que o banco: cria um post-it antes de a leitura voltar.
    store.addNote({ x: 5, y: 5, text: "de agora" });

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    await waitFor(() => expect(store.getBoard().notes[0]?.text).toBe("de agora"));
    await waitFor(async () => expect((await loadBoard())?.notes[0]?.text).toBe("de agora"));
  });

  it("grava a alteração pendente ao desmontar", async () => {
    const store = createBoardStore();
    const { unmount } = renderHook(() => useLocalPersistence(store));
    await waitFor(() => expect(store.getBoard().notes).toEqual([]));

    store.addNote({ x: 0, y: 0, text: "não pode sumir" });
    unmount();

    await waitFor(async () => {
      expect((await loadBoard())?.notes[0]?.text).toBe("não pode sumir");
    });
  });

  it("para de gravar depois de desmontar", async () => {
    const store = createBoardStore();
    const { unmount } = renderHook(() => useLocalPersistence(store));
    await waitFor(() => expect(store.getBoard().notes).toEqual([]));
    unmount();

    store.addNote({ x: 0, y: 0, text: "depois do desmonte" });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2);

    expect(await loadBoard()).toBeNull();
  });

  it("segue funcionando sem IndexedDB, só sem autosave", async () => {
    // @ts-expect-error simula navegador sem suporte
    delete globalThis.indexedDB;
    const store = createBoardStore();

    expect(() => renderHook(() => useLocalPersistence(store))).not.toThrow();

    store.addNote({ x: 0, y: 0, text: "só em memória" });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    expect(store.getBoard().notes[0]?.text).toBe("só em memória");
  });
});
