// Offline Queue for Zero-Cost Offline Resilience using IndexedDB

export interface QueuedAction {
  id?: number;
  type: 'TASK_STATUS_UPDATE' | 'TASK_ACKNOWLEDGE' | 'TASK_REWORK';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: any;
  createdAt: number;
}

const DB_NAME = 'event_ops_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_actions';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineAction(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: QueuedAction = {
      ...action,
      createdAt: Date.now(),
    };
    const request = store.add(item);
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      resolve(request.result as number);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function getPendingActionsCount(): Promise<number> {
  try {
    const actions = await getPendingActions();
    return actions.length;
  } catch {
    return 0;
  }
}

export async function removePendingAction(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function syncPendingActions(apiInstance: any): Promise<{ synced: number; failed: number }> {
  const actions = await getPendingActions();
  if (actions.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      if (action.method === 'PATCH') {
        await apiInstance.patch(action.endpoint, action.payload);
      } else if (action.method === 'POST') {
        await apiInstance.post(action.endpoint, action.payload);
      } else if (action.method === 'PUT') {
        await apiInstance.put(action.endpoint, action.payload);
      }
      if (action.id) {
        await removePendingAction(action.id);
      }
      synced++;
    } catch (err: any) {
      console.error('Failed to sync offline action:', action, err);
      // If error is 4xx client error (e.g. invalid), discard to avoid loop
      if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
        if (action.id) await removePendingAction(action.id);
      }
      failed++;
    }
  }

  return { synced, failed };
}
