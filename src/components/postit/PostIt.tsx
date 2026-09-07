import type { CSSProperties } from "react";
import type { Note } from "@/lib/board/types";
import { noteBackgroundColor } from "@/lib/theme/note-colors";

interface PostItProps {
  note: Note;
  /** Marcado pela seleção (#18). É estado de interface: não mora na note. */
  selected?: boolean;
}

/** Contorno por fora da caixa, para selecionar não empurrar o texto. */
const SELECTED_CLASS = "outline outline-2 outline-offset-2 outline-selection";

/**
 * O post-it desenhado.
 *
 * Componente de apresentação puro: recebe uma `Note` do contrato e desenha. Arrastar,
 * redimensionar, editar e selecionar são das issues de interação — manter isto sem
 * comportamento é o que permite que elas sejam construídas em paralelo sobre uma base
 * estável.
 *
 * Vive dentro da camada transformada do viewport, então posição e tamanho são coordenadas
 * de canvas e o zoom se aplica sozinho, texto incluído.
 *
 * **Texto que não cabe é cortado**, e essa escolha é deliberada. Rolagem dentro do post-it
 * competiria com a roda do mouse, que é o zoom do quadro; reticências por line-clamp
 * exigiriam um número fixo de linhas que um post-it redimensionável (#16) não tem. O texto
 * inteiro continua no board e aparece ao editar (#14) — nada se perde, só deixa de caber.
 */
export function PostIt({ note, selected = false }: PostItProps) {
  const style: CSSProperties = {
    left: note.x,
    top: note.y,
    width: note.w,
    height: note.h,
    zIndex: note.z,
    backgroundColor: noteBackgroundColor(note.color),
  };

  return (
    <div
      // `note` em vez de `article`: um `article` com nome acessível vira região navegável,
      // e um quadro com dezenas de post-its viraria um quadro com dezenas de regiões.
      role="note"
      className={`absolute overflow-hidden rounded-note p-3 text-sm break-words whitespace-pre-wrap text-note-ink shadow-note ${selected ? SELECTED_CLASS : ""}`}
      style={style}
      data-testid="post-it"
      data-note-id={note.id}
      data-selected={selected}
      // Rótulo só para o post-it sem conteúdo visível: com texto, o próprio conteúdo já
      // nomeia o elemento, e repetir viraria um nome acessível de até 2000 caracteres.
      aria-label={note.text.trim() === "" ? "Post-it vazio" : undefined}
    >
      {note.text}
    </div>
  );
}
