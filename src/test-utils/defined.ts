/**
 * Estreita o `T | undefined` que o acesso por índice devolve.
 *
 * O projeto compila com `noUncheckedIndexedAccess`, então `notes[0]` pode ser `undefined`
 * para o compilador. Encadear `?.` por todo teste esconderia a falha: uma asserção sobre
 * `undefined?.x` compara `undefined` com `undefined` e passa. Aqui o teste quebra na linha
 * certa, dizendo o que não estava lá.
 */
export function defined<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Esperava ${what}, e não havia nada.`);
  return value;
}
