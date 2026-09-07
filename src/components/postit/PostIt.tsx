import type { CSSProperties } from "react";
import type { Note } from "@/lib/board/types";
import { noteBackgroundVar } from "@/lib/theme/note-colors";

interface PostItProps {
  note: Note;
  /** Marcado pela seleção (#18). É estado de interface: não mora na note. */
  selected?: boolean;
}

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
 */
export function PostIt({ note, selected = false }: PostItProps) {
  const style: CSSProperties = {
    left: note.x,
    top: note.y,
    width: note.w,
    height: note.h,
    zIndex: note.z,
    backgroundColor: `var(${noteBackgroundVar(note.color)})`,
  };

  return (
    <article
      className={[
        "absolute overflow-hidden rounded-note p-3 shadow-note",
        "text-sm whitespace-pre-wrap break-words text-note-ink",
        // O contorno fica por fora da caixa para não empurrar o texto ao selecionar.
        selected ? "outline outline-2 outline-offset-2 outline-selection" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-testid="post-it"
      data-note-id={note.id}
      data-selected={selected}
      aria-label={note.text === "" ? "Post-it vazio" : note.text}
    >
      {note.text}
    </article>
  );
}
