'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../common/Modal';
import {
  Home,
  Calendar,
  CheckSquare,
  MoreHorizontal,
  Users,
  UserCheck,
  QrCode,
  Package,
  Settings,
  Headphones,
  Flame,
  LogOut,
} from 'lucide-react';

interface BottomNavProps {
  onOpenHelp?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenHelp }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { currentEvent, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = [
    { href: '/home', label: t('nav.home'), icon: Home, match: (p: string) => p === '/home' || p === '/' },
    { href: '/events', label: t('nav.events'), icon: Calendar, match: (p: string) => p.startsWith('/events') },
    { href: '/tasks', label: t('nav.tasks'), icon: CheckSquare, match: (p: string) => p.startsWith('/tasks') },
  ];

  const isMoreRoute =
    Boolean(pathname?.startsWith('/team')) ||
    Boolean(pathname?.startsWith('/attendees')) ||
    Boolean(pathname?.startsWith('/check-in')) ||
    Boolean(pathname?.startsWith('/resources')) ||
    Boolean(pathname?.startsWith('/settings'));

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#140F26]/95 backdrop-blur-md border-t border-brand-200/80 dark:border-brand-800/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-soft"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname ? item.match(pathname) : false;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-3 py-1 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active
                  ? 'text-brand-700 dark:text-brand-300 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-label={t('nav.more')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-3 py-1 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            isMoreRoute || moreOpen
              ? 'text-brand-700 dark:text-brand-300 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="text-xs mt-0.5">{t('nav.more')}</span>
        </button>
      </nav>

      <Modal
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('nav.more')}
        description="Quick access to field check-in, team, resources, and app settings"
        maxWidth="sm"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/check-in"
            onClick={() => setMoreOpen(false)}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-pastel-orange hover:bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/80 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <QrCode className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.check_in')}</span>
          </Link>

          <Link
            href="/attendees"
            onClick={() => setMoreOpen(false)}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-pastel-purple hover:bg-brand-100 dark:bg-brand-900/50 text-brand-900 dark:text-brand-200 border border-brand-200/80 dark:border-brand-800/80 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <UserCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.attendees')}</span>
          </Link>

          <Link
            href="/team"
            onClick={() => setMoreOpen(false)}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-pastel-blue hover:bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/80 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.team')}</span>
          </Link>

          <Link
            href="/resources"
            onClick={() => setMoreOpen(false)}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-pastel-green hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/80 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Package className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.resources')}</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setMoreOpen(false)}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#221A40] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-brand-800 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.settings')}</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              onOpenHelp?.();
            }}
            className="flex items-center space-x-2.5 p-3.5 min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#221A40] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-brand-800 font-semibold text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Headphones className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Guides</span>
          </button>

          {currentEvent && (
            <Link
              href={`/events/${currentEvent._id}/day-mode`}
              onClick={() => setMoreOpen(false)}
              className="col-span-2 flex items-center justify-center space-x-2 p-3.5 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Open {currentEvent.name} Day Mode</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              logout();
            }}
            className="col-span-2 flex items-center justify-center space-x-2 p-3 min-h-[44px] rounded-2xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </Modal>
    </>
  );
};
