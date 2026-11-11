'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import { getEventCoverSrc, getCountdownBadge, formatFriendlyDate } from '../../../lib/eventVisuals';
import { InviteMemberModal } from '../../../components/events/InviteMemberModal';
import { IEvent } from '@shared/types';
import {
  Sun,
  Moon,
  Plus,
  Check,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  ChevronRight,
  QrCode,
  CheckSquare,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

interface DashboardSummary {
  overview: {
    totalEvents: number;
    totalAttendees: number;
    openTasks: number;
    teamMembers: number;
  };
  upcomingEvents: IEvent[];
  myUrgentTasks: any[];
}

export default function HomeDashboardPage() {
  const { t } = useTranslation();
  const { user, setCurrentEvent } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allEvents, setAllEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadDashboard = async () => {
    try {
      const [sumRes, evRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/events'),
      ]);
      setSummary(sumRes.data?.data || null);
      setAllEvents(evRes.data?.data || []);
    } catch {
      // Offline / network transient handled gently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentEvent(null);
    loadDashboard();
  }, []);

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? 'home.greeting_morning'
      : hour < 17
      ? 'home.greeting_afternoon'
      : 'home.greeting_evening';
  const isEvening = hour >= 18;
  const firstName = user?.name?.trim()?.split(' ')[0] || 'Organizer';

  const featuredEvent = summary?.upcomingEvents?.[0] || allEvents[0] || null;
  const secondaryEvents = (summary?.upcomingEvents || []).slice(1, 3);
  const overview = summary?.overview || {
    totalEvents: allEvents.length,
    totalAttendees: 0,
    openTasks: 0,
    teamMembers: 0,
  };

  const countdown = featuredEvent
    ? getCountdownBadge(featuredEvent.startDate, featuredEvent.endDate, featuredEvent.status)
    : null;

  return (
    <div className="space-y-5 sm:space-y-5">
      {/* Greeting Banner matching Reference Image */}
      <section aria-labelledby="home-greeting-heading" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span
              aria-hidden="true"
              className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs"
            >
              {isEvening ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </span>
            <h1
              id="home-greeting-heading"
              className="text-2xl sm:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight"
            >
              {t(greetingKey)}, {firstName}
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 sm:pl-11">
            <span className="hidden sm:inline">{t('home.subtitle')}</span>
            <span className="sm:hidden">{t('home.mobile_subtitle')}</span>
          </p>
        </div>

        <Link
          href="/events/create"
          className="hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{t('home.action_create_event')}</span>
        </Link>
      </section>

      {/* 4 Pastel Quick Action Cards */}
      <section aria-label={t('home.quick_actions')}>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
          <Link
            href="/events/create"
            className="group bg-white dark:bg-[#18132B] hover:bg-pastel-purple/40 dark:hover:bg-brand-900/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card transition-all flex flex-col items-center justify-center text-center min-h-[82px] sm:min-h-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-pastel-purple dark:bg-brand-900/70 text-brand-700 dark:text-brand-200 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.action_create_event')}
            </span>
            <span className="sm:hidden text-xs font-semibold text-slate-900 dark:text-white">
              {t('home.short_event')}
            </span>
          </Link>

          <Link
            href="/tasks"
            className="group bg-white dark:bg-[#18132B] hover:bg-pastel-green/40 dark:hover:bg-emerald-950/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card transition-all flex flex-col items-center justify-center text-center min-h-[82px] sm:min-h-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-pastel-green dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.action_my_tasks')}
            </span>
            <span className="sm:hidden text-xs font-semibold text-slate-900 dark:text-white">
              {t('home.short_tasks')}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="group bg-white dark:bg-[#18132B] hover:bg-pastel-blue/40 dark:hover:bg-sky-950/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card transition-all flex flex-col items-center justify-center text-center min-h-[82px] sm:min-h-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-pastel-blue dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.action_invite_team')}
            </span>
            <span className="sm:hidden text-xs font-semibold text-slate-900 dark:text-white">
              {t('home.short_team')}
            </span>
          </button>

          <Link
            href="/check-in"
            className="group bg-white dark:bg-[#18132B] hover:bg-pastel-orange/40 dark:hover:bg-amber-950/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card transition-all flex flex-col items-center justify-center text-center min-h-[82px] sm:min-h-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-pastel-orange dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.action_checkin')}
            </span>
            <span className="sm:hidden text-xs font-semibold text-slate-900 dark:text-white">
              {t('home.short_checkin')}
            </span>
          </Link>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section aria-labelledby="upcoming-events-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="upcoming-events-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight"
          >
            {t('home.upcoming_events')}
          </h2>
          <Link
            href="/events"
            className="inline-flex items-center space-x-1 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 min-h-[40px] px-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>{t('home.view_all_events')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="h-40 rounded-3xl bg-white/70 dark:bg-[#18132B]/70 border border-brand-200/60 dark:border-brand-800/60 animate-pulse" />
        ) : !featuredEvent ? (
          <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 p-8 text-center shadow-card space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pastel-purple text-brand-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No upcoming events yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Create your first event to coordinate checklists, assign team leads, and manage contactless check-in.
            </p>
            <div className="pt-2">
              <Link
                href="/events/create"
                className="inline-flex items-center space-x-2 px-5 py-3 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{t('home.create_new_event')}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Horizontal Card + Clean Mobile Compact Card */}
            <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card">
              {/* Desktop / Tablet Layout */}
              <div className="hidden sm:flex items-center justify-between gap-5">
                <div className="flex items-center gap-5 min-w-0 flex-1">
                  <div className="relative w-52 h-32 rounded-2xl overflow-hidden shrink-0 border border-brand-100 dark:border-brand-800 bg-brand-900">
                    <img
                      src={getEventCoverSrc(featuredEvent.type, featuredEvent.coverImage)}
                      alt={`${featuredEvent.name} venue cover`}
                      className="w-full h-full object-cover"
                    />
                    {countdown && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-brand-800 font-bold text-xs shadow-sm">
                        {countdown.label}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                      {featuredEvent.name}
                    </h3>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span>{formatFriendlyDate(featuredEvent.startDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span className="truncate">{featuredEvent.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                        <span>
                          {featuredEvent.registeredCount ?? 0} {t('home.registered')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                  <Link
                    href={`/events/${featuredEvent._id}/check-in`}
                    aria-label={`More actions or check-in for ${featuredEvent.name}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                  </Link>

                  <Link
                    href={`/events/${featuredEvent._id}`}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span>{t('home.open_event')}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Mobile Compact Card Layout matching Reference Mobile Screen */}
              <Link
                href={`/events/${featuredEvent._id}`}
                className="flex sm:hidden items-center justify-between gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
              >
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-brand-100 dark:border-brand-800">
                  <img
                    src={getEventCoverSrc(featuredEvent.type, featuredEvent.coverImage)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {featuredEvent.name}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    <span className="truncate">{formatFriendlyDate(featuredEvent.startDate)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    <span>
                      {featuredEvent.registeredCount ?? 0} {t('home.registered')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
              </Link>
            </div>

            {/* Mobile Primary Create New Event Full-Width Button */}
            <Link
              href="/events/create"
              className="sm:hidden flex items-center justify-center space-x-2 w-full py-3 px-5 min-h-[46px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t('home.create_new_event')}</span>
            </Link>
          </div>
        )}
      </section>

      {/* Quick Overview (4 Single-Stat Clean Cards — Zero Bloated Charts) */}
      <section aria-labelledby="quick-overview-heading" className="space-y-3">
        <h2
          id="quick-overview-heading"
          className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight"
        >
          {t('home.quick_overview')}
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/events"
            className="bg-white dark:bg-[#18132B] hover:border-brand-400 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex items-center space-x-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-11 h-11 rounded-2xl bg-pastel-purple dark:bg-brand-900/70 text-brand-700 dark:text-brand-200 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {overview.totalEvents.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                {t('home.total_events')}
              </p>
            </div>
          </Link>

          <Link
            href="/attendees"
            className="bg-white dark:bg-[#18132B] hover:border-emerald-400 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex items-center space-x-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-11 h-11 rounded-2xl bg-pastel-green dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {overview.totalAttendees.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                {t('home.total_attendees')}
              </p>
            </div>
          </Link>

          <Link
            href="/tasks"
            className="bg-white dark:bg-[#18132B] hover:border-amber-400 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex items-center space-x-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-11 h-11 rounded-2xl bg-pastel-orange dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {overview.openTasks.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                {t('home.open_tasks')}
              </p>
            </div>
          </Link>

          <Link
            href="/team"
            className="bg-white dark:bg-[#18132B] hover:border-sky-400 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex items-center space-x-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="w-11 h-11 rounded-2xl bg-pastel-blue dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {overview.teamMembers.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                {t('home.team_members')}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Additional Upcoming Events below Quick Overview */}
      {secondaryEvents.length > 0 && (
        <section aria-label="More Upcoming Events" className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {secondaryEvents.map((ev) => {
            const badge = getCountdownBadge(ev.startDate, ev.endDate, ev.status);
            return (
              <Link
                key={ev._id}
                href={`/events/${ev._id}`}
                className="flex items-center justify-between gap-3 bg-white dark:bg-[#18132B] hover:border-brand-400 rounded-2xl p-3.5 border border-brand-200/60 dark:border-brand-800/60 shadow-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={getEventCoverSrc(ev.type, ev.coverImage)}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-brand-100 dark:border-brand-800"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ev.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {formatFriendlyDate(ev.startDate)} · {ev.venue}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pastel-purple dark:bg-brand-900 text-brand-800 dark:text-brand-200 shrink-0">
                  {badge.label}
                </span>
              </Link>
            );
          })}
        </section>
      )}

      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        events={allEvents}
        onInvited={loadDashboard}
      />
    </div>
  );
}

