"use client";

import { strokeColor } from "@/lib/theme/note-colors";
import { STROKE_COLOR_BLACK, type Stroke } from "@/lib/board/types";
import type { Point } from "@/lib/canvas/coords";

/**
 * Espessura do traço, em unidades de canvas.
 *
 * Escala com o zoom, como todo conteúdo do canvas: uma linha que mantivesse a espessura na
 * tela engrossaria em relação ao desenho ao afastar, e o rabisco deixaria de ser parte do
 * quadro para virar sobreposição. Espessura variável é escolha de outra issue; aqui ela é
 * uma só, e fica declarada num lugar que a paleta e o preview compartilham.
 */
export const STROKE_WIDTH = 2;

interface StrokesProps {
  strokes: readonly Stroke[];
}

/**
 * Converte a lista achatada do contrato (`[x0,y0,x1,y1,…]`) no atributo `points` do SVG.
 *
 * Exportada porque o traço em curso, ainda fora do board, precisa desenhar do mesmo jeito
 * que o já gravado — e é aqui que mora o formato.
 */
export function polylinePoints(points: readonly number[]): string {
  const pares: string[] = [];

  for (let index = 0; index + 1 < points.length; index += 2) {
    pares.push(`${points[index]},${points[index + 1]}`);
  }

  return pares.join(" ");
}

/**
 * A camada de tinta do quadro (#68).
 *
 * Um `<svg>` só para todos os traços, e não um por traço: são dezenas de linhas sobre o
 * mesmo sistema de coordenadas, e o navegador pinta uma árvore só.
 *
 * O `<svg>` não tem tamanho útil (`overflow-visible` com 1×1): o canvas não tem borda, e
 * dimensionar a caixa exigiria recalculá-la a cada traço novo. O conteúdo é desenhado em
 * coordenadas de canvas e a camada transformada do viewport cuida de zoom e pan.
 *
 * Fica **debaixo** dos post-its — eles carregam `z-index` próprio, e a tinta não. É a ordem
 * que mantém o texto de uma nota legível, e vale igual para o traço em curso, que desenha
 * nesta mesma altura: o rabisco não salta de camada ao ser solto.
 *
 * `pointer-events-none` porque tinta não é alvo: selecionar traço é assunto da issue #70, e
 * até lá um clique sobre o rabisco tem de chegar ao quadro embaixo dele.
 */
export function Strokes({ strokes }: StrokesProps) {
  // Ordenado por `z` na hora de desenhar, e não guardado ordenado: a ordem da lista é do
  // board, e é o `z` que diz quem fica por cima.
  const porZ = [...strokes].sort((a, b) => a.z - b.z);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      aria-hidden="true"
      data-testid="strokes"
    >
      {porZ.map((stroke) => (
        <polyline
          key={stroke.id}
          points={polylinePoints(stroke.points)}
          fill="none"
          stroke={strokeColor(stroke.color)}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid="stroke"
        />
      ))}
    </svg>
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
 * Desenha com a mesma espessura, o mesmo formato e a mesma altura de camada do traço
 * gravado — é o que faz o rabisco continuar exatamente onde estava quando o ponteiro é
 * solto, em vez de piscar de lugar ao virar conteúdo.
 *
 * Nasce preto porque é a cor com que o lápis nasce ({@link STROKE_COLOR_BLACK}); a mesma
 * constante que a gravação usa, para o que se vê desenhando não poder divergir do que fica.
 */
export function StrokePreview({ points }: StrokePreviewProps) {
  if (points === null || points.length < 2) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      aria-hidden="true"
      data-testid="stroke-preview"
    >
      <polyline
        points={polylinePoints(points.flatMap((point) => [point.x, point.y]))}
        fill="none"
        stroke={strokeColor(STROKE_COLOR_BLACK)}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
