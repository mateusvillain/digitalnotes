/**
 * Perguntas sobre o alvo de um evento.
 *
 * Atalhos e modificadores globais ouvem o documento inteiro, então precisam decidir se a
 * tecla era para eles ou para quem está com o foco. A decisão é sobre o **alvo**, e não
 * sobre o estado da aplicação: perguntar ao quadro "há alguém em edição?" responderia por um
 * campo e ignoraria todos os outros que vierem a existir.
 *
 * Mora fora de `board/` e de `canvas/` porque os dois precisam. Não é neutro de verdade:
 * `INTERACTIVE_SELECTOR` cita `[role="note"]`, que só o post-it emite. É acoplamento
 * assumido — a alternativa seria o post-it carregar um marcador próprio só para ser
 * reconhecido aqui, o que troca uma dependência por uma convenção invisível.
 */

/** Seletor dos elementos que consomem a barra de espaço como ativação. */
const INTERACTIVE_SELECTOR = 'button, a[href], [role="button"], [role="radio"], [role="note"]';

/** O alvo aceita digitação. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  // `isContentEditable` cobre o elemento herdando a propriedade de um ancestral, que é como
  // um editor rico normalmente marca a área de escrita.
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * O alvo já usa a barra de espaço para alguma coisa.
 *
 * Botões, rádios e o próprio post-it ativam com espaço. Segurar espaço sobre eles não pode
 * virar o modificador de navegação do quadro, ou selecionar um post-it pelo teclado passaria
 * a arrastar o fundo.
 */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return isEditableTarget(target) || target.closest(INTERACTIVE_SELECTOR) !== null;
}
