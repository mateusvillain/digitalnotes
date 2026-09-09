"use client";

import { DEFAULT_NOTE_COLOR, NOTE_SIZE } from "@/lib/board/types";
import { topLeftCenteredAt, type Point, type Size } from "@/lib/canvas/coords";
import { noteBackgroundColor } from "@/lib/theme/note-colors";
import { NOTE_TEXT_CLASS } from "@/components/postit/note-text";

/**
 * O tamanho com que um post-it nasce.
 *
 * Uma medida só para os dois lados do gesto: é ela que a prévia desenha e é ela que a
 * criação usa. Se cada um lesse `NOTE_SIZE` por conta própria a conta seria a mesma hoje,
 * mas nada obrigaria a continuar sendo — e o erro apareceria como uma nota que nasce
 * deslocada em relação ao fantasma que a pessoa estava mirando.
 */
export const NEW_NOTE_SIZE: Size = {
  w: NOTE_SIZE.defaultWidth,
  h: NOTE_SIZE.defaultHeight,
};

interface NotePlacementPreviewProps {
  /**
   * Centro da nota que será criada, em coordenadas de canvas.
   *
   * `null` quando não há ponteiro sobre o quadro — logo depois de `N` com o cursor fora da
   * janela, por exemplo. Sem esse caso a prévia teria de nascer em algum lugar, e qualquer
   * lugar escolhido por falta de resposta é um canto arbitrário.
   */
  at: Point | null;
}

/**
 * A nota translúcida que acompanha o cursor antes de existir (#73).
 *
 * Mora fora da store, como a prévia do traço: uma nota que ainda não foi colocada é gesto,
 * não conteúdo, e publicá-la a cada movimento do ponteiro faria o autosave gravar dezenas
 * de versões de algo que a pessoa ainda pode cancelar com `Esc`.
 *
 * Desenha com o mesmo tamanho, a mesma cor e as mesmas medidas de texto do post-it de
 * verdade, porque a promessa da prévia é exatamente essa: o que se vê é o que vai ficar.
 * O que muda é só a opacidade — é ela que diz "ainda não".
 *
 * Vive dentro da camada transformada do viewport, então o zoom se aplica sozinho: a nota
 * fantasma tem 200 unidades de canvas, e não 200 pixels de tela.
 */
export function NotePlacementPreview({ at }: NotePlacementPreviewProps) {
  if (at === null) return null;

  const { x, y } = topLeftCenteredAt(at, NEW_NOTE_SIZE);

  return (
    <div
      // `aria-hidden` e não `role="note"`: para o leitor de tela esta caixa não existe
      // ainda, e anunciá-la colocaria no quadro uma nota vazia a mais a cada movimento do
      // cursor. O que existe é o modo, e quem o anuncia é o botão que o ligou.
      aria-hidden="true"
      data-testid="note-placement-preview"
      className={`pointer-events-none absolute opacity-50 shadow-note ${NOTE_TEXT_CLASS}`}
      style={{
        left: x,
        top: y,
        width: NEW_NOTE_SIZE.w,
        height: NEW_NOTE_SIZE.h,
        backgroundColor: noteBackgroundColor(DEFAULT_NOTE_COLOR),
      }}
    />
  );
}
