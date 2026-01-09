
import { Track, ChatMessage, UserProfile, PlannedWorkout } from '../types';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
const DB_VERSION = 3;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHATS_STORE)) {
        db.createObjectStore(CHATS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLANNED_STORE)) {
        db.createObjectStore(PLANNED_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

// --- TRACKS ---
export const saveTracksToDB = async (tracks: Track[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TRACKS_STORE], 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);
    store.clear().onsuccess = () => {
      tracks.forEach(t => store.add(t));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadTracksFromDB = async (): Promise<Track[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TRACKS_STORE], 'readonly');
    const store = transaction.objectStore(TRACKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const tracks = request.result as Track[];
      const revived = tracks.map(t => ({
        ...t,
        points: t.points.map(p => ({
          ...p,
          time: p.time instanceof Date ? p.time : new Date(p.time)
        }))
      }));
      resolve(revived);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- PLANNED WORKOUTS ---
export const savePlannedWorkoutsToDB = async (workouts: PlannedWorkout[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLANNED_STORE], 'readwrite');
    const store = transaction.objectStore(PLANNED_STORE);
    store.clear().onsuccess = () => {
      workouts.forEach(w => store.add(w));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadPlannedWorkoutsFromDB = async (): Promise<PlannedWorkout[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLANNED_STORE], 'readonly');
    const store = transaction.objectStore(PLANNED_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const workouts = request.result as PlannedWorkout[];
      const revived = workouts.map(w => ({
        ...w,
        date: w.date instanceof Date ? w.date : new Date(w.date)
      }));
      resolve(revived);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- CHATS ---
export const saveChatToDB = async (id: string, messages: ChatMessage[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(CHATS_STORE);
    store.put({ id, messages, updatedAt: new Date().getTime() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadChatFromDB = async (id: string): Promise<ChatMessage[] | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readonly');
    const store = transaction.objectStore(CHATS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.messages || null);
    request.onerror = () => reject(request.error);
  });
};

// --- PROFILE ---
export const saveProfileToDB = async (profile: UserProfile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE);
    store.put({ id: 'current', ...profile });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadProfileFromDB = async (): Promise<UserProfile | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readonly');
    const store = transaction.objectStore(PROFILE_STORE);
    const request = store.get('current');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// --- FULL BACKUP ---
export interface BackupData {
    tracks: Track[];
    plannedWorkouts: PlannedWorkout[];
    chats: any[];
    profile: UserProfile | null;
    exportedAt: string;
}

export const exportAllData = async (): Promise<BackupData> => {
    const db = await initDB();
    const transaction = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readonly');
    
    const tracksReq = transaction.objectStore(TRACKS_STORE).getAll();
    const plannedReq = transaction.objectStore(PLANNED_STORE).getAll();
    const chatsReq = transaction.objectStore(CHATS_STORE).getAll();
    const profileReq = transaction.objectStore(PROFILE_STORE).get('current');

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve({
                tracks: tracksReq.result,
                plannedWorkouts: plannedReq.result || [],
                chats: chatsReq.result,
                profile: profileReq.result || null,
                exportedAt: new Date().toISOString()
            });
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

export const importAllData = async (data: BackupData): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readwrite');
    
    const tracksStore = transaction.objectStore(TRACKS_STORE);
    const chatsStore = transaction.objectStore(CHATS_STORE);
    const profileStore = transaction.objectStore(PROFILE_STORE);
    const plannedStore = transaction.objectStore(PLANNED_STORE);

    tracksStore.clear();
    chatsStore.clear();
    profileStore.clear();
    plannedStore.clear();

    if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks.forEach(t => tracksStore.add(t));
    }
    if (data.plannedWorkouts && Array.isArray(data.plannedWorkouts)) {
        data.plannedWorkouts.forEach(w => plannedStore.add(w));
    }
    if (data.chats && Array.isArray(data.chats)) {
        data.chats.forEach(c => chatsStore.add(c));
    }
    if (data.profile) {
        profileStore.put({ id: 'current', ...data.profile });
    }

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
