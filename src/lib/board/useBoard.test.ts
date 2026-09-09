import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defined } from "@/test-utils/defined";
import { desvioMaximo, pontosDe } from "@/test-utils/geometry";
import { SIMPLIFY_TOLERANCE } from "@/lib/canvas/simplify";
import { NOTE_COLORS, NOTE_SIZE, STROKE_COLOR_BLACK } from "./types";
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

  it("com additive, o retângulo soma ao que já estava marcado", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(segundo.id));

    act(() => hook.result.current.beginRectSelection(true));
    act(() => hook.result.current.selectInRect({ x: -150, y: -150, w: 300, h: 300 }));
    expect([...hook.result.current.selection].sort()).toEqual([primeiro.id, segundo.id].sort());

    // Encolher o retângulo até não tocar mais ninguém devolve a seleção ao que ela era.
    act(() => hook.result.current.selectInRect({ x: 5000, y: 5000, w: 10, h: 10 }));
    expect([...hook.result.current.selection]).toEqual([segundo.id]);
  });

  it("sem additive, o retângulo substitui a seleção", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(segundo.id));

    act(() => hook.result.current.beginRectSelection(false));
    act(() => hook.result.current.selectInRect({ x: -150, y: -150, w: 100, h: 100 }));

    // Só o primeiro é tocado, e o segundo sai — arrastar é o gesto padrão de seleção desde
    // que o pan mudou para o espaço, e um gesto que só soma nunca desmarcaria nada.
    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
  });

  it("um retângulo que não toca ninguém esvazia a seleção", () => {
    const { hook, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(segundo.id));

    act(() => hook.result.current.beginRectSelection(false));
    act(() => hook.result.current.selectInRect({ x: 5000, y: 5000, w: 10, h: 10 }));

    // É isto que faz arrastar no vazio desmarcar tudo, sem um caminho próprio para isso.
    expect([...hook.result.current.selection]).toEqual([]);
  });

  it("seleciona pelo retângulo quem ele toca, e só", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();

    act(() => hook.result.current.clearSelection());
    act(() => hook.result.current.beginRectSelection(false));
    // O primeiro nasce centrado em (0,0), o segundo em (500,0).
    act(() => hook.result.current.selectInRect({ x: -150, y: -150, w: 300, h: 300 }));

    expect([...hook.result.current.selection]).toEqual([primeiro.id]);
    expect(hook.result.current.selection.has(segundo.id)).toBe(false);
  });

  it("retângulo que não toca nada não marca ninguém", () => {
    const { hook } = comDoisPostIts();
    act(() => hook.result.current.clearSelection());
    act(() => hook.result.current.beginRectSelection(false));

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

    act(() => hook.result.current.selectNote(primeiro.id));
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

    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 120, y: 80 }));
    act(() => hook.result.current.endDrag());

    expect(posicaoDe(hook, primeiro.id)).toEqual({ x: antes.x + 120, y: antes.y + 80 });
    expect(hook.result.current.dragOffset).toBeNull();
  });

  it("grava inteiros, mesmo com o deslocamento chegando fracionado pelo zoom", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.selectNote(primeiro.id));
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

  it("move exatamente a seleção, e nada além dela", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    const antesSegundo = posicaoDe(hook, segundo.id);

    // Quem decide o que está selecionado é o gesto no post-it; o arraste só move o que
    // encontra marcado. Duas fontes para a mesma regra dariam duas respostas.
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 50, y: 0 }));
    act(() => hook.result.current.endDrag());

    expect(posicaoDe(hook, segundo.id)).toEqual(antesSegundo);
  });

  it("não mexe na seleção ao começar um arraste", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.startDrag(segundo.id));

    expect([...hook.result.current.selection]).toHaveLength(2);
  });

  it("traz para a frente o post-it que foi pego", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.startDrag(primeiro.id));

    // Numa seleção que já existia, nenhum clique promoveu ninguém: sem isto, arrastar um
    // post-it de dentro do grupo o deixaria atrás dos outros.
    const pego = defined(
      hook.result.current.notes.find((note) => note.id === primeiro.id),
      "o post-it pego",
    );
    const outro = defined(
      hook.result.current.notes.find((note) => note.id === segundo.id),
      "o outro post-it",
    );
    expect(pego.z).toBeGreaterThan(outro.z);
  });

  it("cancelar devolve os post-its para onde estavam", () => {
    const { hook, primeiro } = comDoisPostIts();
    const antes = posicaoDe(hook, primeiro.id);

    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.startDrag(primeiro.id));
    act(() => hook.result.current.dragBy({ x: 200, y: 200 }));
    act(() => hook.result.current.cancelDrag());

    expect(hook.result.current.dragOffset).toBeNull();
    expect(posicaoDe(hook, primeiro.id)).toEqual(antes);
  });
});

describe("useBoard — estabilidade dos callbacks", () => {
  it("mantém a identidade dos callbacks de arraste ao longo do gesto", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 0, y: 0 }));
    const antes = {
      startDrag: result.current.startDrag,
      dragBy: result.current.dragBy,
      endDrag: result.current.endDrag,
      cancelDrag: result.current.cancelDrag,
      selectNote: result.current.selectNote,
    };

    act(() => result.current.startDrag(defined(result.current.notes[0], "o post-it").id));
    act(() => result.current.dragBy({ x: 10, y: 10 }));
    act(() => result.current.dragBy({ x: 20, y: 20 }));

    // Esses callbacks descem até cada post-it. Se mudassem de identidade a cada movimento
    // do ponteiro, a memoização cairia e o quadro inteiro re-renderizaria por evento — que
    // é exatamente o que o critério de fluidez proíbe.
    expect(result.current.startDrag).toBe(antes.startDrag);
    expect(result.current.dragBy).toBe(antes.dragBy);
    expect(result.current.endDrag).toBe(antes.endDrag);
    expect(result.current.cancelDrag).toBe(antes.cancelDrag);
    expect(result.current.selectNote).toBe(antes.selectNote);
  });

  it("grava o último movimento quando ele chega junto com o fim do gesto", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 500, y: 500 }));
    const note = defined(result.current.notes[0], "o post-it");
    act(() => result.current.selectNote(note.id));
    act(() => result.current.startDrag(note.id));

    // Soltar o ponteiro reporta o último deslocamento e o fim do gesto no mesmo evento,
    // sem render entre os dois. Uma ref atualizada só no render seguinte gravaria a
    // posição anterior, e o post-it voltaria um pedaço ao ser solto.
    act(() => {
      result.current.dragBy({ x: 137, y: 12 });
      result.current.endDrag();
    });

    expect(defined(result.current.notes[0], "o post-it").x).toBe(note.x + 137);
  });

  it("grava o deslocamento atual mesmo com o endDrag lendo de ref", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 300, y: 300 }));
    const note = defined(result.current.notes[0], "o post-it");

    act(() => result.current.startDrag(note.id));
    act(() => result.current.dragBy({ x: 10, y: 10 }));
    act(() => result.current.dragBy({ x: 90, y: 40 }));
    act(() => result.current.endDrag());

    // Estável não é obsoleto: o callback é o mesmo, e o valor que ele lê é o último.
    expect(defined(result.current.notes[0], "o post-it").x).toBe(note.x + 90);
  });
});

describe("useBoard — redimensionamento", () => {
  function comUmPostIt() {
    const hook = renderHook(() => useBoard());
    act(() => hook.result.current.createNoteAt({ x: 500, y: 500 }));
    return { hook, note: defined(hook.result.current.notes[0], "o post-it criado") };
  }

  function noteAtual(hook: ReturnType<typeof comUmPostIt>["hook"]) {
    return defined(hook.result.current.notes[0], "o post-it");
  }

  it("não redimensiona nada fora do gesto", () => {
    const { result } = renderHook(() => useBoard());

    expect(result.current.resizing).toBeNull();
  });

  it("não toca na store enquanto a alça é arrastada", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 60, y: 40 }));

    expect(hook.result.current.resizing).toEqual({
      id: note.id,
      size: { w: note.w + 60, h: note.h + 40 },
    });
    expect(noteAtual(hook).w).toBe(note.w);
    expect(noteAtual(hook).h).toBe(note.h);
  });

  it("grava o tamanho final ao soltar", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 60, y: 40 }));
    act(() => hook.result.current.endResize());

    expect(noteAtual(hook).w).toBe(note.w + 60);
    expect(noteAtual(hook).h).toBe(note.h + 40);
    expect(hook.result.current.resizing).toBeNull();
  });

  it("grava inteiros, mesmo com o gesto chegando fracionado pelo zoom", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 10.6, y: -4.2 }));
    act(() => hook.result.current.endResize());

    expect(noteAtual(hook).w).toBe(note.w + 11);
    expect(noteAtual(hook).h).toBe(note.h - 4);
  });

  it("respeita o tamanho mínimo já enquanto se arrasta", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: -5000, y: -5000 }));

    // O limite aparece na hora, e não só ao gravar: deixar encolher além do mínimo e
    // devolver o tamanho ao soltar faria o post-it saltar na frente de quem o ajustava.
    expect(hook.result.current.resizing?.size).toEqual({
      w: NOTE_SIZE.minWidth,
      h: NOTE_SIZE.minHeight,
    });
  });

  it("respeita o tamanho máximo", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 999_999, y: 999_999 }));

    expect(hook.result.current.resizing?.size).toEqual({
      w: NOTE_SIZE.maxWidth,
      h: NOTE_SIZE.maxHeight,
    });
  });

  it("não move a âncora do post-it", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 120, y: 90 }));
    act(() => hook.result.current.endResize());

    // O post-it é descrito pelo canto superior esquerdo, e é ele que a alça do canto oposto
    // mantém parado.
    expect(noteAtual(hook).x).toBe(note.x);
    expect(noteAtual(hook).y).toBe(note.y);
  });

  it("mede sempre a partir do tamanho de quando o gesto começou", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 100, y: 0 }));
    act(() => hook.result.current.resizeBy({ x: 40, y: 0 }));
    act(() => hook.result.current.endResize());

    // O deslocamento vem acumulado desde a origem: somar cada aviso ao tamanho anterior
    // faria o post-it crescer o dobro.
    expect(noteAtual(hook).w).toBe(note.w + 40);
  });

  it("cancelar devolve o tamanho de antes", () => {
    const { hook, note } = comUmPostIt();

    act(() => hook.result.current.startResize(note.id));
    act(() => hook.result.current.resizeBy({ x: 300, y: 300 }));
    act(() => hook.result.current.cancelResize());

    expect(hook.result.current.resizing).toBeNull();
    expect(noteAtual(hook).w).toBe(note.w);
  });

  it("ignora o pedido para um post-it que não existe", () => {
    const { hook } = comUmPostIt();

    act(() => hook.result.current.startResize("naoexiste"));

    expect(hook.result.current.resizing).toBeNull();
  });
});

describe("useBoard — o fim do gesto no mesmo evento do último movimento", () => {
  it("grava o tamanho do soltar, e não o do movimento anterior", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 500, y: 500 }));
    const note = defined(result.current.notes[0], "o post-it");

    act(() => {
      result.current.startResize(note.id);
      result.current.resizeBy({ x: 70, y: 30 });
      result.current.endResize();
    });

    // Começo, movimento e fim podem acontecer no mesmo evento: um arrasto rápido dispara
    // pointermove e pointerup sem render entre eles.
    expect(defined(result.current.notes[0], "o post-it").w).toBe(note.w + 70);
    expect(defined(result.current.notes[0], "o post-it").h).toBe(note.h + 30);
  });
});

describe("useBoard — cor da seleção", () => {
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

  /** A cor gravada de um post-it, lida da store. */
  function corDe(hook: ReturnType<typeof comDoisPostIts>["hook"], id: string) {
    return defined(
      hook.result.current.notes.find((note) => note.id === id),
      "o post-it",
    ).color;
  }

  it("não tem cor comum com o board vazio", () => {
    const { result } = renderHook(() => useBoard());

    expect(result.current.selectionColor).toBeNull();
    expect(result.current.selected).toEqual([]);
  });

  it("expõe a cor do post-it selecionado", () => {
    const { hook, primeiro } = comDoisPostIts();

    act(() => hook.result.current.selectNote(primeiro.id));

    expect(hook.result.current.selectionColor).toBe(primeiro.color);
  });

  it("pinta o post-it selecionado e grava na store", () => {
    const { hook, primeiro } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.colorSelection(4));

    expect(corDe(hook, primeiro.id)).toBe(4);
    expect(hook.result.current.selectionColor).toBe(4);
  });

  it("pinta a seleção inteira", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.colorSelection(2));

    expect(corDe(hook, primeiro.id)).toBe(2);
    expect(corDe(hook, segundo.id)).toBe(2);
  });

  it("não pinta quem está fora da seleção", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.colorSelection(5));

    expect(corDe(hook, segundo.id)).toBe(segundo.color);
  });

  it("sem cor comum quando a seleção tem cores diferentes", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.colorSelection(1));

    act(() => hook.result.current.selectNote(segundo.id, true));

    // O segundo continua na cor padrão: não há uma cor a marcar no seletor.
    expect(hook.result.current.selectionColor).toBeNull();
  });

  it("pintar em lote reconcilia a cor comum", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.colorSelection(1));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.colorSelection(3));

    expect(hook.result.current.selectionColor).toBe(3);
  });

  it("não faz nada sem seleção", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.clearSelection());

    act(() => hook.result.current.colorSelection(5));

    expect(corDe(hook, primeiro.id)).toBe(primeiro.color);
    expect(corDe(hook, segundo.id)).toBe(segundo.color);
  });

  it("aceita toda cor da paleta", () => {
    const { hook, primeiro } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    for (let color = 0; color < NOTE_COLORS.length; color += 1) {
      act(() => hook.result.current.colorSelection(color as 0));
      expect(corDe(hook, primeiro.id)).toBe(color);
    }
  });
});

describe("useBoard — apagar a seleção", () => {
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

  it("apaga o post-it marcado", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.deleteSelection());

    expect(hook.result.current.notes.map((note) => note.id)).toEqual([segundo.id]);
  });

  it("apaga a seleção inteira", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));
    act(() => hook.result.current.selectNote(segundo.id, true));

    act(() => hook.result.current.deleteSelection());

    expect(hook.result.current.notes).toEqual([]);
  });

  it("esvazia a seleção depois de apagar", () => {
    const { hook, primeiro } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.deleteSelection());

    // Ids de post-its que não existem mais fariam a próxima ação em lote agir sobre nada.
    expect([...hook.result.current.selection]).toEqual([]);
  });

  it("fecha a edição do post-it apagado", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 0, y: 0 }));

    // Criar já deixa o post-it selecionado e em edição.
    act(() => result.current.deleteSelection());

    expect(result.current.editingId).toBeNull();
  });

  it("não mexe na edição de quem não foi apagado", () => {
    const { hook, primeiro, segundo } = comDoisPostIts();
    act(() => hook.result.current.startEditing(segundo.id));
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.deleteSelection());

    expect(hook.result.current.editingId).toBe(segundo.id);
  });

  it("não faz nada sem seleção", () => {
    const { hook } = comDoisPostIts();
    act(() => hook.result.current.clearSelection());
    const antes = hook.result.current.notes;

    act(() => hook.result.current.deleteSelection());

    expect(hook.result.current.notes).toBe(antes);
  });

  it("apagar duas vezes seguidas não quebra", () => {
    const { hook, primeiro } = comDoisPostIts();
    act(() => hook.result.current.selectNote(primeiro.id));

    act(() => hook.result.current.deleteSelection());
    act(() => hook.result.current.deleteSelection());

    expect(hook.result.current.notes).toHaveLength(1);
  });
});

describe("resetBoard", () => {
  it("descarta os post-its e começa um quadro vazio", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 10, y: 10 }));
    expect(result.current.notes).toHaveLength(1);

    act(() => result.current.resetBoard());

    expect(result.current.notes).toEqual([]);
  });

  it("leva junto a seleção e a edição em andamento", () => {
    const { result } = renderHook(() => useBoard());
    act(() => result.current.createNoteAt({ x: 10, y: 10 }));
    const id = defined(result.current.notes[0], "o post-it criado").id;
    act(() => result.current.selectNote(id));
    act(() => result.current.startEditing(id));

    act(() => result.current.resetBoard());

    // Seleção e edição apontariam para post-its que não existem mais, e a próxima ação em
    // lote agiria sobre nada.
    expect(result.current.selection.size).toBe(0);
    expect(result.current.editingId).toBeNull();
  });
});

describe("useBoard — traço à mão livre", () => {
  it("grava o traço desenhado, na cor com que o lápis nasce", () => {
    const { result } = renderHook(() => useBoard());

    act(() =>
      result.current.addStroke([
        { x: 0, y: 0 },
        { x: 50, y: 20 },
      ]),
    );

    const stroke = defined(result.current.strokes[0], "o traço gravado");
    expect(stroke.points).toEqual([0, 0, 50, 20]);
    expect(stroke.color).toBe(STROKE_COLOR_BLACK);
  });

  it("simplifica antes de gravar: o board guarda a forma, não a amostragem do ponteiro", () => {
    const { result } = renderHook(() => useBoard());
    // Uma reta reportada em 40 passos, como o ponteiro faz.
    const reta = Array.from({ length: 40 }, (_, index) => ({ x: index * 5, y: index * 5 }));

    act(() => result.current.addStroke(reta));

    // Sobram os extremos: os do meio não descrevem nada que eles já não digam.
    expect(defined(result.current.strokes[0], "o traço gravado").points).toEqual([0, 0, 195, 195]);
  });

  it("arredonda as coordenadas, que é o que o contrato guarda", () => {
    const { result } = renderHook(() => useBoard());

    act(() =>
      result.current.addStroke([
        { x: 0.4, y: 10.5 },
        { x: 50.6, y: 20.49 },
      ]),
    );

    expect(defined(result.current.strokes[0], "o traço gravado").points).toEqual([0, 11, 51, 20]);
  });

  it("cada traço novo nasce na frente do anterior", () => {
    const { result } = renderHook(() => useBoard());
    const traço = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];

    act(() => result.current.addStroke(traço));
    act(() => result.current.addStroke(traço));

    const [primeiro, segundo] = result.current.strokes;
    expect(defined(segundo, "o segundo traço").z).toBeGreaterThan(
      defined(primeiro, "o primeiro traço").z,
    );
  });

  /**
   * O critério da #67 fala do desvio do traço **original**, e o que se compara aqui é o que
   * o board guarda de verdade — depois da simplificação e do arredondamento das coordenadas.
   * Medir só a saída da função pura verificaria a garantia num valor que não é o gravado.
   */
  it("o traço gravado não se afasta do desenhado além do orçamento de desvio", () => {
    const { result } = renderHook(() => useBoard());
    const rabisco = Array.from({ length: 600 }, (_, index) => {
      const t = (index / 599) * Math.PI * 4;
      return { x: index * 0.8, y: 120 + Math.sin(t) * 60 + Math.sin(t * 3) * 8 };
    });

    act(() => result.current.addStroke(rabisco));

    const gravado = pontosDe(defined(result.current.strokes[0], "o traço gravado").points);
    // Tolerância mais o arredondamento: meia unidade por eixo, `SQRT1_2` na diagonal.
    expect(desvioMaximo(rabisco, gravado)).toBeLessThanOrEqual(SIMPLIFY_TOLERANCE + Math.SQRT1_2);
    expect(gravado.length).toBeLessThan(rabisco.length / 10);
  });

  it("não grava um traço sem os dois pontos que o contrato exige", () => {
    const { result } = renderHook(() => useBoard());

    act(() => result.current.addStroke([{ x: 5, y: 5 }]));

    expect(result.current.strokes).toEqual([]);
  });
});
