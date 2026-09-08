import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetInputModality } from "@/lib/dom/inputModality";

/**
 * Nem todo teste roda no jsdom: os que exercitam SQL contra um banco em memória pedem
 * `@vitest-environment node`, e lá não existe `document` nem `Element`. Os ajustes abaixo
 * são do ambiente de DOM, então só se aplicam quando há um.
 */
const hasDom = typeof document !== "undefined";

// Sem `globals: true`, o auto-cleanup da Testing Library não se registra sozinho.
if (hasDom) afterEach(cleanup);

// A modalidade de entrada é estado de módulo e sobrevive entre casos: sem zerar, um teste
// que aperta uma tecla deixa o próximo achando que a interação foi por teclado.
afterEach(resetInputModality);

/**
 * A API de captura de ponteiro, que o jsdom não implementa.
 *
 * Sem ela, todo gesto lança ao apertar o botão — inclusive dentro de testes que não têm
 * nada a ver com arrastar, como um duplo clique. É lacuna do ambiente, e não assunto de
 * cada teste; quem precisa observar as chamadas instala um espião por elemento com o
 * `stubPointerCapture` de `src/test-utils/pointer.ts`.
 */
if (hasDom) {
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
}
