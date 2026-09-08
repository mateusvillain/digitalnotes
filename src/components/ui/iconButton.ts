/**
 * Aparência dos botões de ícone flutuantes sobre o quadro.
 *
 * Zoom (#9) e compartilhar (#46) são a mesma classe de controle: quadrados de 32px, sem
 * rótulo escrito, discretos até o ponteiro chegar. Mora num lugar só porque a alternativa
 * já aconteceu — a string estava copiada em dois arquivos, e ajustar o tema de um deixaria
 * o outro para trás sem ninguém perceber.
 */
export const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40";
