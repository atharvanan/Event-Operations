'use client';

import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Modal } from '../common/Modal';
import { IEvent, ITeam, EventRole } from '@shared/types';
import { UserPlus, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: IEvent[];
  defaultEventId?: string;
  teams?: ITeam[];
  onInvited?: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  events = [],
  defaultEventId,
  teams = [],
  onInvited,
}) => {
  const [modalEvents, setModalEvents] = useState<IEvent[]>(events);
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || events[0]?._id || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<EventRole>(EventRole.TEAM_MEMBER);
  const [teamId, setTeamId] = useState('');
  const [eventTeams, setEventTeams] = useState<ITeam[]>(teams);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync events or fetch fallback
  useEffect(() => {
    if (events && events.length > 0) {
      setModalEvents(events);
    } else if (isOpen) {
      let active = true;
      api
        .get('/events')
        .then((res: { data?: { data?: IEvent[] } }) => {
          if (active && res.data?.data) {
            setModalEvents(res.data.data);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [events, isOpen]);

  // Synchronize selected event
  useEffect(() => {
    if (defaultEventId) {
      setSelectedEventId(defaultEventId);
    } else if (!selectedEventId && modalEvents.length > 0) {
      setSelectedEventId(modalEvents[0]._id);
    }
  }, [defaultEventId, modalEvents, selectedEventId]);

  // Fetch teams for selected event
  useEffect(() => {
    if (!isOpen || !selectedEventId) return;
    if (teams.length > 0 && defaultEventId === selectedEventId) {
      setEventTeams(teams);
      return;
    }
    let active = true;
    api
      .get(`/events/${selectedEventId}/teams`)
      .then((res: { data?: { data?: ITeam[] } }) => {
        if (active) setEventTeams(res.data?.data || []);
      })
      .catch(() => {
        if (active) setEventTeams([]);
      });
    return () => {
      active = false;
    };
  }, [isOpen, selectedEventId, teams, defaultEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      setError('Please select an event first.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await api.post(`/events/${selectedEventId}/invite`, {
        name: name.trim() || undefined,
        email: email.trim(),
        role,
        teamId: teamId || undefined,
      });
      setSuccessMsg(res.data?.message || 'Team member added to the event successfully.');
      setName('');
      setEmail('');
      onInvited?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not invite member.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentEventObj = modalEvents.find((e) => e._id === selectedEventId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setError('');
        setSuccessMsg('');
        onClose();
      }}
      title="Invite Team Member"
      description="Add an existing user or create an instant staff account assigned to your event"
      maxWidth="md"
    >
      {modalEvents.length === 0 ? (
        <div className="py-4 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Create an event first so we know which event workspace to invite your team member into.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center space-x-2 text-xs sm:text-sm text-red-800 dark:text-red-200 font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Event Selection: show dropdown if more than 1 event or no default specified, otherwise show event badge */}
          {modalEvents.length > 1 && !defaultEventId ? (
            <div>
              <label htmlFor="invite-event" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Target Event *
              </label>
              <select
                id="invite-event"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setTeamId('');
                }}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {modalEvents.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          ) : currentEventObj ? (
            <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/50 border border-brand-200/80 dark:border-brand-800 text-xs font-medium text-brand-900 dark:text-brand-200">
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Event: <strong>{currentEventObj.name}</strong></span>
            </div>
          ) : null}

          <div>
            <label htmlFor="invite-email" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Email Address *
            </label>
            <input
              id="invite-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coordinator@company.com"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="invite-name" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Full Name
              </label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional if existing user"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="invite-role" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Event Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as EventRole)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value={EventRole.TEAM_MEMBER}>Team Member</option>
                <option value={EventRole.TEAM_LEAD}>Team Lead</option>
                <option value={EventRole.EVENT_MANAGER}>Event Manager</option>
                <option value={EventRole.VENDOR_CLIENT}>Vendor / Client</option>
              </select>
            </div>
          </div>

          {eventTeams.length > 0 ? (
            <div>
              <label htmlFor="invite-team" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Assign to Squad (Optional)
              </label>
              <select
                id="invite-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="">No specific squad yet (General Staff)</option>
                {eventTeams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              No squads created yet. Member will be assigned to General Event Staff.
            </p>
          )}

          <div className="flex justify-end space-x-2.5 pt-2 border-t border-brand-100 dark:border-brand-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/40 cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-bold shadow-sm disabled:opacity-60 cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Adding...' : 'Send Invite'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
