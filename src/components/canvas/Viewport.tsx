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
  canvasToScreen,
  rectFromCorners,
  screenToCanvas,
  type Point,
  type Rect,
} from "@/lib/canvas/coords";
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

/**
 * Movimento, em pixels de tela, abaixo do qual soltar o botão ainda conta como clique.
 *
 * Sem essa folga, a mão treme entre apertar e soltar e o clique que deveria limpar a
 * seleção vira um arrasto de zero efeito.
 */
const CLICK_SLOP = 4;

/** Pixels equivalentes a uma unidade de `deltaY` em cada modo de rolagem do browser. */
const DELTA_MODE_TO_PIXELS = { line: 16, page: 100 } as const;

type ViewportProps = Pick<ViewportApi, "viewport" | "pan" | "zoomBy"> & {
  /** Duplo clique no fundo vazio, já convertido para coordenadas de canvas. */
  onBackgroundDoubleClick?: (point: Point) => void;
  /** Clique simples no fundo vazio, sem arrasto. */
  onBackgroundClick?: () => void;
  /** Retângulo de seleção em curso, em coordenadas de canvas. */
  onSelectionRect?: (rect: Rect) => void;
  children?: ReactNode;
};

/**
 * Converte o `deltaY` da roda para pixels.
 *
 * O Firefox reporta rolagem em linhas e alguns dispositivos em páginas; sem normalizar, o
 * mesmo gesto daria um zoom dezenas de vezes menor nesses casos.
 */
function wheelDeltaInPixels(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * DELTA_MODE_TO_PIXELS.line;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * DELTA_MODE_TO_PIXELS.page;
  }
  return event.deltaY;
}

/**
 * Superfície navegável do quadro: arrastar o fundo faz pan, a roda faz zoom ancorado no
 * cursor.
 *
 * O conteúdo do canvas vive dentro de uma única camada transformada, e não de elementos
 * posicionados um a um: com dezenas de post-its, o browser compõe uma transform só em vez
 * de recalcular layout de cada elemento a cada quadro.
 */
/**
 * Gesto em curso sobre o fundo.
 *
 * Arrastar o fundo navega pelo quadro, como o PRD descreve; com Shift, o mesmo arrasto
 * desenha o retângulo de seleção. Um estado só, e não uma flag por gesto, porque os dois
 * são exclusivos por natureza: um ponteiro faz uma coisa de cada vez.
 */
type DragState =
  | { kind: "pan"; pointerId: number; last: Point; moved: boolean }
  | { kind: "marquee"; pointerId: number; start: Point };

export function Viewport({
  viewport,
  pan,
  zoomBy,
  onBackgroundDoubleClick,
  onBackgroundClick,
  onSelectionRect,
  children,
}: ViewportProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
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
      zoomBy(Math.exp(-wheelDeltaInPixels(event) * WHEEL_SENSITIVITY), localPoint(event));
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, [zoomBy, localPoint]);

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

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // O gesto nasce no fundo ou na camada do canvas; um post-it (issue #15) para o evento
      // antes de chegar aqui.
      if (!isBackground(event)) return;
      if (event.button !== 0) return;

      event.currentTarget.setPointerCapture(event.pointerId);

      if (event.shiftKey) {
        const start = screenToCanvas(localPoint(event), viewport);
        drag.current = { kind: "marquee", pointerId: event.pointerId, start };
        setMarquee(rectFromCorners(start, start));
        return;
      }

      drag.current = {
        kind: "pan",
        pointerId: event.pointerId,
        last: { x: event.clientX, y: event.clientY },
        moved: false,
      };
    },
    [isBackground, localPoint, viewport],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (state === null || state.pointerId !== event.pointerId) return;

      if (state.kind === "marquee") {
        const rect = rectFromCorners(state.start, screenToCanvas(localPoint(event), viewport));
        setMarquee(rect);
        onSelectionRect?.(rect);
        return;
      }

      // Diferença de clientX/Y, e não movementX/Y: este é o mesmo sistema de coordenadas
      // usado nas conversões, não muda com o zoom da página e não fica indefinido em
      // browsers que não implementam movement em eventos de ponteiro.
      const dx = event.clientX - state.last.x;
      const dy = event.clientY - state.last.y;
      pan(dx, dy);

      state.last = { x: event.clientX, y: event.clientY };
      // Uma vez arrasto, sempre arrasto: voltar ao ponto de partida não devolve o gesto à
      // condição de clique.
      state.moved = state.moved || Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP;
    },
    [localPoint, onSelectionRect, pan, viewport],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (state === null || state.pointerId !== event.pointerId) return;

      drag.current = null;
      setMarquee(null);
      // Depois de um pointercancel o ponteiro já não está ativo, e soltar a captura de um id
      // inativo lança.
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      // Navegar pelo quadro não é clicar no fundo: sem a folga de movimento, todo pan
      // terminaria limpando a seleção.
      if (state.kind === "pan" && !state.moved) onBackgroundClick?.();
    },
    [onBackgroundClick],
  );

  const origin = canvasToScreen({ x: 0, y: 0 }, viewport);

  return (
    <div
      ref={surfaceRef}
      // O cursor muda por CSS, e não por estado: arrastar não precisa de re-render.
      className="whiteboard-surface absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      style={
        {
          // A malha acompanha o zoom e o pan, senão o fundo fica parado e o quadro parece
          // não se mexer.
          "--canvas-dot-gap": `${DOT_GAP * viewport.scale}px`,
          backgroundPosition: `${origin.x}px ${origin.y}px`,
        } as CSSProperties
      }
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
