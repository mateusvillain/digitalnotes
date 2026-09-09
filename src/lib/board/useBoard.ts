"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { topLeftCenteredAt, type Point, type Rect, type Size } from "@/lib/canvas/coords";
import { simplify } from "@/lib/canvas/simplify";
import {
  EMPTY_SELECTION,
  elementsInRect,
  isEmpty,
  isSelected,
  selectOnly,
  selectedNotes,
  selectedStrokes,
  sharedColor,
  toggle,
  union,
  type ElementKind,
  type Selection,
} from "./selection";
import { strokeBounds } from "./stroke-geometry";
import { clampNoteSize } from "./schema";
import { createBoardStore } from "./store";
import { useLocalPersistence } from "./useLocalPersistence";
import {
  NOTE_SIZE,
  STROKE_COLOR_BLACK,
  createEmptyBoard,
  type Board,
  type Note,
  type NoteColor,
  type Stroke,
} from "./types";

/** Um post-it em redimensionamento e o tamanho que ele tem agora, durante o gesto. */
export interface Resizing {
  id: string;
  size: Size;
}

export interface BoardApi {
  /** Notes do board, na ordem em que a store as guarda. */
  notes: readonly Note[];
  /** Rabiscos do board, na ordem em que a store os guarda (#68). */
  strokes: readonly Stroke[];
  /**
   * Grava um traço recém-desenhado, em coordenadas de canvas.
   *
   * A simplificação (#67) acontece aqui, e não em quem desenhou: é a fronteira entre o
   * gesto e o board, e todo traço que entra passa por ela. Quem desenha entrega os pontos
   * crus que o ponteiro reportou e não precisa saber que existe compressão.
   */
  addStroke: (points: readonly Point[]) => void;
  /**
   * Descarta o board atual e começa um quadro vazio (#58).
   *
   * A seleção e a edição em andamento vão junto: são estados sobre post-its que não existem
   * mais, e mantê-los deixaria a próxima ação em lote agindo sobre nada.
   */
  resetBoard: () => void;
  /**
   * O board inteiro, lido na hora.
   *
   * É função, e não valor, porque quem usa isto é o compartilhamento (#46): ele precisa do
   * estado do instante do clique, e receber o board por prop faria a ação ser recriada a
   * cada tecla digitada num post-it.
   */
  getBoard: () => Board;
  /** Note em edição de texto, ou `null`. Um de cada vez. */
  editingId: string | null;
  /** Ids marcados. Efêmero: não entra na store nem na URL. */
  selection: Selection;
  /** Cria um post-it centrado no ponto do canvas e já o abre para escrever. */
  createNoteAt: (point: Point) => void;
  startEditing: (id: string) => void;
  /**
   * Marca um elemento do quadro. Com `additive`, acrescenta ou tira em vez de trocar.
   *
   * Uma função para as duas espécies, e não uma por espécie: clicar num post-it e clicar
   * num rabisco são o mesmo gesto sobre a mesma seleção, e separá-los duplicaria a regra do
   * shift no dia em que ela mudasse.
   */
  selectElement: (kind: ElementKind, id: string, additive?: boolean) => void;
  /**
   * Deslocamento em curso da seleção, em coordenadas de canvas, ou `null` fora de um
   * arraste. É otimista: mora fora da store até o gesto terminar.
   */
  dragOffset: Point | null;
  /** Começa a arrastar a partir de um post-it, que já chega selecionado. */
  startDrag: (id: string) => void;
  /** Move a seleção enquanto o gesto acontece, sem tocar na store. */
  dragBy: (offset: Point) => void;
  /** Grava as posições finais numa publicação só, e encerra o arraste. */
  endDrag: () => void;
  /** Desfaz o arraste sem gravar nada. */
  cancelDrag: () => void;
  /** Post-it sendo redimensionado e o tamanho que ele tem agora, ou `null`. */
  resizing: Resizing | null;
  /** Começa a redimensionar um post-it. */
  startResize: (id: string) => void;
  /** Cresce ou encolhe o post-it em curso, em coordenadas de canvas. */
  resizeBy: (delta: Point) => void;
  endResize: () => void;
  cancelResize: () => void;
  /**
   * Marca o começo de um retângulo de seleção.
   *
   * Com `additive`, o retângulo soma ao que já estava marcado; sem, ele substitui — que é o
   * que faz um retângulo desenhado no vazio limpar a seleção.
   */
  beginRectSelection: (additive: boolean) => void;
  /** Marca o que o retângulo toca — notas e traços —, somado à base de `beginRectSelection`. */
  selectInRect: (rect: Rect) => void;
  clearSelection: () => void;
  /** As notes marcadas. É por elas que passa o que só vale para post-it: colorir (#17). */
  selected: readonly Note[];
  /**
   * As caixas de tudo que está marcado, notas e traços, em coordenadas de canvas.
   *
   * É por aqui que a barra de ações se ancora. Separada de `selected` porque a pergunta é
   * outra: "onde a seleção está" inclui os rabiscos, enquanto "o que colorir" não.
   */
  selectedRects: readonly Rect[];
  /** Cor comum à seleção, ou `null` se ela estiver vazia ou tiver mais de uma cor. */
  selectionColor: NoteColor | null;
  /** Pinta toda a seleção de uma cor, numa publicação só. */
  colorSelection: (color: NoteColor) => void;
  /** Apaga o que está marcado — notas e traços — e esvazia a seleção. Sem nada, não faz nada. */
  deleteSelection: () => void;
  /** Grava o texto e fecha a edição. */
  commitText: (id: string, text: string) => void;
}

export interface UseBoardOptions {
  /**
   * Board com que a sessão começa. Um board vindo de link compartilhado (#21) entra por
   * aqui, e não por `replaceBoard` depois da montagem, para não existir um instante em que
   * a interface mostra um quadro vazio que o usuário nunca pediu.
   */
  initialBoard?: Board;
  /**
   * Liga o autosave local (#22). Desligado ao abrir um board por link: o `IndexedDB` é a
   * cópia local em edição da rota raiz, e sobrescrevê-la com o conteúdo de um link que
   * alguém mandou apagaria o trabalho de quem abriu.
   */
  autosave?: boolean;
}

/**
 * Liga a store do board à interface.
 *
 * A store (#10) é deliberadamente sem React; este hook é a única ponte, e é aqui que mora
 * o que **não** pode entrar nela: qual post-it está em edição é estado efêmero de
 * interface, e a store congela as notes justamente para que estado assim não vá parar
 * dentro da URL.
 *
 * A store é criada uma vez por montagem, e não em escopo de módulo: em escopo de módulo ela
 * sobreviveria entre testes e, no servidor, entre requisições de usuários diferentes.
 */
export function useBoard({ initialBoard, autosave = true }: UseBoardOptions = {}): BoardApi {
  const [store] = useState(() => createBoardStore(initialBoard));
  // Autosave local (#22): restaura o board de trabalho ao montar e grava as alterações
  // seguintes. Mora aqui, e não no componente, porque é a store — e não a interface — que
  // precisa ser persistida.
  useLocalPersistence(store, autosave);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  /** A seleção de antes do retângulo começar, para o gesto poder ser refeito enquanto anda. */
  const selectionBeforeRect = useRef<Selection>(EMPTY_SELECTION);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [resizing, setResizing] = useState<Resizing | null>(null);

  /**
   * Cópias em ref do que os callbacks de gesto precisam ler.
   *
   * Os callbacks são passados a cada post-it: se mudassem de identidade a cada quadro do
   * gesto, todo post-it re-renderizaria a cada movimento do ponteiro, e é justamente isso
   * que o critério de fluidez proíbe. Lendo de ref, eles ficam estáveis para sempre.
   *
   * Todas são escritas **junto com** o estado, pelos `publish*` abaixo, e não durante o
   * render: soltar o ponteiro reporta o último movimento e o fim do gesto no mesmo evento,
   * e uma ref atualizada só no render seguinte faria o fim gravar o valor anterior.
   */
  const selectionRef = useRef<Selection>(EMPTY_SELECTION);
  const dragOffsetRef = useRef<Point | null>(null);
  const resizingRef = useRef<Resizing | null>(null);

  /**
   * Publica a seleção na ref e no estado, nessa ordem.
   *
   * Aceita a forma de atualização do `useState`, mas resolve-a **aqui**, contra a ref: quem
   * chama precisa saber na hora o que a seleção virou — `selectNote` decide pela resposta
   * se promove o post-it —, e um updater executado lá adiante, no render, responderia tarde
   * demais.
   */
  const publishSelection = useCallback((next: Selection | ((current: Selection) => Selection)) => {
    const value = typeof next === "function" ? next(selectionRef.current) : next;
    selectionRef.current = value;
    setSelection(value);
  }, []);

  /** Publica o deslocamento do arraste na ref e no estado, nessa ordem. */
  const publishDragOffset = useCallback((offset: Point | null) => {
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  }, []);

  /** Publica o tamanho em curso na ref e no estado, nessa ordem. */
  const publishResizing = useCallback((next: Resizing | null) => {
    resizingRef.current = next;
    setResizing(next);
  }, []);

  // O mesmo `getBoard` nos dois argumentos: o board inicial no servidor é o mesmo objeto do
  // primeiro render no cliente, então não há divergência de hidratação a conciliar.
  const board: Board = useSyncExternalStore(store.subscribe, store.getBoard, store.getBoard);

  const createNoteAt = useCallback(
    (point: Point) => {
      // O tamanho é dito uma vez e usado duas: para centrar e para criar. Deixar a store
      // aplicar o padrão dela e centrar por fora daria dois donos da mesma medida, e o
      // post-it nasceria fora do cursor no dia em que uma das duas mudasse.
      const size = { w: NOTE_SIZE.defaultWidth, h: NOTE_SIZE.defaultHeight };
      // Cor padrão e z do topo continuam vindo da store, que é dona deles.
      const note = store.addNote({ ...topLeftCenteredAt(point, size), ...size });
      // Coordenada impossível não cria nada (a store devolve `null`) e não abre edição de
      // um post-it que não existe.
      if (note === null) return;

      setEditingId(note.id);
      // Criar é selecionar: o post-it recém-nascido é sobre o que as próximas ações agem.
      publishSelection(selectOnly("note", note.id));
    },
    [publishSelection, store],
  );

  // `setEditingId` já é estável: embrulhar em useCallback seria só um intermediário.
  const startEditing = setEditingId;

  const selectElement = useCallback(
    (kind: ElementKind, id: string, additive = false) => {
      let promoted = true;

      if (additive) {
        publishSelection((current) => {
          // Shift-clique tira tanto quanto põe, e tirar não é motivo para promover.
          promoted = !isSelected(current, kind, id);
          return toggle(current, kind, id);
        });
      } else {
        publishSelection(selectOnly(kind, id));
      }

      // Selecionar traz para a frente, e isso **é** do board: a ordem de empilhamento vai
      // serializada. Vale para o clique e para o shift-clique, porque nos dois o usuário
      // apontou para aquele post-it, naquela ordem.
      //
      // Só para post-it. O traço não é promovido porque o quadro não tem para onde promovê-lo
      // sem custo: a tinta vive numa camada só, embaixo de todas as notas, e reordenar
      // rabiscos entre si não muda nada que se veja — eles não se cobrem, se somam.
      if (kind === "note" && promoted) store.bringToFront(id);
    },
    [publishSelection, store],
  );

  const beginRectSelection = useCallback((additive: boolean) => {
    // A base sobre a qual o retângulo soma. Vazia quando ele substitui, e é isso que faz
    // arrastar no vazio desmarcar tudo, sem precisar de um caminho próprio para isso.
    selectionBeforeRect.current = additive ? selectionRef.current : EMPTY_SELECTION;
  }, []);

  const selectInRect = useCallback(
    (rect: Rect) => {
      // Soma à base guardada no começo do gesto. Recalcular a partir dela a cada movimento
      // é o que faz encolher o retângulo desmarcar de volta quem ele deixou de tocar.
      const board = store.getBoard();
      const tocados = elementsInRect(board.notes, board.strokes, rect);
      publishSelection(union(selectionBeforeRect.current, tocados));
    },
    [publishSelection, store],
  );

  const clearSelection = useCallback(() => publishSelection(EMPTY_SELECTION), [publishSelection]);

  const startDrag = useCallback(
    (id: string) => {
      publishDragOffset({ x: 0, y: 0 });
      // Pegar um post-it é apontar para ele, como clicar: ele vai para a frente dos demais.
      // Sem isto, arrastar um post-it de dentro de uma seleção o deixaria atrás — a seleção
      // já existia, então nenhum clique chegou a promovê-lo.
      store.bringToFront(id);
    },
    [publishDragOffset, store],
  );

  const dragBy = publishDragOffset;

  const endDrag = useCallback(() => {
    const offset = dragOffsetRef.current;
    publishDragOffset(null);
    if (offset === null) return;

    // Uma publicação só para a seleção inteira: quem escuta é a persistência, que reescreve
    // a URL a cada aviso. E inteiros, porque cada casa decimal custa caracteres de link — e
    // porque o zoom faz o deslocamento chegar aqui fracionado.
    store.updateNotes(
      store
        .getBoard()
        .notes.filter((note) => selectionRef.current.notes.has(note.id))
        .map((note) => ({
          id: note.id,
          patch: {
            x: Math.round(note.x + offset.x),
            y: Math.round(note.y + offset.y),
          },
        })),
    );
  }, [publishDragOffset, store]);

  const cancelDrag = useCallback(() => publishDragOffset(null), [publishDragOffset]);

  const startResize = useCallback(
    (id: string) => {
      const note = store.getNote(id);
      if (note === undefined) return;

      publishResizing({ id, size: { w: note.w, h: note.h } });
    },
    [publishResizing, store],
  );

  const resizeBy = useCallback(
    (delta: Point) => {
      const current = resizingRef.current;
      if (current === null) return;

      // Medido a partir do tamanho de quando o gesto começou, e não do quadro anterior: o
      // deslocamento já vem acumulado desde a origem, e somá-lo ao tamanho atual faria o
      // post-it crescer o dobro.
      const note = store.getNote(current.id);
      if (note === undefined) return;

      // O limite é aplicado enquanto se arrasta, e não só ao gravar: deixar encolher além
      // do mínimo e devolver o tamanho ao soltar faria o post-it saltar na frente de quem
      // o estava ajustando.
      publishResizing({
        id: current.id,
        size: clampNoteSize({ w: note.w + delta.x, h: note.h + delta.y }),
      });
    },
    [publishResizing, store],
  );

  const endResize = useCallback(() => {
    const current = resizingRef.current;
    publishResizing(null);
    if (current === null) return;

    // Inteiros, como na posição: cada casa decimal custa caracteres de link, e o zoom faz o
    // deslocamento chegar aqui fracionado.
    store.updateNote(current.id, {
      w: Math.round(current.size.w),
      h: Math.round(current.size.h),
    });
  }, [publishResizing, store]);

  const cancelResize = useCallback(() => publishResizing(null), [publishResizing]);

  /**
   * As notes marcadas, derivadas e não guardadas.
   *
   * Guardar a lista em estado daria duas fontes para a mesma verdade — a seleção e a cópia
   * dela —, e elas divergiriam no primeiro post-it apagado com algo ainda marcado.
   */
  const selected = useMemo(() => selectedNotes(board.notes, selection), [board.notes, selection]);

  /**
   * As caixas de tudo que está marcado, para a barra de ações se ancorar.
   *
   * A note já é um retângulo; o traço precisa ser medido. Um traço sem forma — sem pontos —
   * não entra: ele não tem onde ancorar nada, e um retângulo inventado na origem puxaria a
   * barra para o canto do canvas.
   */
  const selectedRects = useMemo((): Rect[] => {
    const strokes = selectedStrokes(board.strokes, selection)
      .map(strokeBounds)
      .filter((rect): rect is Rect => rect !== null);

    return [...selected, ...strokes];
  }, [board.strokes, selected, selection]);

  const selectionColor = useMemo(() => sharedColor(selected), [selected]);

  const colorSelection = useCallback(
    (color: NoteColor) => {
      // Uma publicação só para a seleção inteira, como no arraste: quem escuta é a
      // persistência, que reescreve a URL a cada aviso.
      // Só as notes: o seletor pinta post-it, e um traço junto na seleção não é alvo dele.
      store.updateNotes([...selectionRef.current.notes].map((id) => ({ id, patch: { color } })));
    },
    [store],
  );

  const deleteSelection = useCallback(() => {
    /**
     * A seleção de agora, guardada numa constante.
     *
     * O updater do `setEditingId` lá embaixo é **diferido** — roda no render seguinte, quando
     * `publishSelection` já trocou o que a ref aponta. Ler a ref lá dentro perguntaria a um
     * conjunto vazio. O que salva é esta referência, e não a ordem das linhas: a seleção é
     * imutável, então o conjunto antigo continua intacto depois de a ref ser reapontada.
     */
    const deleted = selectionRef.current;
    if (isEmpty(deleted)) return;

    // Numa remoção só, como o resto das ações em lote: quem escuta é a persistência, e uma
    // seleção com notas e traços não são duas reescritas da URL.
    store.removeElements([...deleted.notes], [...deleted.strokes]);
    // Quem estava em edição pode ter sido apagado. Não acontece pelo atalho, que se cala
    // durante a digitação, mas quem chamar isto por outro caminho não tem como saber disso.
    setEditingId((current) => (current !== null && deleted.notes.has(current) ? null : current));
    // A seleção some junto: ids de post-its que não existem mais continuariam marcados e
    // fariam a próxima ação em lote agir sobre nada.
    publishSelection(EMPTY_SELECTION);
  }, [publishSelection, store]);

  const addStroke = useCallback(
    (points: readonly Point[]) => {
      const simplified = simplify(points);
      store.addStroke({
        color: STROKE_COLOR_BLACK,
        points: simplified.flatMap((point) => [point.x, point.y]),
      });
    },
    [store],
  );

  const resetBoard = useCallback(() => {
    store.replaceBoard(createEmptyBoard());
    setEditingId(null);
    publishSelection(EMPTY_SELECTION);
  }, [publishSelection, store]);

  const commitText = useCallback(
    (id: string, text: string) => {
      store.updateNote(id, { text });
      setEditingId((current) => (current === id ? null : current));
    },
    [store],
  );

  return {
    notes: board.notes,
    strokes: board.strokes,
    addStroke,
    getBoard: store.getBoard,
    resetBoard,
    editingId,
    selection,
    createNoteAt,
    startEditing,
    commitText,
    dragOffset,
    startDrag,
    dragBy,
    endDrag,
    cancelDrag,
    resizing,
    startResize,
    resizeBy,
    endResize,
    cancelResize,
    selectElement,
    beginRectSelection,
    selectInRect,
    clearSelection,
    selected,
    selectedRects,
    selectionColor,
    colorSelection,
    deleteSelection,
  };
}
