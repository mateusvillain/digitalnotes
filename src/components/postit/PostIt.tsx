"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { Note } from "@/lib/board/types";
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
export function PostIt({
  note,
  selected = false,
  editing = false,
  onEditStart,
  onEditCommit,
}: PostItProps) {
  const style: CSSProperties = {
    left: note.x,
    top: note.y,
    width: note.w,
    height: note.h,
    zIndex: note.z,
    backgroundColor: noteBackgroundColor(note.color),
  };

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
      className={`absolute overflow-hidden shadow-note ${NOTE_TEXT_CLASS} ${selected ? SELECTED_CLASS : ""}`}
      style={style}
      onDoubleClick={handleDoubleClick}
      data-testid="post-it"
      data-note-id={note.id}
      data-selected={selected}
      data-editing={editing}
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
