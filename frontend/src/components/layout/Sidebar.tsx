'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Camera,
  MessageSquare,
  Flame,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { currentEvent } = useAuth();

  if (!currentEvent) {
    return (
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
        <div className="flex items-center space-x-2 text-slate-500 mb-6 px-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm">Event Navigation</span>
        </div>
        <p className="text-xs text-slate-500 px-2 leading-relaxed">
          Select or create an event from the events dashboard to begin operational coordination.
        </p>
      </aside>
    );
  }

  const base = `/events/${currentEvent._id}`;

  const navItems = [
    { href: `${base}`, label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: `${base}/tasks`, label: t('nav.tasks'), icon: KanbanSquare },
    { href: `${base}/teams`, label: t('nav.teams'), icon: Users },
    { href: `${base}/evidence`, label: t('nav.evidence'), icon: Camera },
    { href: `${base}/chat`, label: t('nav.chat'), icon: MessageSquare },
    { href: `${base}/day-mode`, label: t('nav.day_mode'), icon: Flame },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-6">
      <div>
        <Link
          href="/events"
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Event</span>
        </Link>
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{currentEvent.name}</h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">{currentEvent.venue}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
