'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getPendingActionsCount,
  syncPendingActions,
  getSyncErrors,
  clearSyncError,
  clearAllSyncErrors,
  SyncErrorItem,
} from '../../lib/offlineQueue';
import { api } from '../../lib/api';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedRecently, setSyncedRecently] = useState<boolean>(false);
  const [syncErrors, setSyncErrors] = useState<SyncErrorItem[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);

  const updateCountAndErrors = async () => {
    const [count, errors] = await Promise.all([
      getPendingActionsCount(),
      getSyncErrors(),
    ]);
    setPendingCount(count);
    setSyncErrors(errors);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    updateCountAndErrors();

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        const result = await syncPendingActions(api);
        if (result.synced > 0) {
          setSyncedRecently(true);
          setTimeout(() => setSyncedRecently(false), 4500);
        }
      } finally {
        setIsSyncing(false);
        updateCountAndErrors();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateCountAndErrors();
    };

    const handleQueueChange = () => updateCountAndErrors();
    const handleSyncError = () => updateCountAndErrors();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);
    window.addEventListener('offline-sync-error', handleSyncError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      window.removeEventListener('offline-sync-error', handleSyncError);
    };
  }, []);

  if (isOnline && !isSyncing && !syncedRecently && syncErrors.length === 0 && pendingCount === 0) {
    return null;
  }

  return (
    <div className="w-full z-40">
      {syncErrors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full py-2.5 px-4 bg-red-700 text-white text-xs font-semibold shadow-md"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {syncErrors.length} offline action{syncErrors.length === 1 ? '' : 's'} could not sync automatically (conflict or server rule).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowErrorDetails((v) => !v)}
                className="px-3 py-1.5 min-h-[36px] bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{showErrorDetails ? 'Hide Details' : 'Inspect Conflicts'}</span>
                {showErrorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={clearAllSyncErrors}
                aria-label="Dismiss all sync conflict alerts"
                className="px-3 py-1.5 min-h-[36px] bg-white text-red-800 hover:bg-red-50 rounded-lg text-xs font-bold inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Clear All</span>
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {showErrorDetails && (
            <ul className="max-w-7xl mx-auto mt-2.5 space-y-2 border-t border-red-500/50 pt-2">
              {syncErrors.map((item) => (
                <li
                  key={item.id}
                  className="bg-red-900/70 rounded-xl p-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-white">
                      {item.action.label || item.action.type}{' '}
                      {item.statusCode === 409 ? '(Server Conflict)' : ''}
                    </p>
                    <p className="text-red-100 mt-0.5">{item.errorMessage}</p>
                  </div>
                  {item.id !== undefined && (
                    <button
                      type="button"
                      onClick={() => clearSyncError(item.id!)}
                      className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-red-950 text-white hover:bg-black font-bold shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(!isOnline || isSyncing || syncedRecently || pendingCount > 0) && (
        <div
          role="status"
          className={`w-full py-2 px-4 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 transition-all duration-300 ${
            !isOnline
              ? 'bg-amber-200 text-amber-950 border-b border-amber-300'
              : isSyncing
              ? 'bg-brand-600 text-white'
              : syncedRecently
              ? 'bg-emerald-700 text-white'
              : 'bg-amber-100 text-amber-950 border-b border-amber-200'
          }`}
        >
          {!isOnline && (
            <>
              <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Offline Mode — Cached views stay available. {pendingCount} queued action{pendingCount === 1 ? '' : 's'} waiting for connection (not yet confirmed by server).
              </span>
            </>
          )}

          {isOnline && isSyncing && (
            <>
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Connection restored. Syncing queued updates safely...</span>
            </>
          )}

          {isOnline && !isSyncing && syncedRecently && (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Queued offline changes synced and verified by the server.</span>
            </>
          )}

          {isOnline && !isSyncing && !syncedRecently && pendingCount > 0 && (
            <>
              <span>{pendingCount} queued update{pendingCount === 1 ? '' : 's'} pending sync.</span>
              <button
                type="button"
                onClick={() => syncPendingActions(api).then(updateCountAndErrors)}
                className="underline font-extrabold hover:opacity-80 px-2 py-0.5 rounded"
              >
                Sync Now
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
