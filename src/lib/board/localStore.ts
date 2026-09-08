/**
 * Autosave do board de trabalho em `IndexedDB` (issue #22).
 *
 * É a rede de segurança da sessão, não a fonte da verdade: quem manda é a store em
 * memória, e o backend só conhece o que foi explicitamente compartilhado. Abrir a
 * aplicação e desenhar não cria nada remoto.
 *
 * Como o resto do módulo do board, nada aqui lança. `IndexedDB` falha por motivos que não
 * são culpa nem responsabilidade de quem chama — navegador sem suporte, modo privado,
 * cota estourada, usuário que limpou os dados no meio da sessão. Em todos eles o
 * whiteboard tem que continuar funcionando, só que sem autosave.
 */

import { parseBoard } from "./schema";
import type { Board } from "./types";

const DB_NAME = "digitalnotes";
const DB_VERSION = 1;
const STORE_NAME = "board";

/** Só existe um board de trabalho por navegador, então a chave é fixa. */
const CURRENT_BOARD_KEY = "current";

/** Envolve uma `IDBRequest` numa promise que rejeita em erro, em vez de usar eventos. */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Abre (e cria, na primeira vez) o banco local.
 *
 * Devolve `null` quando `IndexedDB` não está disponível — é o sinal de "siga sem
 * autosave", e não um erro a ser tratado por quem chama.
 */
async function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;

  try {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    return await requestToPromise(request);
  } catch {
    return null;
  }
}

/**
 * Grava o board como o estado de trabalho atual.
 *
 * Devolve `true` quando a gravação aconteceu. `false` significa que este navegador não
 * está guardando nada — útil para teste e diagnóstico, mas quem chama não precisa reagir:
 * a sessão continua válida em memória.
 */
export async function saveBoard(board: Board): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;

  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    // O board é um objeto simples do contrato, então o algoritmo de clonagem estruturada
    // dá conta dele sem serializar para string na mão.
    await requestToPromise(transaction.objectStore(STORE_NAME).put(board, CURRENT_BOARD_KEY));
    return true;
  } catch {
    // Cota estourada, banco fechado pelo navegador, transação abortada: nada a fazer além
    // de seguir sem autosave.
    return false;
  } finally {
    db.close();
  }
}

/**
 * Lê o board de trabalho salvo, ou `null` quando não há nada utilizável.
 *
 * Passa pelo mesmo `parseBoard` da hidratação por link: o que está gravado veio de uma
 * versão anterior da aplicação e é tão pouco confiável quanto um board colado de fora.
 * Dado corrompido ou de versão incompatível é descartado em silêncio — o usuário abre um
 * quadro vazio, que é melhor que uma tela de erro sobre um detalhe interno.
 */
export async function loadBoard(): Promise<Board | null> {
  const db = await openDatabase();
  if (!db) return null;

  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const stored = await requestToPromise(
      transaction.objectStore(STORE_NAME).get(CURRENT_BOARD_KEY),
    );
    if (stored === undefined) return null;

    const result = parseBoard(stored);
    return result.ok ? result.board : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}
