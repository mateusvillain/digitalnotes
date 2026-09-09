"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useBoard, type UseBoardOptions } from "@/lib/board/useBoard";
import { useKeyboardShortcuts } from "@/lib/board/useKeyboardShortcuts";
import { screenToCanvas, type Point } from "@/lib/canvas/coords";
import { useViewport } from "@/lib/canvas/useViewport";
import { useTouchPrimary } from "@/lib/dom/useTouchPrimary";
import { ColorPicker } from "@/components/postit/ColorPicker";
import { NewBoardButton } from "@/components/ui/NewBoardButton";
import { PencilButton } from "@/components/ui/PencilButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { useShareBoard } from "@/lib/board/useShareBoard";
import { Onboarding } from "./Onboarding";
import { Board } from "./Board";
import { Viewport } from "./Viewport";
import { SelectionToolbar } from "./SelectionToolbar";
import { ViewportControls } from "./ViewportControls";

type WhiteboardProps = Pick<UseBoardOptions, "initialBoard" | "autosave">;

/**
 * O quadro: junta o estado de viewport à superfície navegável, aos controles e aos post-its.
 *
 * A composição é a fiação, e só ela: o viewport sabe navegar, o `useBoard` sabe o que é o
 * board, e o `Board` sabe desenhar. Nenhum dos três precisa do outro para ser testado.
 */
export function Whiteboard({ initialBoard, autosave }: WhiteboardProps) {
  const controls = useViewport();
  const board = useBoard({ initialBoard, autosave });
  // Compartilhar lê o board no instante do clique (#46): nunca reage a mudanças da store,
  // porque enviar ao backend é sempre uma decisão explícita de quem escreveu.
  const share = useShareBoard(board.getBoard);
  const touchPrimary = useTouchPrimary();
  const dragOffsetBy = board.dragBy;
  const resizeOffsetBy = board.resizeBy;
  /**
   * A escala atual, lida por ref dentro do conversor de arraste.
   *
   * O conversor é passado a cada post-it. Se mudasse de identidade quando o zoom muda, a
   * memoização dos post-its cairia junto — e é ela que impede o quadro inteiro de
   * re-renderizar a cada movimento do ponteiro.
   */
  const scaleRef = useRef(controls.viewport.scale);
  // Sincronizada por efeito, e não no render: escrever uma ref enquanto se renderiza é
  // inseguro sob render concorrente. Quem lê são os conversores, chamados dentro de um
  // gesto de ponteiro — e o zoom não muda enquanto um post-it está sendo arrastado.
  useEffect(() => {
    scaleRef.current = controls.viewport.scale;
  }, [controls.viewport.scale]);
  const areaRef = useRef<HTMLDivElement>(null);

  /**
   * Converte o deslocamento do ponteiro para unidades de canvas.
   *
   * É o delta de tela dividido pela escala, e não o delta bruto: a 200%, dois pixels de
   * mouse são um pixel de canvas, e sem a divisão o post-it andaria o dobro do cursor.
   *
   * Arrastar e redimensionar fazem a mesma conta porque é a mesma pergunta: quantas
   * unidades de canvas o cursor andou.
   */
  const toCanvasDelta = useCallback((delta: Point): Point => {
    const scale = scaleRef.current;
    return { x: delta.x / scale, y: delta.y / scale };
  }, []);

  const dragBy = useCallback(
    (delta: Point) => dragOffsetBy(toCanvasDelta(delta)),
    [dragOffsetBy, toCanvasDelta],
  );

  const resizeBy = useCallback(
    (delta: Point) => resizeOffsetBy(toCanvasDelta(delta)),
    [resizeOffsetBy, toCanvasDelta],
  );

  /**
   * A apresentação do quadro vazio já cumpriu o papel dela nesta sessão.
   *
   * Trava uma vez e não destrava: sem isso, apagar o último post-it traria as instruções de
   * volta para quem acabou de provar que não precisa mais delas — e a peça reapareceria no
   * meio de uma limpeza de quadro, que é justamente quando ela mais atrapalha.
   */
  const hasNotes = board.notes.length > 0;
  const [taught, setTaught] = useState(hasNotes);
  // Ajuste durante o render, e não num efeito: o efeito só rodaria depois da pintura, e a
  // trava chegaria um quadro atrasada. React reinicia o render com o valor novo antes de
  // pintar, então ninguém vê o estado intermediário.
  if (hasNotes && !taught) setTaught(true);

  /**
   * Ela some no mesmo quadro em que o primeiro post-it aparece.
   *
   * A condição olha `hasNotes` direto, e não só o estado acima: o efeito roda depois da
   * pintura, e esperar por ele deixaria as instruções um quadro a mais na tela, por cima
   * da nota recém-criada.
   */
  const showOnboarding = !hasNotes && !taught;

  /** Um gesto de ponteiro em curso sobre um post-it: arrastar ou redimensionar. */
  const inGesture = board.dragOffset !== null || board.resizing !== null;

  /** Centro da área visível, usado como âncora do zoom por botão. */
  const center = useCallback((): Point => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (rect === undefined) return { x: 0, y: 0 };
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  /**
   * O post-it criado pelo teclado nasce no meio do que está sendo olhado.
   *
   * Sem cursor não há ponto para obedecer, e o centro da área visível é a única resposta
   * que não depende de onde o quadro foi arrastado: criar sempre na origem do canvas
   * colocaria o post-it fora da tela para quem já navegou para longe dela.
   */
  const createNoteAtCenter = useCallback(() => {
    board.createNoteAt(screenToCanvas(center(), controls.viewport));
  }, [board, center, controls.viewport]);

  const save = useCallback(() => void share.share(), [share]);

  /**
   * O modo lápis (#68): enquanto ligado, arrastar desenha em vez de selecionar.
   *
   * Estado do quadro, e não da superfície: quem liga é o teclado ou o botão da moldura, e
   * quem obedece é o `Viewport`. Guardá-lo lá dentro obrigaria a moldura a perguntar à
   * superfície o que ela está fazendo para saber o que desenhar.
   */
  const [pencil, setPencil] = useState(false);
  const togglePencil = useCallback(() => setPencil((ligado) => !ligado), []);
  // `Esc` desliga, e não alterna: quem aperta `Esc` está saindo de alguma coisa, e sair de
  // um modo que não estava ligado não pode ligá-lo.
  const exitPencil = useCallback(() => setPencil(false), []);

  useKeyboardShortcuts({
    onDelete: board.deleteSelection,
    onCreateNote: createNoteAtCenter,
    onSave: save,
    onTogglePencil: togglePencil,
    onCancel: exitPencil,
  });

  return (
    <AppShell
      leadingActions={
        <div className="flex flex-col items-start gap-2">
          <NewBoardButton
            hasNotes={board.notes.length > 0}
            onNewBoard={board.resetBoard}
            share={share.share}
          />
          <PencilButton active={pencil} onToggle={togglePencil} />
        </div>
      }
      trailingActions={
        <ShareButton state={share.state} share={share.share} dismiss={share.dismiss} />
      }
      controls={
        // No toque a pinça faz o mesmo trabalho, e o painel só disputaria o canto onde o
        // polegar descansa — justamente em quem tem menos tela sobrando (#57).
        touchPrimary ? undefined : (
          <ViewportControls
            viewport={controls.viewport}
            zoomBy={controls.zoomBy}
            reset={controls.reset}
            anchor={center}
          />
        )
      }
    >
      <div ref={areaRef} className="absolute inset-0">
        <Viewport
          viewport={controls.viewport}
          pan={controls.pan}
          zoomBy={controls.zoomBy}
          onBackgroundDoubleClick={board.createNoteAt}
          onBackgroundClick={board.clearSelection}
          onSelectionStart={board.beginRectSelection}
          onSelectionRect={board.selectInRect}
          pencil={pencil}
          onStrokeEnd={board.addStroke}
        >
          <Board
            notes={board.notes}
            strokes={board.strokes}
            editingId={board.editingId}
            selection={board.selection}
            onEditStart={board.startEditing}
            onEditCommit={board.commitText}
            onSelect={board.selectNote}
            dragOffset={board.dragOffset}
            onDragStart={board.startDrag}
            onDragMove={dragBy}
            onDragEnd={board.endDrag}
            onDragCancel={board.cancelDrag}
            resizing={board.resizing}
            onResizeStart={board.startResize}
            onResizeMove={resizeBy}
            onResizeEnd={board.endResize}
            onResizeCancel={board.cancelResize}
          />
        </Viewport>

        {/*
          Fora do `Viewport` pelo mesmo motivo da barra de seleção abaixo: dentro da camada
          transformada, o texto cresceria com o zoom e sairia da tela junto com o pan.
        */}
        {showOnboarding ? <Onboarding /> : null}

        {/*
          Fora do `Viewport`, e de propósito duas vezes. Fora da camada transformada, para a
          barra não escalar com o zoom; e fora da superfície, para clicar numa cor não
          chegar ao fundo do quadro, que leria o clique como "limpar a seleção".

          Some durante o gesto: a caixa da seleção é calculada com as posições já gravadas,
          então uma barra visível durante um arraste ficaria parada enquanto os post-its
          andam por baixo dela.
        */}
        {inGesture ? null : (
          <div className="pointer-events-none absolute inset-0">
            <SelectionToolbar rects={board.selected} viewport={controls.viewport}>
              <ColorPicker value={board.selectionColor} onChange={board.colorSelection} />
            </SelectionToolbar>
          </div>
        )}
      </div>
    </AppShell>
  );
}
