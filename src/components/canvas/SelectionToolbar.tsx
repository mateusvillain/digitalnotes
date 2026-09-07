"use client";

import { useCallback, useState, type ReactNode } from "react";
import { boundingRect, canvasToScreen, type Rect, type Viewport } from "@/lib/canvas/coords";

interface SelectionToolbarProps {
  /** Caixas dos post-its marcados, em coordenadas de canvas. Vazio esconde a barra. */
  rects: readonly Rect[];
  viewport: Viewport;
  children?: ReactNode;
}

/** Folga entre a barra e a caixa da seleção, em pixels de tela. */
const GAP = 8;

/**
 * Barra flutuante ancorada na seleção.
 *
 * Vive **fora** da camada transformada, e é essa a decisão que importa aqui: dentro dela a
 * barra escalaria junto com o quadro, e a 25% os quadradinhos de cor teriam seis pixels.
 * Post-it é conteúdo do board e escala; controle é interface e tem tamanho de tela. Por
 * isso a posição é convertida na mão, com `canvasToScreen`, em vez de sair de graça.
 *
 * Fica acima da seleção e centrada nela. Quando não há espaço acima — seleção encostada no
 * topo da área visível — desce para baixo da caixa, em vez de sair pela borda. A altura
 * própria é medida, e não estimada: ela depende do que for colocado dentro.
 */
export function SelectionToolbar({ rects, viewport, children }: SelectionToolbarProps) {
  const [height, setHeight] = useState(0);

  // Ref de callback, e não efeito: o nó chega aqui já medido, e a barra só muda de tamanho
  // quando o conteúdo muda — que é justamente quando o callback roda de novo.
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) setHeight(node.getBoundingClientRect().height);
  }, []);

  const bounds = boundingRect(rects);
  if (bounds === null) return null;

  const topLeft = canvasToScreen(bounds, viewport);
  const width = bounds.w * viewport.scale;
  const acima = topLeft.y - GAP - height >= 0;

  return (
    <div
      ref={measure}
      className="pointer-events-auto absolute z-20 w-max rounded-control border border-border bg-surface p-1 shadow-control"
      style={{
        left: topLeft.x + width / 2,
        top: acima ? topLeft.y - GAP : topLeft.y + bounds.h * viewport.scale + GAP,
        // Centrar pela largura própria, que só o browser conhece; para cima, a barra sobe a
        // própria altura para o `top` valer como a borda de baixo dela.
        transform: acima ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
      data-testid="selection-toolbar"
      data-placement={acima ? "above" : "below"}
    >
      {children}
    </div>
  );
}
