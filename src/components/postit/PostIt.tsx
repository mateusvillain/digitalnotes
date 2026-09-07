"use client";

import { memo, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import type { Note } from "@/lib/board/types";
import type { Point } from "@/lib/canvas/coords";
import { useDrag } from "@/lib/canvas/useDrag";
import { noteBackgroundColor } from "@/lib/theme/note-colors";
import { NOTE_TEXT_CLASS } from "./note-text";
import { PostItEditor } from "./PostItEditor";

interface PostItProps {
  note: Note;
  /** Marcado pela seleção (#18). É estado de interface: não mora na note. */
  selected?: boolean;
  /** Em edição de texto. Como a seleção, é estado de interface e mora em quem desenha a lista. */
  editing?: boolean;
  /** Duplo clique sobre o post-it: o pedido de entrar em edição. */
  onEditStart?: (id: string) => void;
  /** Pedido de seleção. `additive` vem do shift, que acrescenta em vez de trocar. */
  onSelect?: (id: string, additive: boolean) => void;
  /** Deslocamento otimista durante o arraste, em coordenadas de canvas. */
  offset?: Point | null;
  /** O ponteiro passou da folga: começou um arraste a partir deste post-it. */
  onDragStart?: (id: string) => void;
  /** Deslocamento em pixels de tela desde a origem do gesto. Quem converte conhece o zoom. */
  onDragMove?: (delta: Point) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  /** Fim da edição, com o texto final. Sair confirma, e quem recebe é que escreve na store. */
  onEditCommit?: (id: string, text: string) => void;
}

/** Contorno por fora da caixa, para selecionar não empurrar o texto. */
const SELECTED_CLASS = "outline outline-2 outline-offset-2 outline-selection";

/**
 * O post-it desenhado.
 *
 * Recebe uma `Note` do contrato e desenha. Arrastar, redimensionar e selecionar são das
 * issues de interação — o único comportamento que mora aqui é a edição de texto (#14),
 * porque ela acontece *dentro* da caixa e precisa das mesmas medidas do texto em leitura.
 *
 * Estado de interface não entra na note: quem está em edição é decidido por quem desenha a
 * lista, um post-it de cada vez, e chega aqui como prop. O texto sobe pelo `onEditCommit` em
 * vez de ser escrito direto na store — a store é a mesma que a persistência escuta, e a
 * decisão de quando publicar é de quem coordena, não de um post-it isolado.
 *
 * Vive dentro da camada transformada do viewport, então posição e tamanho são coordenadas
 * de canvas e o zoom se aplica sozinho, texto incluído.
 *
 * **Texto que não cabe é cortado**, e essa escolha é deliberada. Rolagem dentro do post-it
 * competiria com a roda do mouse, que é o zoom do quadro; reticências por line-clamp
 * exigiriam um número fixo de linhas que um post-it redimensionável (#16) não tem. O texto
 * inteiro continua no board e reaparece inteiro ao editar — nada se perde, só deixa de caber.
 */
function PostItComponent({
  note,
  selected = false,
  editing = false,
  onEditStart,
  onEditCommit,
  onSelect,
  offset = null,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: PostItProps) {
  /**
   * Colapso de seleção adiado para o soltar.
   *
   * Apertar um post-it que já está selecionado **não** pode desmarcar os outros na hora: o
   * gesto mais provável dali é arrastar o grupo inteiro, e desmarcar antes do movimento
   * tornaria o arraste em grupo impossível. Se o ponteiro subir sem ter arrastado, aí sim
   * era um clique, e o clique desmarca os demais.
   */
  const pendingCollapse = useRef(false);
  const dragged = useRef(false);

  const drag = useDrag({
    // Quem está escrevendo não arrasta: dentro do editor o ponteiro seleciona texto.
    disabled: editing,
    onStart: () => {
      dragged.current = true;
      onDragStart?.(note.id);
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

  const style: CSSProperties = {
    left: note.x,
    top: note.y,
    width: note.w,
    height: note.h,
    zIndex: note.z,
    backgroundColor: noteBackgroundColor(note.color),
    // O arraste move por transform, não por left/top: o browser compõe a translação sem
    // recalcular layout, e com dezenas de post-its no quadro é isso que mantém o gesto
    // fluido. A posição da note só muda ao soltar.
    transform: offset === null ? undefined : `translate(${offset.x}px, ${offset.y}px)`,
  };

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;

    // Quem está escrevendo não é interrompido: o clique dentro do texto posiciona o cursor,
    // e reselecionar tiraria o foco do editor.
    if (editing) return;

    dragged.current = false;
    pendingCollapse.current = false;

    // Selecionar no apertar, e antes de armar o arraste: o post-it precisa já estar marcado
    // quando o movimento começa, senão arrasta-se algo que ainda não foi selecionado. A
    // exceção é o que já está selecionado — esse espera o soltar.
    if (event.shiftKey || !selected) onSelect?.(note.id, event.shiftKey);
    else pendingCollapse.current = true;

    // Shift sobre um post-it selecionado o **tira** da seleção: seguir arrastando moveria
    // justamente o que se acabou de desmarcar.
    if (event.shiftKey && selected) return;

    drag.onPointerDown(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    drag.onPointerUp(event);
    finishGesture();
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>): void {
    drag.onPointerCancel(event);
    // Um gesto cancelado não decidiu nada: o colapso pendente é descartado, não aplicado.
    pendingCollapse.current = false;
  }

  /** Fecha o gesto de ponteiro: sem arraste, o que houve foi um clique. */
  function finishGesture(): void {
    if (pendingCollapse.current && !dragged.current) onSelect?.(note.id, false);
    pendingCollapse.current = false;
  }

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>): void {
    // O evento para aqui: no fundo do canvas, duplo clique cria um post-it (#13), e editar
    // um existente não pode criar outro atrás dele.
    event.stopPropagation();
    if (!editing) onEditStart?.(note.id);
  }

  return (
    <div
      // `note` em vez de `article`: um `article` com nome acessível vira região navegável,
      // e um quadro com dezenas de post-its viraria um quadro com dezenas de regiões.
      role="note"
      className={`absolute overflow-hidden select-none shadow-note ${NOTE_TEXT_CLASS} ${selected ? SELECTED_CLASS : ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      data-testid="post-it"
      data-note-id={note.id}
      data-selected={selected}
      data-editing={editing}
      data-dragging={offset !== null}
      // Rótulo só para o post-it sem conteúdo visível: com texto, o próprio conteúdo já
      // nomeia o elemento, e repetir viraria um nome acessível de até 2000 caracteres.
      aria-label={note.text.trim() === "" ? "Post-it vazio" : undefined}
    >
      {editing ? (
        <PostItEditor
          // Trocar de post-it em edição precisa remontar o editor: ele é não controlado, e
          // sem chave nova o React reaproveitaria o textarea com o texto do anterior.
          key={note.id}
          initialText={note.text}
          onCommit={(text) => onEditCommit?.(note.id, text)}
        />
      ) : (
        note.text
      )}
    </div>
  );
}

/**
 * Memoizado de propósito.
 *
 * Arrastar publica um deslocamento novo a cada movimento do ponteiro, e sem memo isso
 * re-renderizaria todo post-it do quadro a cada evento — inclusive os parados. Com ele,
 * re-renderiza só quem tem prop diferente: os selecionados, que são os que se movem.
 *
 * Isso só funciona porque os callbacks que chegam aqui são estáveis; ver `useBoard`.
 */
export const PostIt = memo(PostItComponent);
