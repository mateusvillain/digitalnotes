"use client";

import { useEffect } from "react";
import { loadBoard, saveBoard } from "./localStore";
import { parseBoard } from "./schema";
import type { BoardStore } from "./store";
import type { Board } from "./types";

/**
 * Espera entre a última alteração e a gravação. Digitar um post-it dispara uma mudança por
 * tecla; sem a espera, seria uma transação de `IndexedDB` por caractere.
 */
export const SAVE_DEBOUNCE_MS = 500;

/**
 * Junta o board restaurado ao trabalho que o usuário fez enquanto a leitura corria.
 *
 * Descartar um dos dois perderia trabalho de verdade: ignorar o salvo apagaria a sessão
 * anterior, e ignorar o novo apagaria o post-it que acabou de ser criado. Passar o
 * resultado por `parseBoard` resolve a colisão de ids que a junção pode criar.
 */
function mergeBoards(restored: Board, current: Board): Board {
  const merged = {
    ...restored,
    notes: [...restored.notes, ...current.notes],
    strokes: [...restored.strokes, ...current.strokes],
  };
  const result = parseBoard(merged);
  return result.ok ? result.board : restored;
}

/**
 * Liga a store ao autosave local: restaura o board salvo ao montar e grava as alterações
 * seguintes com debounce (issue #22).
 *
 * A ordem importa. Enquanto a restauração não termina, nada é gravado — o board vazio do
 * primeiro render chegaria ao banco antes da leitura e apagaria justamente o trabalho que
 * a restauração ia devolver.
 *
 * `enabled` é o portão da rota `/board/:id` (#21): um board aberto por link não pode nem
 * ser sobrescrito pelo autosave local nem sobrescrevê-lo — o `IndexedDB` guarda a cópia de
 * trabalho da rota raiz, e não o que veio de um link que alguém mandou.
 */
export function useLocalPersistence(store: BoardStore, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let restored = false;
    /** Há alteração da store ainda não gravada. É a única resposta para "o usuário mexeu". */
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    /**
     * Encadeia as gravações desta montagem.
     *
     * O debounce e o flush de saída podem disparar quase juntos, e cada gravação abre a
     * sua própria conexão: sem a corrente, a antiga poderia commitar depois da nova e
     * sobrescrevê-la. A cadeia mora aqui, e não no módulo, para morrer junto com a sessão.
     */
    let writes: Promise<unknown> = Promise.resolve();

    function enqueueSave(board: Board): Promise<boolean> {
      const result = writes.then(() => saveBoard(board));
      // Uma gravação recusada não pode quebrar a corrente das seguintes.
      writes = result.catch(() => false);
      return result;
    }

    function save() {
      const board = store.getBoard();
      void enqueueSave(board).then((saved) => {
        // Só desmarcar quando o dado chegou ao disco: uma gravação recusada (cota cheia,
        // transação abortada) precisa ser tentada de novo na alteração seguinte.
        if (saved && store.getBoard() === board) dirty = false;
      });
    }

    function scheduleSave() {
      dirty = true;

      // Antes de a restauração terminar, o que está na store ainda não representa a sessão
      // do usuário: gravá-lo sobrescreveria o board salvo com um quadro vazio. A alteração
      // segue marcada como pendente e será gravada assim que a leitura voltar.
      if (!restored) return;

      clearTimeout(timer);
      timer = setTimeout(save, SAVE_DEBOUNCE_MS);
    }

    /**
     * Grava agora, sem esperar o debounce.
     *
     * Fechar a aba, recarregar ou navegar para fora **não desmonta** o componente, então
     * sem isto as alterações dos últimos {@link SAVE_DEBOUNCE_MS} sumiriam — exatamente o
     * caso que o autosave existe para cobrir. `pagehide` é o evento que os navegadores
     * garantem nessa saída, inclusive no iOS, onde `beforeunload` não é confiável.
     */
    function flush() {
      if (!dirty) return;
      clearTimeout(timer);

      if (restored) {
        save();
        return;
      }

      // Sair antes de a leitura voltar: gravar direto apagaria a sessão anterior, que
      // ninguém chegou a ver. Ler primeiro e juntar preserva os dois lados.
      dirty = false;
      const current = store.getBoard();
      void loadBoard().then((previous) => {
        void enqueueSave(previous ? mergeBoards(previous, current) : current);
      });
    }

    // Assinar antes de restaurar, e não depois: uma alteração feita durante a leitura
    // (o usuário é mais rápido que o banco) ficaria sem ouvinte e sem gravação.
    const unsubscribe = store.subscribe(scheduleSave);
    window.addEventListener("pagehide", flush);

    void loadBoard().then((board) => {
      // O componente pode ter desmontado enquanto o banco respondia. Escrever na store
      // depois disso mexeria num board que ninguém mais mostra.
      if (cancelled) return;

      if (board) {
        const current = store.getBoard();
        // `dirty` com post-its na tela significa que o usuário foi mais rápido que o banco:
        // o que ele criou nesse intervalo entra junto, em vez de um dos lados ser
        // descartado.
        //
        // `dirty` com o quadro vazio é o oposto — apagar tudo ou começar um quadro novo
        // (#58). Mesclar aqui ressuscitaria justamente o board que acabou de ser
        // descartado.
        // `restoreBoard`, e não `replaceBoard`: isto não é uma alteração, é o quadro
        // chegando. Gravado como passo de desfazer, um `Ctrl+Z` logo depois de abrir a aba
        // devolveria o board vazio do primeiro render e apagaria a sessão restaurada (#86).
        if (!dirty) store.restoreBoard(board);
        else if (current.notes.length > 0) store.restoreBoard(mergeBoards(board, current));
      }

      restored = true;
      // O que ficou pendente durante a leitura agora tem para onde ir.
      if (dirty) scheduleSave();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", flush);
      unsubscribe();

      // Desmontar com alteração pendente perderia justamente o trabalho que o autosave
      // existe para proteger.
      flush();
      clearTimeout(timer);
    };
  }, [store, enabled]);
}
