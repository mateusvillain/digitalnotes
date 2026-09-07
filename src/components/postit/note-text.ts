/**
 * Medidas do texto do post-it, compartilhadas por quem o desenha e por quem o edita.
 *
 * Uma lista só, e não uma cópia em cada componente: entrar em edição troca o elemento que
 * mostra o texto, e qualquer divergência aqui apareceria como um "pulo" do conteúdo no
 * momento em que o usuário começa a escrever.
 */
export const NOTE_TEXT_CLASS =
  "rounded-note p-3 text-sm break-words whitespace-pre-wrap text-note-ink";
