"use client";

import type { CSSProperties } from "react";
import { ResizeHandle } from "@/components/postit/ResizeHandle";
import { useDrag } from "@/lib/canvas/useDrag";
import type { Point, Rect, Size } from "@/lib/canvas/coords";
import type { Stroke } from "@/lib/board/types";
import { strokeBounds } from "@/lib/board/stroke-geometry";

interface StrokeFrameProps {
  stroke: Stroke;
  /** Deslocamento em curso, em coordenadas de canvas, ou `null` fora de um arraste. */
  offset: Point | null;
  /** Tamanho em curso e caixa de partida, ou `null` fora de um redimensionamento. */
  resizing: { from: Rect; size: Size } | null;
  onResizeStart?: (id: string) => void;
  onResizeMove?: (delta: Point) => void;
  onResizeEnd?: () => void;
  onResizeCancel?: () => void;
}

/**
 * A moldura de um traço selecionado: a caixa em volta do desenho inteiro e a alça de
 * redimensionar.
 *
 * Em volta da **área**, e não colada na tinta. Um contorno que acompanhasse a linha diria
 * "esta linha está marcada", que é verdade mas não é útil: o que se vai fazer com um traço
 * selecionado é movê-lo e redimensioná-lo, e as duas coisas acontecem sobre a caixa dele.
 * A caixa é a alça de mão do objeto, e mostrá-la é mostrar o que se está segurando.
 *
 * Em HTML, e não dentro do `<svg>` da tinta. A camada de tinta não tem tamanho útil — é um
 * `1×1` com `overflow-visible` —, e desenhar caixa e alça lá dentro exigiria reimplementar
 * em SVG o contorno e o botão que o post-it já tem prontos. Aqui a moldura reusa as mesmas
 * classes e a mesma `ResizeHandle`, e as duas espécies ficam parecidas por construção em
 * vez de por coincidência.
 *
 * `pointer-events-none` na caixa, e o ponteiro reaberto só na alça: o retângulo de um
 * rabisco grande cobre muito quadro vazio, e uma caixa que capturasse o ponteiro tornaria
 * esse vazio inclicável — inclusive para o clique no fundo que desfaz a seleção. Quem move
 * o traço é a própria tinta, que é onde a mão vai.
 */
export function StrokeFrame({
  stroke,
  offset,
  resizing,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onResizeCancel,
}: StrokeFrameProps) {
  const resize = useDrag({
    onStart: () => onResizeStart?.(stroke.id),
    onMove: (delta) => onResizeMove?.(delta),
    onEnd: (delta) => {
      onResizeMove?.(delta);
      onResizeEnd?.();
    },
    onCancel: () => onResizeCancel?.(),
  });

  const bounds = strokeBounds(stroke);
  // Um traço sem forma não tem caixa para emoldurar. O contrato não produz isso, mas um
  // board vindo de um link editado à mão pode.
  if (bounds === null) return null;

  const style: CSSProperties = {
    left: bounds.x,
    top: bounds.y,
    width: resizing?.size.w ?? bounds.w,
    height: resizing?.size.h ?? bounds.h,
    // Como no post-it: o arraste move por transform, e a posição só muda ao soltar.
    transform: offset === null ? undefined : `translate(${offset.x}px, ${offset.y}px)`,
  };

  return (
    <div
      className="pointer-events-none absolute outline outline-2 outline-offset-2 outline-selection"
      style={style}
      aria-hidden="true"
      data-testid="stroke-frame"
      data-stroke-id={stroke.id}
    >
      {/*
        A alça reabre o ponteiro que a caixa fechou. É a única parte da moldura que se pega:
        o resto dela é contorno, e contorno não é alvo.
      */}
      <div className="pointer-events-auto">
        <ResizeHandle handlers={resize} alwaysVisible />
      </div>
    </div>
  );
}
