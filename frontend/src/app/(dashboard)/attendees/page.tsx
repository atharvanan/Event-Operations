'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { getPendingActions, queueOfflineAction } from '../../../lib/offlineQueue';
import { Modal } from '../../../components/common/Modal';
import { QrTicketModal } from '@/components/events/QrTicketModal';
import { IAttendee, IEvent } from '@shared/types';
import {
  UserCheck,
  QrCode,
  Search,
  UserPlus,
  CheckCircle2,
  Ticket,
  WifiOff,
  AlertCircle,
} from 'lucide-react';

export default function GlobalAttendeesPage() {
  const { t } = useTranslation();

  const [attendees, setAttendees] = useState<any[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const [selectedQrAttendee, setSelectedQrAttendee] = useState<any | null>(null);
  const [pendingCheckInIds, setPendingCheckInIds] = useState<Set<string>>(new Set());

  // Register modal state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regEventId, setRegEventId] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regTicketType, setRegTicketType] = useState<'General' | 'VIP' | 'Speaker' | 'Staff'>('General');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');

  const syncPendingCheckIns = useCallback(async () => {
    const actions = await getPendingActions();
    const ids = new Set<string>();
    actions.forEach((a) => {
      if (a.type === 'ATTENDEE_CHECKIN' && a.payload?.attendeeId) {
        ids.add(String(a.payload.attendeeId));
      }
    });
    setPendingCheckInIds(ids);
  }, []);

  const loadAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter) params.set('eventId', eventFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await api.get(`/dashboard/attendees?${params.toString()}`);
      const list = res.data?.data?.attendees || [];
      const evList = res.data?.data?.events || [];
      setAttendees(list);
      setEvents(evList);
      if (!regEventId && evList[0]?._id) setRegEventId(evList[0]._id);
    } catch {
      // Transient offline
    } finally {
      setLoading(false);
    }
    await syncPendingCheckIns();
  }, [eventFilter, statusFilter, searchQuery, regEventId, syncPendingCheckIns]);

  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  useEffect(() => {
    const handler = () => syncPendingCheckIns();
    window.addEventListener('offline-queue-changed', handler);
    return () => window.removeEventListener('offline-queue-changed', handler);
  }, [syncPendingCheckIns]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId = regEventId || eventFilter || events[0]?._id;
    if (!targetEventId) {
      setRegError('Select an event first.');
      return;
    }
    setRegError('');
    setRegSubmitting(true);
    try {
      await api.post(`/events/${targetEventId}/attendees`, {
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        ticketType: regTicketType,
      });
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegisterOpen(false);
      await loadAttendees();
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Could not register attendee.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleQuickCheckIn = async (attendee: any) => {
    const evId = typeof attendee.eventId === 'object' ? attendee.eventId?._id : attendee.eventId;
    if (!evId) return;
    setFeedback('');

    const payload = {
      attendeeId: attendee._id,
      ticketCode: attendee.ticketCode,
      idempotencyKey: `web-checkin-${attendee._id}-${Date.now()}`,
    };

    try {
      await api.post(`/events/${evId}/attendees/check-in`, payload);
      setFeedback(`${attendee.name} checked in.`);
      await loadAttendees();
    } catch (err: any) {
      if (!err.response || !navigator.onLine) {
        await queueOfflineAction({
          type: 'ATTENDEE_CHECKIN',
          endpoint: `/events/${evId}/attendees/check-in`,
          method: 'POST',
          payload,
          label: `Check-in ${attendee.name} (${attendee.ticketCode})`,
        });
        await syncPendingCheckIns();
        setFeedback(`${attendee.name} queued offline as Pending Sync until connected.`);
      } else {
        setFeedback(err.response?.data?.message || 'Check-in update failed.');
      }
    }
  };

  const checkedInCount = attendees.filter((a) => a.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('nav.attendees')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            {checkedInCount} checked in out of {attendees.length} matching registrations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/check-in"
            className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl bg-pastel-orange hover:bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-bold text-sm"
          >
            <QrCode className="w-4 h-4" aria-hidden="true" />
            <span>Open QR Scanner</span>
          </Link>

          <button
            type="button"
            disabled={events.length === 0}
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Register Attendee</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or ticket code..."
            aria-label="Search attendees"
            className="w-full pl-10 pr-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          aria-label="Filter attendees by event"
          className="w-full px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>
              {ev.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter attendees by check-in status"
          className="w-full px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="checked_in">Checked In</option>
          <option value="registered">Registered (Not Checked In)</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-pastel-purple dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 text-sm font-semibold text-brand-900 dark:text-white"
        >
          {feedback}
        </div>
      )}

      {/* Clean Attendee Cards List (Never dense tables) */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
            Loading attendees...
          </div>
        ) : attendees.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <UserCheck className="w-10 h-10 text-brand-400 mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No attendees yet</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Register guests to generate instant scannable QR entry passes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-100/80 dark:divide-brand-800/80">
            {attendees.map((att) => {
              const isPendingSync = pendingCheckInIds.has(att._id);
              const isCheckedIn = att.status === 'checked_in';
              const isCancelled = att.status === 'cancelled';

              return (
                <li
                  key={att._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {att.name}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-canvas dark:bg-[#221A40] border border-brand-200 dark:border-brand-700 text-brand-800 dark:text-brand-200">
                        {att.ticketCode}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pastel-blue dark:bg-sky-950/60 text-sky-900 dark:text-sky-200">
                        {att.ticketType}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                      {att.email}
                      {att.eventId?.name ? ` · ${att.eventId.name}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isPendingSync ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
                        <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pending Sync</span>
                      </span>
                    ) : isCheckedIn ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-pastel-green dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Checked In</span>
                      </span>
                    ) : (
                      !isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleQuickCheckIn(att)}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Check In</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedQrAttendee(att)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                    >
                      <Ticket className="w-4 h-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                      <span>QR Pass</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Register Attendee Modal */}
      <Modal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register Event Attendee"
        description="Creates an attendee record and unique scannable QR entry pass"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {regError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center space-x-2 text-xs sm:text-sm text-red-800 dark:text-red-200 font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{regError}</span>
            </div>
          )}

          <div>
            <label htmlFor="reg-event" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Event *
            </label>
            <select
              id="reg-event"
              value={regEventId}
              onChange={(e) => setRegEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Full Name *
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Rohan Kulkarni"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Email Address *
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Phone
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="reg-type" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Ticket Tier
              </label>
              <select
                id="reg-type"
                value={regTicketType}
                onChange={(e) => setRegTicketType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
              >
                <option value="General">General</option>
                <option value="VIP">VIP</option>
                <option value="Speaker">Speaker</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regSubmitting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm disabled:opacity-60"
            >
              {regSubmitting ? 'Registering...' : 'Create Registration'}
            </button>
          </div>
        </form>
      </Modal>

      <QrTicketModal
        attendee={selectedQrAttendee}
        eventName={selectedQrAttendee?.eventId?.name}
        onClose={() => setSelectedQrAttendee(null)}
      />
    </div>
  );
}
