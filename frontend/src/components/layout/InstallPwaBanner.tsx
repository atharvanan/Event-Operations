'use client';

import React from 'react';
import { usePwa } from '../../contexts/PwaContext';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export function InstallPwaBanner() {
  const { canInstall, isInstalled, isIOS, isDismissed, promptInstall, dismissInstallBanner } = usePwa();

  if (isInstalled || isDismissed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <div
      role="region"
      aria-label="Install EventOps application"
      className="rounded-2xl bg-white dark:bg-[#18132B] border border-brand-200 dark:border-brand-700/60 p-3.5 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
    >
      <div className="flex items-start sm:items-center gap-3">
        <img
          src="/icons/icon-192x192.png"
          alt="EventOps app icon"
          className="w-10 h-10 rounded-xl shrink-0"
        />
        <div>
          <p className="text-sm font-bold text-[#1A162E] dark:text-white">
            Install EventOps App
          </p>
          {isIOS ? (
            <p className="text-xs text-[#524D6B] dark:text-brand-200 mt-0.5 flex flex-wrap items-center gap-1">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 inline text-brand-600" aria-hidden="true" />
              <strong>Share</strong>
              <span>then</span>
              <PlusSquare className="w-3.5 h-3.5 inline text-brand-600" aria-hidden="true" />
              <strong>Add to Home Screen</strong>
              <span>for offline venue access.</span>
            </p>
          ) : (
            <p className="text-xs text-[#524D6B] dark:text-brand-200 mt-0.5">
              Quick home-screen launch, standalone full view, and offline check-in support.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {canInstall && (
          <button
            type="button"
            onClick={() => promptInstall()}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Install App</span>
          </button>
        )}
        <button
          type="button"
          onClick={dismissInstallBanner}
          aria-label="Dismiss install banner"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#524D6B] dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-brand-900 transition"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

