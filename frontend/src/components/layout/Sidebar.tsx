'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  Calendar,
  CheckSquare,
  Users,
  UserCheck,
  Package,
  Settings,
  Headphones,
  ArrowRight,
  CalendarCheck2,
  QrCode,
  MessageSquare,
  Flame,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onOpenHelp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  onNavigate,
  onOpenHelp,
}) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { currentEvent } = useAuth();

  const navItems = [
    { href: '/home', label: t('nav.home'), icon: Home, match: (p: string) => p === '/home' || p === '/' },
    { href: '/events', label: t('nav.events'), icon: Calendar, match: (p: string) => p.startsWith('/events') },
    { href: '/tasks', label: t('nav.tasks'), icon: CheckSquare, match: (p: string) => p.startsWith('/tasks') },
    { href: '/team', label: t('nav.team'), icon: Users, match: (p: string) => p.startsWith('/team') },
    {
      href: '/attendees',
      label: t('nav.attendees'),
      icon: UserCheck,
      match: (p: string) => p.startsWith('/attendees') || p === '/check-in',
    },
    { href: '/resources', label: t('nav.resources'), icon: Package, match: (p: string) => p.startsWith('/resources') },
    { href: '/settings', label: t('nav.settings'), icon: Settings, match: (p: string) => p.startsWith('/settings') },
  ];

  const isInsideEvent =
    Boolean(currentEvent) &&
    Boolean(pathname?.startsWith('/events/')) &&
    pathname !== '/events/create';

  return (
    <aside
      aria-label="Workspace Navigation"
      className={`relative flex flex-col w-64 shrink-0 text-white overflow-hidden select-none bg-[#221849] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(180deg, #221849 0%, #2A1F5A 58%, #392878 100%)',
      }}
    >
      {/* Subtle atmospheric glow at bottom echoing the reference sidebar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 85%, rgba(124, 102, 232, 0.55) 0%, transparent 55%), radial-gradient(circle at 75% 95%, rgba(92, 68, 204, 0.45) 0%, transparent 60%)',
        }}
      />

      {/* Brand Header */}
      <div className="relative z-10 px-5 pt-6 pb-5 flex items-center space-x-3">
        <Link
          href="/home"
          onClick={onNavigate}
          className="flex items-center space-x-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 p-1 -ml-1"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-500/90 border border-white/20 flex items-center justify-center shadow-md shadow-black/25">
            <CalendarCheck2 className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            {t('app_name')}
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Primary Navigation" className="relative z-10 flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname ? item.match(pathname) : false;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center space-x-3 px-4 py-2.5 min-h-[44px] rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                active
                  ? 'bg-white/15 text-white font-semibold shadow-sm ring-1 ring-white/20'
                  : 'text-purple-100/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Active Event Context Card when inside an Event Workspace */}
        {isInsideEvent && currentEvent && (
          <div className="mt-5 pt-4 border-t border-white/15">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-purple-200/80 mb-2">
              Current Event
            </p>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 space-y-2">
              <Link
                href={`/events/${currentEvent._id}`}
                onClick={onNavigate}
                className="block font-semibold text-sm text-white hover:underline truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                {currentEvent.name}
              </Link>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Link
                  href={`/events/${currentEvent._id}/check-in`}
                  onClick={onNavigate}
                  aria-label="Scan Event QR Check-in"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <QrCode className="w-4 h-4 mb-0.5" aria-hidden="true" />
                  <span>Scan</span>
                </Link>
                <Link
                  href={`/events/${currentEvent._id}/chat`}
                  onClick={onNavigate}
                  aria-label="Chat — Live Event Chat"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <MessageSquare className="w-4 h-4 mb-0.5" aria-hidden="true" />
                  <span>Chat</span>
                </Link>
                <Link
                  href={`/events/${currentEvent._id}/day-mode`}
                  onClick={onNavigate}
                  aria-label="Live Event Day Mode"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/35 text-xs font-medium text-amber-100 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Flame className="w-4 h-4 mb-0.5" aria-hidden="true" />
                  <span>Live</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Help Card matching Reference Screenshot */}
      <div className="relative z-10 p-4 mt-auto">
        <button
          type="button"
          onClick={onOpenHelp}
          className="w-full text-left flex items-center justify-between px-4 py-3.5 min-h-[54px] rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-white leading-tight">
                {t('nav.need_help')}
              </span>
              <span className="block text-xs text-purple-100/90 truncate mt-0.5">
                {t('nav.chat_or_guides')}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/90 shrink-0 ml-2" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
