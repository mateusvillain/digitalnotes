import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true`, o auto-cleanup da Testing Library não se registra sozinho.
afterEach(cleanup);

/**
 * A API de captura de ponteiro, que o jsdom não implementa.
 *
 * Sem ela, todo gesto lança ao apertar o botão — inclusive dentro de testes que não têm
 * nada a ver com arrastar, como um duplo clique. É lacuna do ambiente, e não assunto de
 * cada teste; quem precisa observar as chamadas instala um espião por elemento com o
 * `stubPointerCapture` de `src/test-utils/pointer.ts`.
 */
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
