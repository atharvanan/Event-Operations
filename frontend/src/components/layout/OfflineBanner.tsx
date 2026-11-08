'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getPendingActionsCount, syncPendingActions } from '../../lib/offlineQueue';
import { api } from '../../lib/api';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedRecently, setSyncedRecently] = useState<boolean>(false);

  const updateCount = async () => {
    const count = await getPendingActionsCount();
    setPendingCount(count);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    updateCount();

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        const result = await syncPendingActions(api);
        if (result.synced > 0) {
          setSyncedRecently(true);
          setTimeout(() => setSyncedRecently(false), 4000);
        }
      } finally {
        setIsSyncing(false);
        updateCount();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateCount();
    };

    const handleQueueChange = () => {
      updateCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, []);

  if (isOnline && !isSyncing && !syncedRecently) {
    return null;
  }

  return (
    <div
      role="status"
      className={`w-full py-2 px-4 text-xs font-bold text-center flex items-center justify-center space-x-2 transition-all duration-300 z-50 ${
        !isOnline
          ? 'bg-amber-500 text-slate-950 shadow-md'
          : isSyncing
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-emerald-600 text-white shadow-md'
      }`}
    >
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>
            Offline Mode Active — You can continue working. {pendingCount} change{pendingCount === 1 ? '' : 's'} queued for auto-sync.
          </span>
        </>
      )}

      {isOnline && isSyncing && (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Reconnected to venue network. Syncing queued offline changes...</span>
        </>
      )}

      {isOnline && !isSyncing && syncedRecently && (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>All offline task updates successfully synchronized with command center!</span>
        </>
      )}
    </div>
  );
}
