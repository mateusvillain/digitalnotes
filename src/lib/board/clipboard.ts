/**
 * O recorte que vai para a área de transferência, e o que volta dela (#88).
 *
 * O formato é o do próprio board. Não foi escolha de conveniência: o quadro já é um valor
 * serializável — é assim que ele viaja dentro da URL —, e `parseBoard` já sabe validar um
 * board vindo de fonte não confiável, descartando o que não presta em vez de derrubar quem
 * chamou. Inventar um segundo formato aqui seria manter dois contratos sobre a mesma coisa,
 * e o de fora — o que atravessa o clipboard e pode voltar dias depois, de outra versão do
 * app — é justamente o que menos pode divergir.
 *
 * Em `text/plain`, e não num tipo próprio: é o que o sistema operacional carrega entre
 * aplicações, e o que sobrevive a colar num editor de texto e copiar de volta.
 *
 * Funções puras, fora do React e fora do DOM: o que é clipboard de verdade — permissão,
 * evento, `navigator` — mora em quem chama.
 */

import { parseBoard } from "./schema";
import { selectedNotes, selectedStrokes, type Selection } from "./selection";
import { SCHEMA_VERSION, type Board, type Note, type Stroke } from "./types";

/**
 * O recorte marcado, pronto para a área de transferência.
 *
 * `null` quando não há nada marcado. É a diferença entre "copiei o vazio" e "não copiei":
 * um `Ctrl+C` sem seleção não pode apagar o que a pessoa tinha na área de transferência,
 * que pode ter vindo de outro programa.
 */
export function serializeSelection(board: Board, selection: Selection): string | null {
  const notes = selectedNotes(board.notes, selection);
  const strokes = selectedStrokes(board.strokes, selection);
  if (notes.length === 0 && strokes.length === 0) return null;

  return JSON.stringify({ version: SCHEMA_VERSION, notes, strokes });
}

/**
 * O que veio da área de transferência, se for um recorte deste quadro.
 *
 * `null` para tudo que não for — texto solto, JSON de outra coisa, um board de uma versão
 * mais nova do schema. Colar o conteúdo errado não pode quebrar nada nem esvaziar o quadro,
 * e a forma de garantir isso é não ter caminho nenhum entre "não deu para ler" e a store.
 *
 * O `JSON.parse` é o único lugar deste módulo que pode lançar, e por isso é o único
 * embrulhado: texto que não é JSON é a entrada mais provável de todas, já que a área de
 * transferência costuma ter uma frase copiada de algum lugar.
 */
export function parseClipboard(text: string): { notes: Note[]; strokes: Stroke[] } | null {
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    return null;
  }

  const result = parseBoard(candidate);
  if (!result.ok) return null;

  // Um recorte sem nada dentro não é um recorte. Sem esta guarda, colar um board vazio
  // publicaria uma alteração que não muda nada e gastaria um passo de desfazer.
  if (result.board.notes.length === 0 && result.board.strokes.length === 0) return null;

  return { notes: result.board.notes, strokes: result.board.strokes };
}
