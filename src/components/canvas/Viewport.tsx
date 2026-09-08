"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  CLICK_SLOP,
  canvasToScreen,
  distance,
  rectFromCorners,
  screenToCanvas,
  type Point,
  type Rect,
} from "@/lib/canvas/coords";
import { pinchChange, pinchSnapshot, type PinchSnapshot } from "@/lib/canvas/pinch";
import { releaseCapture } from "@/lib/canvas/pointer-capture";
import { useSpaceHeld } from "@/lib/canvas/useSpaceHeld";
import { SelectionBox } from "./SelectionBox";
import type { ViewportApi } from "@/lib/canvas/useViewport";

/**
 * Espaçamento da malha de pontos a 100%, em pixels.
 *
 * Mora aqui, e não no CSS, porque precisa ser multiplicado pela escala a cada quadro — o
 * `globals.css` lê este valor pela variável `--canvas-dot-gap` que o componente injeta.
 */
const DOT_GAP = 24;

/**
 * Sensibilidade da roda. O passo é exponencial: cada unidade de rolagem multiplica a
 * escala, o que dá a mesma sensação em trackpad e em mouse de roda travada.
 */
const WHEEL_SENSITIVITY = 0.002;

/** Pixels equivalentes a uma unidade de `deltaY` em cada modo de rolagem do browser. */
const DELTA_MODE_TO_PIXELS = { line: 16, page: 100 } as const;

type ViewportProps = Pick<ViewportApi, "viewport" | "pan" | "zoomBy"> & {
  /** Duplo clique no fundo vazio, já convertido para coordenadas de canvas. */
  onBackgroundDoubleClick?: (point: Point) => void;
  /** Clique simples no fundo vazio, sem arrasto. */
  onBackgroundClick?: () => void;
  /** Começo de um retângulo de seleção. Com `additive`, ele soma ao que já estava marcado. */
  onSelectionStart?: (additive: boolean) => void;
  /** Retângulo de seleção em curso, em coordenadas de canvas. */
  onSelectionRect?: (rect: Rect) => void;
  children?: ReactNode;
};

/**
 * Converte um delta da roda para pixels.
 *
 * O Firefox reporta rolagem em linhas e alguns dispositivos em páginas; sem normalizar, o
 * mesmo gesto andaria dezenas de vezes menos nesses casos.
 */
function wheelDeltaToPixels(delta: number, deltaMode: number): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * DELTA_MODE_TO_PIXELS.line;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * DELTA_MODE_TO_PIXELS.page;
  return delta;
}

/**
 * Deslocamento do quadro para um evento de roda, em pixels de tela.
 *
 * Sinal invertido de propósito: rolar para baixo empurra o **conteúdo** para cima, que é
 * como rola qualquer página. O quadro anda no sentido oposto ao dedo.
 *
 * Com Shift, a rolagem vertical vira horizontal. É a convenção de quem tem roda de um eixo
 * só; nos trackpads o browser já entrega `deltaX` e o Shift não é necessário — por isso o
 * desvio só acontece quando não veio deslocamento horizontal nenhum.
 */
function wheelPan(event: WheelEvent): Point {
  const x = wheelDeltaToPixels(event.deltaX, event.deltaMode);
  const y = wheelDeltaToPixels(event.deltaY, event.deltaMode);

  if (event.shiftKey && x === 0) return { x: -y, y: 0 };
  return { x: -x, y: -y };
}

/**
 * Gesto em curso sobre o fundo.
 *
 * Um estado só, e não uma flag por gesto, porque os dois são exclusivos por natureza: um
 * ponteiro faz uma coisa de cada vez. Qual deles nasce é decidido no `pointerdown`, pelo
 * espaço e pelo tipo de ponteiro, e não muda no meio do caminho.
 *
 * Só o `marquee` guarda a origem em tela e o `started`: é ele que precisa separar clique de
 * arrasto. O `pan` não tem essa dúvida — quem segurou espaço já disse o que queria, e
 * navegar nunca é um clique.
 */
type DragState =
  | { kind: "pan"; pointerId: number; last: Point }
  | {
      kind: "marquee";
      pointerId: number;
      /** Origem em pixels de tela, para separar clique de arrasto. */
      origin: Point;
      /** Origem em coordenadas de canvas: o canto fixo do retângulo. */
      start: Point;
      /** Shift no começo do gesto: o retângulo soma em vez de substituir. */
      additive: boolean;
      /** Falso até passar da folga. Antes disso o gesto ainda pode ser um clique. */
      started: boolean;
    };

/**
 * Superfície navegável do quadro.
 *
 * Os dois gestos que disputam o botão principal do mouse foram separados por um modificador,
 * que é a convenção das ferramentas de quadro:
 *
 * - **Arrastar o fundo seleciona**, desenhando o retângulo. Com Shift ele soma ao que já
 *   estava marcado; sem, substitui.
 * - **Segurar espaço e arrastar navega**, sobre o fundo e sobre os post-its.
 * - **Roda e dois dedos no trackpad navegam** também, sem tecla nenhuma.
 * - **Ctrl (ou ⌘) com a roda dá zoom**, ancorado no cursor. É a mesma tecla que o pinch do
 *   trackpad emite, então pinçar cai nesse caminho sozinho.
 *
 * O zoom deixou de responder à roda pura porque ela passou a mover: são o mesmo evento, e o
 * único lugar que sobra para o zoom é sob um modificador. Os botões de zoom continuam.
 *
 * O conteúdo do canvas vive dentro de uma única camada transformada, e não de elementos
 * posicionados um a um: com dezenas de post-its, o browser compõe uma transform só em vez
 * de recalcular layout de cada elemento a cada quadro.
 */
export function Viewport({
  viewport,
  pan,
  zoomBy,
  onBackgroundDoubleClick,
  onBackgroundClick,
  onSelectionStart,
  onSelectionRect,
  children,
}: ViewportProps) {
  const spaceHeld = useSpaceHeld();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  /**
   * Dedos encostados na tela agora, na ordem em que chegaram.
   *
   * A pinça precisa de dois pontos ao mesmo tempo, e o estado de gesto acima só guarda um
   * ponteiro — dois dedos são dois gestos concorrentes para ele.
   */
  const touches = useRef(new Map<number, Point>());
  /** O instante anterior da pinça, ou `null` quando não há dois dedos na tela. */
  const pinch = useRef<PinchSnapshot | null>(null);
  /**
   * O viewport atual, para os handlers de ponteiro.
   *
   * Lido de uma ref, e não da closure: durante um pan o viewport muda a cada quadro, e
   * handlers que dependessem dele seriam recriados na mesma frequência.
   */
  const viewportRef = useRef(viewport);
  // Sincronizada por efeito, e não no render: escrever uma ref enquanto se renderiza é
  // inseguro sob render concorrente, e aqui não é preciso — quem lê são os handlers de
  // ponteiro, e o viewport não muda no meio de um gesto de marquee.
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);
  /**
   * O retângulo em desenho.
   *
   * É o único estado do viewport que precisa de re-render — pan e zoom se resolvem por
   * transform, mas um retângulo que não redesenha não é um retângulo.
   */
  const [marquee, setMarquee] = useState<Rect | null>(null);

  /** Posição do ponteiro relativa ao canto do container — é o que as conversões esperam. */
  const localPoint = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  }, []);

  /**
   * Zoom pela roda.
   *
   * Precisa de listener nativo não passivo: o `onWheel` do React é registrado de forma
   * passiva na raiz, onde `preventDefault` não tem efeito. Sem isso, ctrl+roda e o pinch do
   * trackpad — que chegam como wheel com `ctrlKey` — dariam zoom no quadro **e** na página
   * ao mesmo tempo.
   */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      // Roda e dois dedos no trackpad **movem** o quadro; com Ctrl (ou ⌘) dão zoom. Essa é a
      // mesma tecla que o pinch do trackpad emite, então o gesto de pinçar cai aqui sozinho,
      // sem ramo próprio.
      if (event.ctrlKey || event.metaKey) {
        const delta = wheelDeltaToPixels(event.deltaY, event.deltaMode);
        zoomBy(Math.exp(-delta * WHEEL_SENSITIVITY), localPoint(event));
        return;
      }

      const delta = wheelPan(event);
      pan(delta.x, delta.y);
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, [zoomBy, pan, localPoint]);

  /**
   * Começa (ou recomeça) a pinça a partir dos dois primeiros dedos na tela.
   *
   * Recomeçar importa quando um terceiro dedo entra ou sai: a distância de referência passa
   * a ser a de agora, senão o quadro daria um salto de escala no meio do gesto.
   */
  const restartPinch = useCallback(() => {
    const [first, second] = [...touches.current.values()];
    pinch.current = first && second ? pinchSnapshot(first, second) : null;
  }, []);

  /** Verdadeiro só para eventos nascidos no fundo, e não em algo desenhado sobre ele. */
  const isBackground = useCallback(
    (event: { target: EventTarget; currentTarget: EventTarget }): boolean => {
      return event.target === event.currentTarget || event.target === layerRef.current;
    },
    [],
  );

  /**
   * Duplo clique no fundo: o gesto que cria um post-it (#13).
   *
   * A conversão para coordenadas de canvas acontece aqui porque é aqui que o viewport é
   * conhecido; quem recebe o evento não deveria precisar saber o zoom para colocar algo
   * sob o cursor.
   */
  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isBackground(event)) return;
      // Mesma guarda do pan logo abaixo: só o botão primário age sobre o quadro. Os
      // browsers atuais só disparam dblclick nele, mas depender disso deixa a regra
      // implícita num handler cujo vizinho a declara.
      if (event.button !== 0) return;

      // Sem isto, o gesto começa selecionando o texto do fundo antes de o post-it aparecer.
      event.preventDefault();
      onBackgroundDoubleClick?.(screenToCanvas(localPoint(event), viewport));
    },
    [isBackground, localPoint, onBackgroundDoubleClick, viewport],
  );

  /**
   * Espaço segurado: o gesto vira navegação, em **captura**.
   *
   * Em captura porque o pan com espaço vale sobre o quadro inteiro, post-its inclusive — e
   * o post-it para o `pointerdown` antes de ele chegar à superfície. Interceptando na
   * descida, o gesto é reivindicado aqui e o post-it nunca chega a armar um arraste.
   */
  const handlePointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!spaceHeld || event.button !== 0) return;

      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        kind: "pan",
        pointerId: event.pointerId,
        last: { x: event.clientX, y: event.clientY },
      };
    },
    [spaceHeld],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // O gesto nasce no fundo ou na camada do canvas; um post-it (issue #15) para o evento
      // antes de chegar aqui.
      if (!isBackground(event)) return;
      if (event.button !== 0) return;
      // Cada handler declara a própria condição: com espaço, o gesto é da captura acima.
      if (spaceHeld) return;

      // No toque não há espaço para segurar: um dedo navega, que é a única forma de mover o
      // quadro por lá, e dois dedos pinçam (#57). Selecionar por retângulo fica para quem
      // tem ponteiro.
      //
      // Vem antes da defesa contra gesto pendurado logo abaixo: o segundo dedo chega
      // justamente enquanto o primeiro ainda navega, e barrá-lo ali impediria a pinça de
      // começar.
      if (event.pointerType === "touch") {
        event.currentTarget.setPointerCapture(event.pointerId);
        touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (touches.current.size >= 2) {
          // O segundo dedo transforma o gesto: o pan de um dedo é abandonado, senão o
          // quadro andaria junto com a pinça pelo dobro do caminho.
          drag.current = null;
          restartPinch();
          return;
        }

        drag.current = {
          kind: "pan",
          pointerId: event.pointerId,
          last: { x: event.clientX, y: event.clientY },
        };
        return;
      }

      // Defesa contra um `pointerup` perdido, que deixaria um gesto pendurado.
      if (drag.current !== null) return;

      event.currentTarget.setPointerCapture(event.pointerId);

      // Arrastar o fundo **seleciona**. Navegar é o gesto com espaço, ou a roda.
      drag.current = {
        kind: "marquee",
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        start: screenToCanvas(localPoint(event), viewportRef.current),
        additive: event.shiftKey,
        started: false,
      };
    },
    [isBackground, localPoint, restartPinch, spaceHeld],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (touches.current.has(event.pointerId)) {
        touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        const previous = pinch.current;
        const [first, second] = [...touches.current.values()];
        if (previous !== null && first && second) {
          const change = pinchChange(previous, pinchSnapshot(first, second));
          // Arrastar com dois dedos move o quadro, e afastá-los dá zoom: as duas coisas
          // acontecem no mesmo gesto, e separá-las obrigaria a pessoa a escolher.
          pan(change.pan.x, change.pan.y);
          zoomBy(change.factor, localPoint({ clientX: change.center.x, clientY: change.center.y }));
          pinch.current = pinchSnapshot(first, second);
          return;
        }
      }

      const state = drag.current;
      if (state === null || state.pointerId !== event.pointerId) return;

      if (state.kind === "pan") {
        // Diferença de clientX/Y, e não movementX/Y: este é o mesmo sistema de coordenadas
        // usado nas conversões, não muda com o zoom da página e não fica indefinido em
        // browsers que não implementam movement em eventos de ponteiro.
        pan(event.clientX - state.last.x, event.clientY - state.last.y);
        state.last = { x: event.clientX, y: event.clientY };
        return;
      }

      const here = { x: event.clientX, y: event.clientY };
      if (!state.started) {
        // Nada de retângulo antes da folga: sem isto um clique no fundo desenharia uma caixa
        // de zero pixel e refaria a seleção a partir dela.
        if (distance(state.origin, here) <= CLICK_SLOP) return;
        state.started = true;
        // O Shift do começo do gesto, e não o de agora: soltá-lo no meio do arrasto não
        // deveria transformar um retângulo que somava num que substitui.
        onSelectionStart?.(state.additive);
      }

      const rect = rectFromCorners(
        state.start,
        screenToCanvas(localPoint(event), viewportRef.current),
      );
      setMarquee(rect);
      onSelectionRect?.(rect);
    },
    [localPoint, onSelectionRect, onSelectionStart, pan, zoomBy],
  );

  /** Encerra o gesto e devolve o que ele era, ou `null` se não havia gesto deste ponteiro. */
  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>): DragState | null => {
      if (touches.current.delete(event.pointerId)) {
        // Tirar um dedo não encerra a pinça enquanto sobrar mais de um; com um só, o gesto
        // volta a ser navegação, e a referência precisa ser refeita a partir de quem ficou.
        restartPinch();
        if (touches.current.size === 1) {
          const [remaining] = [...touches.current.entries()];
          if (remaining) {
            drag.current = { kind: "pan", pointerId: remaining[0], last: remaining[1] };
          }
        }
      }

      const state = drag.current;
      if (state === null || state.pointerId !== event.pointerId) return null;

      drag.current = null;
      setMarquee(null);
      releaseCapture(event);

      return state;
    },
    [restartPinch],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const state = endDrag(event);
      if (state === null || state.kind !== "marquee") return;

      // Um retângulo que nunca chegou a começar foi um clique, e clique no fundo limpa a
      // seleção. Navegar não passa por aqui: mover o quadro não desmarca nada.
      //
      // Com Shift, não: ali o Shift **acrescenta**, como faz no post-it e no retângulo. Um
      // shift-clique que errou o alvo não pode desfazer a seleção que ele ia ampliar.
      if (!state.started && !state.additive) onBackgroundClick?.();
    },
    [endDrag, onBackgroundClick],
  );

  /**
   * Gesto interrompido pelo sistema.
   *
   * Encerra sem interpretar: um cancelamento não é um clique, e tratá-lo como tal limparia
   * a seleção por causa de uma notificação do SO.
   */
  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endDrag(event);
    },
    [endDrag],
  );

  const origin = canvasToScreen({ x: 0, y: 0 }, viewport);

  return (
    <div
      ref={surfaceRef}
      // O cursor muda por CSS, e não por estado: arrastar não precisa de re-render.
      // O cursor conta qual gesto o arrasto vai virar: mão só com espaço, cruz para
      // selecionar. Muda por CSS e por classe, não por estado de gesto: arrastar não
      // precisa de re-render.
      className={`whiteboard-surface absolute inset-0 touch-none overflow-hidden ${
        spaceHeld ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      }`}
      style={
        {
          // A malha acompanha o zoom e o pan, senão o fundo fica parado e o quadro parece
          // não se mexer.
          "--canvas-dot-gap": `${DOT_GAP * viewport.scale}px`,
          backgroundPosition: `${origin.x}px ${origin.y}px`,
        } as CSSProperties
      }
      onDoubleClick={handleDoubleClick}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-space-held={spaceHeld}
      data-testid="viewport-surface"
    >
      <div
        ref={layerRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
        data-testid="viewport-layer"
      >
        {children}
        <SelectionBox rect={marquee} />
      </div>
    </div>
  );
}
