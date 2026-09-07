import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defined } from "@/test-utils/defined";
import { NOTE_COLORS, NOTE_SIZE } from "./types";
import { useBoard } from "./useBoard";

describe("useBoard", () => {
  it("começa vazio e sem ninguém em edição", () => {
    const { result } = renderHook(() => useBoard());

    expect(result.current.notes).toEqual([]);
    expect(result.current.editingId).toBeNull();
  });

  it("cria o post-it centrado no ponto do canvas", () => {
    const { result } = renderHook(() => useBoard());

    act(() => result.current.createNoteAt({ x: 300, y: 200 }));
    const note = defined(result.current.notes[0], "o post-it criado");

    // O ponto é o centro, não o canto: o post-it nasce onde se olhou.
    expect(note.x + note.w / 2).toBe(300);
    expect(note.y + note.h / 2).toBe(200);
    expect(note.w).toBe(NOTE_SIZE.defaultWidth);
    expect(note.h).toBe(NOTE_SIZE.defaultHeight);
  });

  it("abre o post-it novo já em edição", () => {
    const { result } = renderHook(() => useBoard());

    act(() => result.current.createNoteAt({ x: 0, y: 0 }));

    expect(result.current.editingId).toBe(defined(result.current.notes[0], "o post-it criado").id);
  });

  it("dá ao post-it novo a cor padrão e o z mais alto do board", () => {
    const { result } = renderHook(() => useBoard());

    act(() => result.current.createNoteAt({ x: 0, y: 0 }));
    act(() => result.current.createNoteAt({ x: 500, y: 500 }));
    const primeiro = defined(result.current.notes[0], "o primeiro post-it");
    const segundo = defined(result.current.notes[1], "o segundo post-it");

    expect(NOTE_COLORS[primeiro.color]).toBe("yellow");
    expect(segundo.color).toBe(primeiro.color);
    expect(segundo.z).toBeGreaterThan(primeiro.z);
  });

  it("não abre edição de um post-it que não chegou a existir", () => {
    const { result } = renderHook(() => useBoard());

    // Coordenada impossível — um NaN escapado de uma conversão — não cria nada, e a store
    // devolve null em vez de lançar dentro do handler de evento.
    act(() => result.current.createNoteAt({ x: Number.NaN, y: 0 }));

    expect(result.current.notes).toEqual([]);
    expect(result.current.editingId).toBeNull();
  });

  it("grava o texto na store e fecha a edição", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 0, y: 0 }));
    const id = defined(result.current.notes[0], "o post-it criado").id;

    act(() => result.current.commitText(id, "comprar pão"));

    expect(defined(result.current.notes[0], "o post-it criado").text).toBe("comprar pão");
    expect(result.current.editingId).toBeNull();
  });

  it("edita um post-it existente por pedido, um de cada vez", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 0, y: 0 }));
    act(() => result.current.createNoteAt({ x: 500, y: 0 }));
    const primeiro = defined(result.current.notes[0], "o primeiro post-it");
    const segundo = defined(result.current.notes[1], "o segundo post-it");

    act(() => result.current.startEditing(primeiro.id));
    expect(result.current.editingId).toBe(primeiro.id);

    act(() => result.current.startEditing(segundo.id));
    expect(result.current.editingId).toBe(segundo.id);
  });

  it("não fecha a edição de outro post-it ao gravar um texto atrasado", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 0, y: 0 }));
    act(() => result.current.createNoteAt({ x: 500, y: 0 }));
    const primeiro = defined(result.current.notes[0], "o primeiro post-it");
    const segundo = defined(result.current.notes[1], "o segundo post-it");

    act(() => result.current.startEditing(segundo.id));
    // Sair de um post-it costuma ser o mesmo gesto que entra no próximo: o blur do anterior
    // chega depois. Fechar a edição sem olhar o id fecharia a que acabou de abrir.
    act(() => result.current.commitText(primeiro.id, "texto do primeiro"));

    expect(result.current.editingId).toBe(segundo.id);
  });

  it("mantém uma store por montagem, sem vazar board entre elas", () => {
    const primeira = renderHook(() => useBoard());
    act(() => primeira.result.current.createNoteAt({ x: 0, y: 0 }));
    primeira.unmount();

    const segunda = renderHook(() => useBoard());

    expect(segunda.result.current.notes).toEqual([]);
  });
});
