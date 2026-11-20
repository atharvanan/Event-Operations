'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { InviteMemberModal } from '../../../components/events/InviteMemberModal';
import { IEvent } from '@shared/types';
import {
  Users,
  UserPlus,
  Search,
  Calendar,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function GlobalTeamPage() {
  const { t } = useTranslation();

  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/teams');
      const data = res.data?.data;
      setTeams(data?.teams || []);
      setEvents(data?.events || []);
    } catch {
      // Transient offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((tm) => {
      const evId = typeof tm.eventId === 'object' ? tm.eventId?._id : tm.eventId;
      if (eventFilter && evId !== eventFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const leadName = tm.leadId?.name?.toLowerCase() || '';
        const memberHit = (tm.memberIds || []).some((m: any) =>
          m?.name?.toLowerCase().includes(q)
        );
        return (
          tm.name?.toLowerCase().includes(q) ||
          tm.eventId?.name?.toLowerCase().includes(q) ||
          leadName.includes(q) ||
          memberHit
        );
      }
      return true;
    });
  }, [teams, eventFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('nav.team')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Coordinate operational squads, team leads, and crew members across active events.
          </p>
        </div>

        <button
          type="button"
          disabled={events.length === 0}
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team name, lead, or crew member..."
            aria-label="Search teams and members"
            className="w-full pl-10 pr-4 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          aria-label="Filter teams by event"
          className="w-full sm:w-64 px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-56 rounded-3xl bg-white dark:bg-[#18132B] border border-brand-100 dark:border-brand-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white dark:bg-[#18132B] rounded-3xl p-10 text-center border border-brand-200/70 dark:border-brand-800/70 shadow-card">
          <Users className="w-10 h-10 text-brand-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No teams found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-5">
            Create an operational squad inside an event workspace or invite a coordinator now.
          </p>
          <button
            type="button"
            disabled={events.length === 0}
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Invite Team Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((tm: any) => {
            const evObj = typeof tm.eventId === 'object' ? tm.eventId : null;
            const evId = evObj?._id || tm.eventId;
            const metrics = tm.metrics || {};
            const readiness = metrics.readinessPercentage || 0;
            const membersList = tm.memberIds || [];

            return (
              <article
                key={tm._id}
                className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-3.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: tm.colorHex || '#5C44CC' }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {tm.name}
                        </h2>
                        {evObj?.name && (
                          <p className="text-xs font-medium text-brand-700 dark:text-brand-300 flex items-center space-x-1 truncate">
                            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{evObj.name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pastel-purple text-brand-800 dark:bg-brand-900/50 dark:text-brand-200 shrink-0">
                      {readiness}% Ready
                    </span>
                  </div>

                  {/* Readiness bar */}
                  <div
                    role="progressbar"
                    aria-label={`${tm.name} task readiness`}
                    aria-valuenow={readiness}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full h-2 rounded-full bg-brand-100 dark:bg-[#221A40] overflow-hidden"
                  >
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${readiness}%` }}
                    />
                  </div>

                  {/* Lead & Crew */}
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                    {tm.leadId?.name && (
                      <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-canvas dark:bg-[#221A40]">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          Lead: {tm.leadId.name}
                        </span>
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                          {membersList.length + 1} staff
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <span className="inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                        <span>
                          {metrics.completedTasks || 0}/{metrics.totalTasks || 0} tasks done
                        </span>
                      </span>
                      {(metrics.blockedTasks || 0) > 0 && (
                        <span className="inline-flex items-center space-x-1 text-red-700 dark:text-red-300 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{metrics.blockedTasks} blocked</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {evId && (
                  <div className="pt-3 border-t border-brand-100 dark:border-brand-800 flex items-center justify-between gap-2">
                    <Link
                      href={`/events/${evId}/chat`}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                      <span>Chat</span>
                    </Link>

                    <Link
                      href={`/events/${evId}/teams`}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span>Open Squads</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        events={events}
        defaultEventId={eventFilter || undefined}
        onInvited={loadTeams}
      />
    </div>
  );
}

