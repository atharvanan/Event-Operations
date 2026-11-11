'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import { InstallPwaBanner } from './InstallPwaBanner';
import { Modal } from '../common/Modal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import {
  CalendarCheck2,
  X,
  Search,
  Calendar,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  QrCode,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: 'event' | 'task';
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, currentEvent } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchItems, setSearchItems] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (!searchOpen || !user) return;
    let active = true;
    const loadSearchData = async () => {
      setSearchLoading(true);
      try {
        const [evRes, tRes] = await Promise.all([
          api.get('/events'),
          api.get('/dashboard/tasks?scope=mine'),
        ]);
        if (!active) return;
        const events = (evRes.data?.data || []).map((ev: any) => ({
          id: ev._id,
          title: ev.name,
          subtitle: `${ev.venue || 'Venue'} · ${new Date(ev.startDate).toLocaleDateString()}`,
          href: `/events/${ev._id}`,
          kind: 'event' as const,
        }));
        const tasks = (tRes.data?.data || []).slice(0, 20).map((tk: any) => ({
          id: tk._id,
          title: tk.title,
          subtitle: `${tk.eventId?.name || 'Event'} · ${tk.status}`,
          href: tk.eventId?._id ? `/events/${tk.eventId._id}/tasks` : '/tasks',
          kind: 'task' as const,
        }));
        setSearchItems([...events, ...tasks]);
      } catch {
        // Offline or network transient fallback
      } finally {
        if (active) setSearchLoading(false);
      }
    };
    loadSearchData();
    return () => {
      active = false;
    };
  }, [searchOpen, user]);

  if (isLoading || !user) {
    return (
      <main
        id="main-content"
        className="min-h-dvh flex items-center justify-center bg-canvas dark:bg-canvas-dark px-4"
      >
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-lg">
            <CalendarCheck2 className="w-6 h-6 animate-pulse" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Loading workspace...
          </span>
        </div>
      </main>
    );
  }

  const isDayMode = pathname?.endsWith('/day-mode');
  const filteredResults = searchQuery.trim()
    ? searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems.slice(0, 8);

  return (
    <div className="min-h-dvh flex bg-canvas dark:bg-canvas-dark text-slate-900 dark:text-slate-100">
      {/* Persistent Desktop Sidebar (hidden during Day Mode focus or small screens) */}
      {!isDayMode && (
        <Sidebar
          className="hidden md:flex sticky top-0 h-dvh"
          onOpenHelp={() => setHelpOpen(true)}
        />
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <InstallPwaBanner />

        {!isDayMode && (
          <Navbar
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 w-full mx-auto focus:outline-none ${
            isDayMode
              ? ''
              : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-5 pb-28 md:pb-10'
          }`}
        >
          {children}
        </main>
      </div>

      {!isDayMode && <BottomNav onOpenHelp={() => setHelpOpen(true)} />}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          className="md:hidden fixed inset-0 z-50 flex"
        >
          <div
            className="fixed inset-0 bg-[#150E31]/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex h-dvh w-72 max-w-[85vw] shadow-2xl">
            <Sidebar
              className="flex w-full h-full"
              onNavigate={() => setMobileMenuOpen(false)}
              onOpenHelp={() => {
                setMobileMenuOpen(false);
                setHelpOpen(true);
              }}
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-20"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Global Search Dialog */}
      <Modal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search EventOps"
        description="Jump quickly to any event workspace or operational checklist task"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type an event name, venue, or task..."
              aria-label="Search events and tasks"
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {searchLoading ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-4 text-center">
              Loading events and tasks...
            </p>
          ) : filteredResults.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 py-6 text-center">
              No matching events or tasks found.
            </p>
          ) : (
            <ul className="divide-y divide-brand-100 dark:divide-brand-800 max-h-72 overflow-y-auto">
              {filteredResults.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 min-h-[48px] hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.kind === 'event'
                          ? 'bg-pastel-purple text-brand-700'
                          : 'bg-pastel-green text-emerald-800'
                      }`}
                    >
                      {item.kind === 'event' ? (
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <CheckSquare className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Need Help / Guides Dialog */}
      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="EventOps Field Guides & Help"
        description="Simple steps to run events smoothly on desktop or mobile"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-pastel-purple/70 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800">
              <div className="flex items-center space-x-2 font-bold text-sm text-brand-900 dark:text-white mb-1">
                <CheckSquare className="w-4 h-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                <span>1. Event Checklists</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Open any event&apos;s Tasks tab to check off milestones, add subtasks for your crew, and assign due times.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-pastel-green/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center space-x-2 font-bold text-sm text-emerald-950 dark:text-white mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                <span>2. Photo & File Proof</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Staff upload setup photos, voice notes, or documents; Team Leads approve or request clear changes.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-pastel-orange/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center space-x-2 font-bold text-sm text-amber-950 dark:text-white mb-1">
                <QrCode className="w-4 h-4 text-amber-800 dark:text-amber-300" aria-hidden="true" />
                <span>3. Fast QR Check-in</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Scan attendee QR passes at the gate or search by ticket code/name. Works offline with queued sync.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-pastel-blue/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
              <div className="flex items-center space-x-2 font-bold text-sm text-sky-950 dark:text-white mb-1">
                <WifiOff className="w-4 h-4 text-sky-800 dark:text-sky-300" aria-hidden="true" />
                <span>4. Offline & Accessibility</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Actions taken offline show a Pending Sync badge until reconnected. Adjust font scale & contrast in Settings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-100 dark:border-brand-800">
            <div className="flex items-center space-x-2 sm:hidden">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Link
                href="/settings"
                onClick={() => setHelpOpen(false)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                <span>Accessibility Settings</span>
              </Link>
              {currentEvent && (
                <Link
                  href={`/events/${currentEvent._id}/chat`}
                  onClick={() => setHelpOpen(false)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  <span>Open Event Chat</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

