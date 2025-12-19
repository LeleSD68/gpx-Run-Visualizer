
import { Track } from '../types';

const DB_NAME = 'GpxVizDB';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

/**
 * Inizializza il database IndexedDB.
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Salva tutti i tracciati nel database IndexedDB.
 */
export const saveTracksToDB = async (tracks: Track[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Pulizia preventiva per sincronizzare con lo stato corrente
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      if (tracks.length === 0) {
        resolve();
        return;
      }

      tracks.forEach((track) => {
        store.add(track);
      });
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      reject((event.target as IDBTransaction).error);
    };
  });
};

/**
 * Carica tutti i tracciati dal database IndexedDB.
 */
export const loadTracksFromDB = async (): Promise<Track[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = request.result as Track[];
      // Ripristina gli oggetti Date (IndexedDB li serializza ma potrebbero arrivare come stringhe)
      const revived = tracks.map(t => ({
        ...t,
        points: t.points.map(p => ({
          ...p,
          time: p.time instanceof Date ? p.time : new Date(p.time)
        }))
      }));
      resolve(revived);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};
