import { AgendaItem, LecturaData } from '../types';

const DB_NAME = 'GestindeAgendasLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'dataset_cache';
const VERSION_KEY = 'agendas_local_version';

export interface LocalCachedData {
  version: string;
  updatedAt: string;
  fileName: string;
  lectura: LecturaData;
  agendas: AgendaItem[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB no soportado en este navegador'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Gets the cached dataset from local PC storage (IndexedDB)
 */
export async function getLocalCachedDataset(): Promise<LocalCachedData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('current_dataset');

      request.onsuccess = () => {
        const result = request.result as LocalCachedData | undefined;
        if (result && result.agendas && result.agendas.length > 0 && result.lectura) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    return null;
  }
}

/**
 * Saves dataset to local PC storage (IndexedDB) and registers the version in localStorage
 */
export async function saveDatasetToLocalCache(data: LocalCachedData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, 'current_dataset');

      request.onsuccess = () => {
        try {
          localStorage.setItem(VERSION_KEY, data.version);
        } catch {
          // ignore quota
        }
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error saving to IndexedDB:', err);
  }
}

/**
 * Retrieves the local cache version string synchronously or from memory
 */
export function getLocalCachedVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears the local cache on the PC
 */
export async function clearLocalCache(): Promise<void> {
  try {
    localStorage.removeItem(VERSION_KEY);
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }
}
