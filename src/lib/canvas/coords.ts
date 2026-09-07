/**
 * Viewport do quadro e conversão de coordenadas.
 *
 * Todo comportamento espacial de post-it — criar no ponto do duplo clique, arrastar,
 * redimensionar, retângulo de seleção — depende de traduzir a posição do ponteiro na tela
 * para a posição no canvas. Essa tradução mora aqui, uma vez só, em funções puras: o React
 * fica de fora para que a matemática possa ser testada direto e reusada por qualquer
 * interação.
 *
 * O estado de viewport é efêmero: não vai para a URL nem para o autosave.
 */

export interface Point {
  x: number;
  y: number;
}

/** Retângulo alinhado aos eixos, em coordenadas de canvas. */
export interface Rect extends Size {
  x: number;
  y: number;
}

/** Dimensões de uma caixa, em unidades de canvas. */
export interface Size {
  w: number;
  h: number;
}

export interface Viewport {
  /** Deslocamento, em pixels de tela, do ponto (0,0) do canvas. */
  x: number;
  y: number;
  /** Fator de escala: 1 é 100%. */
  scale: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

/** Viewport inicial: origem do canvas no canto do container, sem zoom. */
export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/**
 * Limita a escala ao intervalo navegável.
 *
 * `NaN` cai em 100%, porque não há para que lado clampar; infinito vai para o extremo
 * correspondente, que é o que um fator de zoom disparado deveria dar.
 */
export function clampScale(scale: number): number {
  if (Number.isNaN(scale)) return 1;
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/**
 * Converte um ponto da tela (relativo ao canto do container do quadro) para o canvas.
 *
 * Inversa exata de {@link canvasToScreen}.
 */
export function screenToCanvas(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

/** Converte um ponto do canvas para a tela, relativo ao canto do container do quadro. */
export function canvasToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

/**
 * Canto superior esquerdo de uma caixa de `size` centrada em `center`.
 *
 * Existe porque o board guarda o canto, mas todo gesto aponta para o meio: criar no ponto
 * do duplo clique é colocar o *centro* ali, não o canto.
 */
export function topLeftCenteredAt(center: Point, size: Size): Point {
  return { x: center.x - size.w / 2, y: center.y - size.h / 2 };
}

/**
 * Retângulo entre dois cantos, em qualquer ordem.
 *
 * Arrastar da direita para a esquerda é tão comum quanto o contrário, e um retângulo de
 * largura negativa não desenha nem intersecta nada.
 */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/** Desloca o viewport em pixels de tela. */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

/**
 * Aplica uma escala mantendo fixo o ponto sob o cursor.
 *
 * É o que dá a sensação de "aproximar naquele ponto" em vez de aproximar no canto: o ponto
 * do canvas sob o cursor antes do zoom continua sob o cursor depois dele.
 */
export function zoomAt(viewport: Viewport, scale: number, anchor: Point): Viewport {
  const next = clampScale(scale);
  const canvasAnchor = screenToCanvas(anchor, viewport);

  return {
    scale: next,
    x: anchor.x - canvasAnchor.x * next,
    y: anchor.y - canvasAnchor.y * next,
  };
}

/** Multiplica a escala atual, ancorando no ponto dado. Útil para roda e botões. */
export function zoomByFactor(viewport: Viewport, factor: number, anchor: Point): Viewport {
  return zoomAt(viewport, viewport.scale * factor, anchor);
}

/** Escala como porcentagem inteira, para exibir na interface. */
export function scaleAsPercent(scale: number): number {
  return Math.round(scale * 100);
}
