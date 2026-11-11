// Offline Queue for Zero-Cost Offline Resilience using IndexedDB

export interface QueuedAction {
  id?: number;
  type: 'TASK_STATUS_UPDATE' | 'TASK_ACKNOWLEDGE' | 'TASK_REWORK' | 'ATTENDEE_CHECKIN';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: any;
  label?: string;
  createdAt: number;
}

export interface SyncErrorItem {
  id?: number;
  action: QueuedAction;
  errorMessage: string;
  statusCode?: number;
  conflictServerState?: any;
  occurredAt: number;
}

const DB_NAME = 'event_ops_offline_db';
const DB_VERSION = 2;
const STORE_NAME = 'pending_actions';
const ERRORS_STORE_NAME = 'sync_errors';

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
      if (!db.objectStoreNames.contains(ERRORS_STORE_NAME)) {
        db.createObjectStore(ERRORS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

export async function recordSyncError(errorItem: Omit<SyncErrorItem, 'id'>): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ERRORS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ERRORS_STORE_NAME);
    const request = store.add(errorItem);
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline-sync-error', { detail: errorItem }));
      resolve(request.result as number);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncErrors(): Promise<SyncErrorItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ERRORS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ERRORS_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function clearSyncError(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ERRORS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ERRORS_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline-sync-error'));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllSyncErrors(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ERRORS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ERRORS_STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline-sync-error'));
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
      const statusCode = err?.response?.status;
      const errorMessage = err?.response?.data?.message || err?.message || 'Network sync error';
      const conflictServerState = err?.response?.data?.serverState;

      // Move 4xx client/conflict rejections out of the pending queue and surface them explicitly
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        await recordSyncError({
          action,
          errorMessage,
          statusCode,
          conflictServerState,
          occurredAt: Date.now(),
        });
        if (action.id) await removePendingAction(action.id);
      }
      failed++;
    }
  }

  return { synced, failed };
}
