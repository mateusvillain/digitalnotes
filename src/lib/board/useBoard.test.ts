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

describe("useBoard — seleção", () => {
  /** Cria dois post-its e devolve os dois, já fora de edição. */
  function comDoisPostIts() {
    const hook = renderHook(() => useBoard());
    act(() => hook.result.current.createNoteAt({ x: 0, y: 0 }));
    act(() => hook.result.current.createNoteAt({ x: 500, y: 0 }));

    return {
      hook,
      primeiro: defined(hook.result.current.notes[0], "o primeiro post-it"),
      segundo: defined(hook.result.current.notes[1], "o segundo post-it"),
    };
  }

  it("começa sem nada selecionado", () => {
    const { result } = renderHook(() => useBoard());

    expect([...result.current.selection]).toEqual([]);
  });

  it("já deixa selecionado o post-it recém-criado", () => {
    const { result } = renderHook(() => useBoard());

    act(() => result.current.createNoteAt({ x: 0, y: 0 }));

    expect([...result.current.selection]).toEqual([
      defined(result.current.notes[0], "o post-it criado").id,
    ]);
  });

  it("selecionar um post-it desmarca os demais", () => {
    const { hook, primeiro } = comDoisPostIts();

    act(() => hook.result.current.selectNote(primeiro.id));

    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
  });

  it("shift-clique acrescenta e tira da seleção", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();

    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));
    expect([...hook.result.current.selection].sort()).toEqual([primeiro.id, segundo.id].sort());

    act(() => hook.result.current.selectNote(segundo.id, true));
    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
  });

  it("traz para a frente o post-it selecionado, e grava isso na store", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    const zDoSegundo = segundo.z;

    act(() => hook.result.current.selectNote(primeiro.id));

    const promovido = defined(
      hook.result.current.notes.find((note) => note.id === primeiro.id),
      "o post-it promovido",
    );
    expect(promovido.z).toBeGreaterThan(zDoSegundo);
  });

  it("também traz para a frente o post-it acrescentado com shift", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();

    act(() => hook.result.current.selectNote(segundo.id));
    act(() => hook.result.current.selectNote(primeiro.id, true));

    // Shift-clique também é apontar para um post-it, e numa ordem que o usuário escolheu.
    const promovido = defined(
      hook.result.current.notes.find((note) => note.id === primeiro.id),
      "o post-it promovido",
    );
    expect(promovido.z).toBeGreaterThan(
      defined(
        hook.result.current.notes.find((note) => note.id === segundo.id),
        "o outro post-it",
      ).z,
    );
  });

  it("não reordena o board ao tirar um post-it da seleção", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));
    const zAntes = hook.result.current.notes.map((note) => note.z);

    act(() => hook.result.current.selectNote(segundo.id, true));

    // Desmarcar não é apontar: trazer para a frente o que se acabou de tirar da seleção
    // seria o gesto fazendo o contrário do que diz.
    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
    expect(hook.result.current.notes.map((note) => note.z)).toEqual(zAntes);
  });

  it("o retângulo não reordena o board", () => {
    const { hook } = comDoisPostIts();
    const zAntes = hook.result.current.notes.map((note) => note.z);

    act(() => hook.result.current.selectInRect({ x: -1000, y: -1000, w: 3000, h: 3000 }));

    // Promover em lote reordenaria, um a um, post-its que o usuário não escolheu — numa
    // ordem que ele não pediu.
    expect([...hook.result.current.selection]).toHaveLength(2);
    expect(hook.result.current.notes.map((note) => note.z)).toEqual(zAntes);
  });

  it("o retângulo soma ao que já estava marcado, a partir do começo do gesto", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(segundo.id));

    act(() => hook.result.current.beginRectSelection());
    act(() => hook.result.current.selectInRect({ x: -150, y: -150, w: 300, h: 300 }));
    expect([...hook.result.current.selection].sort()).toEqual([primeiro.id, segundo.id].sort());

    // Encolher o retângulo até não tocar mais ninguém devolve a seleção ao que ela era.
    act(() => hook.result.current.selectInRect({ x: 5000, y: 5000, w: 10, h: 10 }));
    expect([...hook.result.current.selection]).toEqual([segundo.id]);
  });

  it("seleciona pelo retângulo quem ele toca, e só", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();

    act(() => hook.result.current.clearSelection());
    act(() => hook.result.current.beginRectSelection());
    // O primeiro nasce centrado em (0,0), o segundo em (500,0).
    act(() => hook.result.current.selectInRect({ x: -150, y: -150, w: 300, h: 300 }));

    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
    expect(hook.result.current.selection.has(segundo.id)).toBe(false);
  });

  it("retângulo que não toca nada não marca ninguém", () => {
    const { hook } = comDoisPostIts();
    act(() => hook.result.current.clearSelection());
    act(() => hook.result.current.beginRectSelection());

    act(() => hook.result.current.selectInRect({ x: 5000, y: 5000, w: 10, h: 10 }));

    expect([...hook.result.current.selection]).toEqual([]);
  });

  it("limpa a seleção quando pedido", () => {
    const { hook, primeiro } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.clearSelection());

    expect([...hook.result.current.selection]).toEqual([]);
  });

  it("mantém a seleção fora do que a store guarda", () => {
    const { hook, primeiro } = comDoisPostIts();

    act(() => hook.result.current.selectNote(primeiro.id));

    // O que vai para a URL é o board. Um campo de seleção pendurado na note viajaria junto
    // — e a store congela justamente para impedir isso.
    for (const note of hook.result.current.notes) {
      expect(Object.keys(note).sort()).toEqual(["color", "h", "id", "text", "w", "x", "y", "z"]);
    }
  });
});

describe("useBoard — arraste", () => {
  function comDoisPostIts() {
    const hook = renderHook(() => useBoard());
    act(() => hook.result.current.createNoteAt({ x: 0, y: 0 }));
    act(() => hook.result.current.createNoteAt({ x: 500, y: 0 }));

    return {
      hook,
      primeiro: defined(hook.result.current.notes[0], "o primeiro post-it"),
      segundo: defined(hook.result.current.notes[1], "o segundo post-it"),
    };
  }

  function posicaoDe(hook: ReturnType<typeof comDoisPostIts>["hook"], id: string) {
    const note = defined(
      hook.result.current.notes.find((candidata) => candidata.id === id),
      `o post-it ${id}`,
    );
    return { x: note.x, y: note.y };
  }

  it("não tem deslocamento fora de um arraste", () => {
    const { result } = renderHook(() => useBoard());

    expect(result.current.dragOffset).toBeNull();
  });

  it("não toca na store enquanto o gesto acontece", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 120, y: 80 }));

    // A posição final é gravada só ao soltar: quem escuta a store é a persistência, que
    // reescreveria a URL a cada quadro do arraste.
    expect(hook.result.current.dragOffset).toEqual({ x: 120, y: 80 });
    expect(posicaoDe(hook, primeiro.id)).toEqual(antes);
  });

  it("grava a posição final ao soltar", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 120, y: 80 }));
    act(() => hook.result.current.endDrag());

    expect(posicaoDe(hook, primeiro.id)).toEqual({ x: antes.x + 120, y: antes.y + 80 });
    expect(hook.result.current.dragOffset).toBeNull();
  });

  it("grava inteiros, mesmo com o deslocamento chegando fracionado pelo zoom", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 10.4, y: -3.7 }));
    act(() => hook.result.current.endDrag());

    // Cada casa decimal custa caracteres de link.
    expect(posicaoDe(hook, primeiro.id)).toEqual({ x: antes.x + 10, y: antes.y - 4 });
  });

  it("move junto todos os post-its selecionados", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    const antesPrimeiro = posicaoDe(hook, primeiro.id);
    const antesSegundo = posicaoDe(hook, segundo.id);

    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));
    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 50, y: 50 }));
    act(() => hook.result.current.endDrag());

    expect(posicaoDe(hook, primeiro.id)).toEqual({
      x: antesPrimeiro.x + 50,
      y: antesPrimeiro.y + 50,
    });
    expect(posicaoDe(hook, segundo.id)).toEqual({ x: antesSegundo.x + 50, y: antesSegundo.y + 50 });
  });

  it("arrastar um post-it de fora da seleção move só ele", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    const antesSegundo = posicaoDe(hook, segundo.id);

    act(() => hook.result.current.selectNote(segundo.id));
    // Quem pega um post-it solto não está pedindo para levar junto o que estava marcado.
    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 50, y: 0 }));
    act(() => hook.result.current.endDrag());

    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
    expect(posicaoDe(hook, segundo.id)).toEqual(antesSegundo);
  });

  it("não desfaz a seleção ao arrastar um post-it que já estava nela", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.startDrag(segundo.id));

    expect([...hook.result.current.selection]).toHaveLength(2);
  });

  it("cancelar devolve os post-its para onde estavam", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 200, y: 200 }));
    act(() => hook.result.current.cancelDrag());

    expect(hook.result.current.dragOffset).toBeNull();
    expect(posicaoDe(hook, primeiro.id)).toEqual(antes);
  });
});
