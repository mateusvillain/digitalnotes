"use client";

import { useEffect } from "react";
import { loadBoard, saveBoard } from "./localStore";
import type { BoardStore } from "./store";

/**
 * Espera entre a última alteração e a gravação. Digitar um post-it dispara uma mudança por
 * tecla; sem a espera, seria uma transação de `IndexedDB` por caractere.
 */
export const SAVE_DEBOUNCE_MS = 500;

/**
 * Liga a store ao autosave local: restaura o board salvo ao montar e grava as alterações
 * seguintes com debounce (issue #22).
 *
 * A ordem importa. Enquanto a restauração não termina, nada é gravado — o board vazio do
 * primeiro render chegaria ao banco antes da leitura e apagaria justamente o trabalho que
 * a restauração ia devolver.
 */
export function useLocalPersistence(store: BoardStore): void {
  useEffect(() => {
    let cancelled = false;
    let restored = false;
    /** Há alteração da store ainda não gravada. */
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function save() {
      dirty = false;
      void saveBoard(store.getBoard());
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

    // Assinar antes de restaurar, e não depois: uma alteração feita durante a leitura
    // (o usuário é mais rápido que o banco) ficaria sem ouvinte e sem gravação.
    const unsubscribe = store.subscribe(scheduleSave);

    void loadBoard().then((board) => {
      // O componente pode ter desmontado enquanto o banco respondia. Escrever na store
      // depois disso mexeria num board que ninguém mais mostra.
      if (cancelled) return;

      // O usuário é mais rápido que o banco: se já houver trabalho na store quando a
      // leitura volta, ele vale mais que o board salvo — restaurar por cima apagaria o
      // post-it que acabou de ser criado.
      const untouched = store.getBoard().notes.length === 0;
      if (board && untouched) store.replaceBoard(board);

      restored = true;
      // O que o usuário fez durante a leitura ficou pendente; agora tem para onde ir.
      if (dirty) scheduleSave();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();

      // Desmontar com alteração pendente perderia justamente o trabalho que o autosave
      // existe para proteger. Um board vazio que nunca chegou a ser restaurado é a única
      // exceção: gravá-lo apagaria a sessão anterior que a leitura ia devolver.
      if (dirty && (restored || store.getBoard().notes.length > 0)) save();
    };
  }, [store]);
}
