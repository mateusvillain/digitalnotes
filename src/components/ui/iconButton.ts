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

/**
 * Aparência dos botões e links de texto que aparecem em painéis sobre o quadro.
 *
 * Mesma razão da classe acima: a string já estava começando a ser copiada entre a tela de
 * link inválido (#47) e o estado de falha ao abrir um board (#21).
 */
export const panelButtonClass =
  "rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-canvas";

/**
 * Botões de texto secundários dentro dos painéis flutuantes.
 *
 * São as ações que acompanham a principal — cancelar, copiar, tentar de novo: mesmo peso
 * tipográfico, sem moldura, para não competerem com o botão que resolve.
 */
export const subtleButtonClass =
  "rounded-control px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink";
