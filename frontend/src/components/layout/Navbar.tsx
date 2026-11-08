'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { OfflineBanner } from './OfflineBanner';
import { Calendar, Flame, LogOut, ShieldAlert, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user, organization, currentEvent, logout } = useAuth();

  return (
    <>
      <OfflineBanner />
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/events" className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                EO
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  {t('app_name')}
                </span>
                {organization && (
                  <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {organization.name}
                  </span>
                )}
              </div>
            </Link>

            {currentEvent && (
              <div className="hidden md:flex items-center pl-4 border-l border-slate-200 dark:border-slate-700 space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {currentEvent.name}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                  {currentEvent.status}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <LanguageSwitcher />
            <NotificationBell />

            {currentEvent && (
              <Link
                href={`/events/${currentEvent._id}/day-mode`}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('nav.day_mode')}</span>
              </Link>
            )}

            {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</span>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                title={t('nav.logout')}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  </>
  );
};
