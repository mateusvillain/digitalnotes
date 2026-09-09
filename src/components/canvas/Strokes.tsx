"use client";

import { strokeColor } from "@/lib/theme/note-colors";
import { STROKE_COLOR_BLACK, type Stroke } from "@/lib/board/types";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useDrag } from "@/lib/canvas/useDrag";
import type { Point, Rect, Size } from "@/lib/canvas/coords";

/**
 * Espessura do traço, em unidades de canvas.
 *
 * Escala com o zoom, como todo conteúdo do canvas: uma linha que mantivesse a espessura na
 * tela engrossaria em relação ao desenho ao afastar, e o rabisco deixaria de ser parte do
 * quadro para virar sobreposição. Espessura variável é escolha de outra issue; aqui ela é
 * uma só, e fica declarada num lugar que a paleta e o preview compartilham.
 */
export const STROKE_WIDTH = 2;

/**
 * Largura do alvo de clique do traço, em unidades de canvas.
 *
 * Seis vezes a tinta. Uma linha de 2 unidades exigiria acerto exato do ponteiro, e errar um
 * rabisco por um pixel é o tipo de coisa que faz a pessoa concluir que traço não é
 * selecionável (#70). O alvo acompanha a forma do traço, e não a caixa dele: um risco na
 * diagonal tem caixa enorme e tinta nenhuma nos cantos, e um alvo retangular roubaria
 * cliques destinados ao quadro embaixo.
 *
 * Em unidades de canvas, como a tinta, então ele encolhe junto no zoom de afastar. É a
 * troca por manter o alvo colado ao desenho: um alvo de tamanho fixo em tela precisaria da
 * escala aqui dentro, e a camada de tinta voltaria a redesenhar a cada quadro do zoom.
 */
export const STROKE_HIT_WIDTH = 12;

interface StrokesProps {
  strokes: readonly Stroke[];
  /** Ids marcados. Um traço marcado ganha moldura e é o que o `Delete` apaga (#70). */
  selection?: ReadonlySet<string>;
  /** Clique num traço. `additive` vem do shift, que acrescenta em vez de trocar. */
  onSelect?: (id: string, additive: boolean) => void;
  /** Deslocamento em curso, aplicado a todo traço selecionado. */
  offset?: Point | null;
  /** O ponteiro passou da folga: começou um arraste a partir deste traço. */
  onDragStart?: (id: string) => void;
  /** Deslocamento em pixels de tela desde a origem do gesto. Quem converte conhece o zoom. */
  onDragMove?: (delta: Point) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  /** Tamanho em curso do traço em redimensionamento, com a caixa de onde ele partiu. */
  resizing?: { id: string; from: Rect; size: Size } | null;
}

/**
 * Converte a lista achatada do contrato (`[x0,y0,x1,y1,…]`) no atributo `points` do SVG.
 *
 * Exportada para os próprios testes: uma coordenada solta no fim — que o contrato não
 * produz, mas um board de fora pode trazer — não pode virar um ponto pela metade.
 */
export function polylinePoints(points: readonly number[]): string {
  const pares: string[] = [];

  for (let index = 0; index + 1 < points.length; index += 2) {
    pares.push(`${points[index]},${points[index + 1]}`);
  }

  return pares.join(" ");
}

/**
 * A folha onde a tinta é pintada.
 *
 * Sem tamanho útil (`overflow-visible` com 1×1): o canvas não tem borda, e dimensionar a
 * caixa exigiria recalculá-la a cada traço novo. O conteúdo é desenhado em coordenadas de
 * canvas, e a camada transformada do viewport cuida de zoom e pan.
 *
 * `pointer-events-none` na folha, e não em cada linha: a tinta em si não é alvo — um clique
 * no vão entre dois rabiscos tem de chegar ao quadro embaixo. Quem reabre o ponteiro é o
 * alvo de clique de cada traço, que sobrepõe o valor herdado (#70).
 */
function InkLayer({ testId, children }: { testId: string; children: ReactNode }) {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      aria-hidden="true"
      data-testid={testId}
    >
      {children}
    </svg>
  );
}

/**
 * Uma linha de tinta.
 *
 * O traço em curso e o já gravado passam pelos dois componentes acima e por este: é o que
 * garante, por construção e não por promessa, que o rabisco fique exatamente igual ao ser
 * solto — mesma espessura, mesma ponta, mesma junção.
 */
function InkLine({
  points,
  color,
  width = STROKE_WIDTH,
  testId,
}: {
  points: readonly number[];
  color: string;
  /** Espessura em unidades de canvas. O halo e o alvo de clique são a mesma linha, mais grossa. */
  width?: number;
  testId?: string;
}) {
  return (
    <polyline
      points={polylinePoints(points)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-testid={testId}
    />
  );
}

/**
 * Um traço gravado: a tinta e o alvo de clique, deslocados e escalados pelo gesto em curso.
 *
 * A moldura de seleção **não** está aqui: ela é um retângulo em volta da área do desenho, e
 * um `<svg>` sem tamanho útil não é lugar para desenhar caixa e alça. Quem a desenha é o
 * `StrokeFrame`, em HTML, com as mesmas classes que o post-it usa.
 *
 * O gesto é aplicado por `transform`, e não reescrevendo os pontos: o browser compõe a
 * transformação sem recalcular nada, e os pontos só mudam quando o ponteiro é solto — que é
 * a mesma escolha que o post-it faz com `left`/`top`.
 */
function StrokeShape({
  stroke,
  selected,
  onSelect,
  offset,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  resizing,
}: {
  stroke: Stroke;
  selected: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  offset: Point | null;
  onDragStart?: (id: string) => void;
  onDragMove?: (delta: Point) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  resizing: { from: Rect; size: Size } | null;
}) {
  /**
   * Colapso de seleção adiado para o soltar, como no post-it.
   *
   * Apertar um traço que já está selecionado não pode desmarcar os outros na hora: o gesto
   * mais provável dali é arrastar o grupo inteiro. Se o ponteiro subir sem ter arrastado,
   * aí sim era um clique, e o clique desmarca os demais.
   */
  const pendingCollapse = useRef(false);
  const dragged = useRef(false);

  const drag = useDrag({
    onStart: () => {
      dragged.current = true;
      onDragStart?.(stroke.id);
    },
    onMove: (delta) => onDragMove?.(delta),
    onEnd: (delta) => {
      // O deslocamento do soltar, e não o do último movimento: soltar o botão pode carregar
      // uma posição que nenhum pointermove chegou a reportar, e é essa que vai para a store.
      onDragMove?.(delta);
      onDragEnd?.();
    },
    onCancel: () => onDragCancel?.(),
  });

  function handlePointerDown(event: PointerEvent<SVGElement>): void {
    if (event.button !== 0) return;
    // O gesto para aqui: sem isto o mesmo `pointerdown` chegaria à superfície e começaria um
    // retângulo de seleção por cima do traço recém-marcado.
    event.stopPropagation();

    dragged.current = false;
    pendingCollapse.current = false;

    if (event.shiftKey || !selected) onSelect?.(stroke.id, event.shiftKey);
    else pendingCollapse.current = true;

    // Shift sobre um traço selecionado o **tira** da seleção: seguir arrastando moveria
    // justamente o que se acabou de desmarcar.
    if (event.shiftKey && selected) return;

    drag.onPointerDown(event);
  }

  function handlePointerUp(event: PointerEvent<SVGElement>): void {
    drag.onPointerUp(event);
    if (pendingCollapse.current && !dragged.current) onSelect?.(stroke.id, false);
    pendingCollapse.current = false;
  }

  function handlePointerCancel(event: PointerEvent<SVGElement>): void {
    drag.onPointerCancel(event);
    pendingCollapse.current = false;
  }

  /*
    A transformação do gesto em curso, em coordenadas de canvas.

    A escala vem antes da translação na leitura do SVG (a lista se aplica da direita para a
    esquerda), e é ancorada no canto da caixa de partida: é a mesma âncora que
    `scaleStrokePoints` usa ao gravar, e sem ela o traço saltaria de lugar no instante em
    que o ponteiro é solto.
  */
  const partes: string[] = [];
  if (offset !== null) partes.push(`translate(${offset.x} ${offset.y})`);
  if (resizing !== null) {
    const fatorX = resizing.from.w === 0 ? 1 : resizing.size.w / resizing.from.w;
    const fatorY = resizing.from.h === 0 ? 1 : resizing.size.h / resizing.from.h;
    partes.push(
      `translate(${resizing.from.x} ${resizing.from.y})`,
      `scale(${fatorX} ${fatorY})`,
      `translate(${-resizing.from.x} ${-resizing.from.y})`,
    );
  }

  return (
    <g
      data-testid="stroke-group"
      data-stroke-id={stroke.id}
      data-selected={selected}
      data-dragging={offset !== null}
      data-resizing={resizing !== null}
      transform={partes.length === 0 ? undefined : partes.join(" ")}
    >
      <InkLine points={stroke.points} color={strokeColor(stroke.color)} testId="stroke" />
      <polyline
        points={polylinePoints(stroke.points)}
        fill="none"
        stroke="transparent"
        strokeWidth={STROKE_HIT_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        // `stroke` e não `all`: só a faixa em volta da linha recebe o ponteiro. Com `all`, o
        // miolo de um rabisco fechado — um círculo, uma nuvem — viraria alvo também, e um
        // clique no vazio lá dentro selecionaria um traço que a pessoa não apontou.
        pointerEvents="stroke"
        className="cursor-move touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-testid="stroke-hit"
      />
    </g>
  );
}

/**
 * A camada de tinta do quadro (#68).
 *
 * Um `<svg>` só para todos os traços, e não um por traço: são dezenas de linhas sobre o
 * mesmo sistema de coordenadas, e o navegador pinta uma árvore só.
 *
 * Fica **debaixo** dos post-its — eles carregam `z-index` próprio, e a tinta não. É a ordem
 * que mantém o texto de uma nota legível, e vale igual para o traço em curso, que desenha
 * nesta mesma altura: o rabisco não salta de camada ao ser solto. O `z` do traço ordena os
 * traços entre si, que é a pilha à qual ele pertence.
 */
export function Strokes({
  strokes,
  selection,
  onSelect,
  offset = null,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  resizing = null,
}: StrokesProps) {
  // Ordenado por `z` na hora de desenhar, e não guardado ordenado: a ordem da lista é do
  // board, e é o `z` que diz quem fica por cima.
  const porZ = [...strokes].sort((a, b) => a.z - b.z);

  return (
    <InkLayer testId="strokes">
      {porZ.map((stroke) => (
        <StrokeShape
          key={stroke.id}
          stroke={stroke}
          selected={selection?.has(stroke.id) ?? false}
          onSelect={onSelect}
          // Arrastar move a seleção inteira junto: o gesto começa num traço, mas o
          // deslocamento vale para todos os que estavam marcados.
          offset={selection?.has(stroke.id) === true ? offset : null}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          resizing={resizing?.id === stroke.id ? resizing : null}
        />
      ))}
    </InkLayer>
  );
}

interface StrokePreviewProps {
  /** O traço em curso, em coordenadas de canvas, ou `null` fora de um gesto de desenho. */
  points: readonly Point[] | null;
}

/**
 * O traço enquanto ele está sendo desenhado, antes de existir no board.
 *
 * Mora fora da store de propósito: um rabisco em curso é gesto, não conteúdo, e publicá-lo
 * a cada ponto faria o autosave gravar dezenas de versões de um traço que ainda não
 * terminou.
 *
 * Desenha pelos mesmos dois componentes do traço gravado, e na mesma altura de camada — é o
 * que faz o rabisco continuar exatamente onde estava quando o ponteiro é solto, em vez de
 * piscar de lugar ao virar conteúdo.
 *
 * Nasce preto porque é a cor com que o lápis nasce ({@link STROKE_COLOR_BLACK}); a mesma
 * constante que a gravação usa, para o que se vê desenhando não poder divergir do que fica.
 */
export function StrokePreview({ points }: StrokePreviewProps) {
  if (points === null || points.length < 2) return null;

  return (
    <InkLayer testId="stroke-preview">
      <InkLine
        points={points.flatMap((point) => [point.x, point.y])}
        color={strokeColor(STROKE_COLOR_BLACK)}
      />
    </InkLayer>
  );
}
