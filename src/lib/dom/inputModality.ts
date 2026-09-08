/**
 * Qual foi a última forma de interagir com a página: teclado ou ponteiro.
 *
 * Existe porque "recebeu foco" não diz de onde o foco veio, e as duas origens pedem
 * respostas opostas: quem chegou pelo `Tab` quer a dica na tela, e quem tocou no botão
 * teria a dica cobrindo justamente o que acabou de tocar.
 *
 * `:focus-visible` responderia isso no navegador, mas o jsdom o considera sempre verdadeiro
 * — um comportamento que só existe em produção não é testável, então o sinal é registrado
 * aqui.
 */

let keyboard = false;
let listening = false;

function onKeyDown() {
  keyboard = true;
}

function onPointerDown() {
  keyboard = false;
}

/**
 * Começa a observar a modalidade de entrada, se ainda não estiver observando.
 *
 * Os ouvintes são globais e ficam registrados enquanto houver quem pergunte; são dois
 * ouvintes passivos para a página inteira, e não um par por componente.
 */
export function trackInputModality(): void {
  if (listening || typeof document === "undefined") return;

  // Fase de captura: o foco muda no meio do `pointerdown`, e um ouvinte na fase de
  // borbulhamento chegaria tarde demais para quem pergunta durante o `focus`.
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  listening = true;
}

/** O último gesto veio do teclado. */
export function lastInputWasKeyboard(): boolean {
  return keyboard;
}
