'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function RegisterServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      })
      .catch((error) => {
        console.warn('PWA Service Worker registration failed:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleApplyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 rounded-2xl bg-brand-900 text-white p-4 shadow-card border border-brand-500/40 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold">App update available</p>
        <p className="text-xs text-brand-100 mt-0.5">
          Refresh when ready to load the latest EventOps version.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleApplyUpdate}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white text-brand-900 text-xs font-extrabold hover:bg-brand-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Update</span>
        </button>
        <button
          type="button"
          onClick={() => setShowUpdatePrompt(false)}
          aria-label="Dismiss update notification"
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-brand-100 hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
