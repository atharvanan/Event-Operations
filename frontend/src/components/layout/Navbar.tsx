'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import {
  Menu,
  Search,
  CalendarCheck2,
  Flame,
  Settings,
  QrCode,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  onOpenSearch,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, organization, currentEvent, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const userInitial = user?.name?.trim()?.charAt(0).toUpperCase() || 'E';

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 bg-canvas/90 dark:bg-[#0E0B1A]/90 backdrop-blur-md border-b border-brand-200/50 dark:border-brand-800/60 px-4 sm:px-6 lg:px-8 py-2.5 safe-area-top"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Mobile Hamburger + Brand, Desktop Search Trigger / Active Event */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-brand-900/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          {/* Mobile Center Brand Lockup */}
          <Link
            href="/home"
            className="md:hidden flex items-center space-x-2 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm">
              <CalendarCheck2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              {t('app_name')}
            </span>
          </Link>

          {/* Desktop Quick Search Pill + Org Name */}
          <div className="hidden md:flex items-center space-x-3 min-w-0">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex items-center space-x-2.5 px-3.5 py-2 min-h-[42px] min-w-[220px] lg:min-w-[260px] rounded-2xl bg-white dark:bg-[#18132B] border border-brand-200/80 dark:border-brand-800/80 text-slate-600 dark:text-slate-300 hover:border-brand-400 shadow-card text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Search className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                <span className="truncate">{t('common.search')} events, tasks...</span>
              </button>
            )}

            {organization && (
              <span
                className={`hidden ${
                  currentEvent ? '2xl:inline-flex' : 'xl:inline-flex'
                } items-center text-xs font-semibold text-brand-800 dark:text-brand-200 bg-white/80 dark:bg-[#18132B] px-3 py-1.5 rounded-full border border-brand-200/70 dark:border-brand-800 overflow-hidden max-w-[220px]`}
              >
                <span className="truncate">{organization.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Search (mobile icon / desktop tools), Lang, Theme, Notifications, Avatar */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Open search"
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          {currentEvent && (
            <Link
              href={`/events/${currentEvent._id}/day-mode`}
              aria-label={`${currentEvent.name} ${t('nav.day_mode')}`}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 min-h-[42px] bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">{t('nav.day_mode')}</span>
            </Link>
          )}

          <NotificationBell />

          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label={`Account menu for ${user.name}`}
                className="flex items-center space-x-1.5 p-1 pr-2 min-h-[44px] rounded-full bg-white dark:bg-[#18132B] border border-brand-200/80 dark:border-brand-800 hover:border-brand-400 shadow-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className="w-9 h-9 rounded-full bg-brand-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {userInitial}
                </span>
                <ChevronDown className="hidden sm:block w-4 h-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="User Account Menu"
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#18132B] rounded-2xl shadow-soft border border-brand-200/80 dark:border-brand-800 py-2 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-brand-100 dark:border-brand-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{user.email}</p>
                    {organization && (
                      <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mt-0.5 truncate">
                        {organization.name}
                      </p>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1">
                    <Link
                      href="/check-in"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 min-h-[40px] rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <QrCode className="w-4 h-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                      <span>{t('nav.check_in')}</span>
                    </Link>

                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 min-h-[40px] rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Settings className="w-4 h-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                      <span>{t('nav.settings')}</span>
                    </Link>
                  </div>

                  <div className="p-3 border-t border-b border-brand-100 dark:border-brand-800 space-y-2.5">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Language
                      </p>
                      <LanguageSwitcher compact />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Theme
                      </p>
                      <ThemeToggle compact />
                    </div>
                  </div>

                  <div className="p-1.5 pt-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
