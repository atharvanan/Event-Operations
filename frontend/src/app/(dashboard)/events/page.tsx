'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import {
  getEventCoverSrc,
  getCountdownBadge,
  formatFriendlyDate,
} from '../../../lib/eventVisuals';
import { IEvent } from '@shared/types';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  QrCode,
} from 'lucide-react';

export default function EventsDirectoryPage() {
  const { t } = useTranslation();
  const { setCurrentEvent } = useAuth();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');

  useEffect(() => {
    setCurrentEvent(null);
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/events');
        setEvents(res.data?.data || []);
      } catch {
        // Handled cleanly on transient offline
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'LIVE') {
        return ev.status === 'live_setup' || ev.status === 'in_progress';
      }
      if (statusFilter === 'UPCOMING') {
        return ev.status === 'planning';
      }
      return ev.status === 'completed' || ev.status === 'archived';
    });
  }, [events, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('events.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Select an event workspace or launch the guided wizard to plan a new event.
          </p>
        </div>

        <Link
          href="/events/create"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{t('events.create_event')}</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event title, venue, or type..."
            aria-label="Search events"
            className="w-full pl-10 pr-4 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div
          role="tablist"
          aria-label="Event status filter"
          className="inline-flex flex-wrap gap-1.5 bg-canvas dark:bg-[#221A40] p-1 rounded-2xl border border-brand-200/60 dark:border-brand-800"
        >
          {[
            { id: 'ALL', label: `All (${events.length})` },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'LIVE', label: 'Live' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === item.id}
              onClick={() => setStatusFilter(item.id as any)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                statusFilter === item.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-brand-900/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-3xl bg-white/70 dark:bg-[#18132B]/70 border border-brand-200/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-[#18132B] rounded-3xl p-10 text-center border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-pastel-purple text-brand-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No matching events</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            {t('events.no_events')}
          </p>
          <div className="pt-1">
            <Link
              href="/events/create"
              className="inline-flex items-center space-x-2 px-5 py-3 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t('events.create_event')}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => {
            const badge = getCountdownBadge(ev.startDate, ev.endDate, ev.status);
            const totalTasks = ev.totalTasksCount ?? 0;
            const doneTasks = ev.completedTasksCount ?? 0;
            const readiness = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return (
              <article
                key={ev._id}
                className="bg-white dark:bg-[#18132B] rounded-3xl overflow-hidden border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col justify-between transition-all hover:border-brand-400"
              >
                <div>
                  <div className="relative h-44 bg-brand-900 overflow-hidden">
                    <img
                      src={getEventCoverSrc(ev.type, ev.coverImage)}
                      alt={`${ev.name} venue preview`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 text-brand-800 font-bold text-xs shadow-sm">
                      {badge.label}
                    </span>
                    <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#221849]/85 text-white font-semibold text-xs capitalize backdrop-blur-xs">
                      {ev.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {ev.name}
                    </h2>

                    <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span className="truncate">{formatFriendlyDate(ev.startDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span className="truncate">{ev.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span>
                          {ev.registeredCount ?? 0} {t('home.registered')} · {ev.checkedInCount ?? 0} Checked In
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>Checklist</span>
                        </span>
                        <span>
                          {doneTasks}/{totalTasks} ({readiness}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-brand-100 dark:bg-brand-900 overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full transition-all"
                          style={{ width: `${readiness}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 flex items-center gap-2">
                  <Link
                    href={`/events/${ev._id}`}
                    className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span>{t('home.open_event')}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/events/${ev._id}/check-in`}
                    aria-label={`Launch QR check-in for ${ev.name}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-pastel-purple dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <QrCode className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
