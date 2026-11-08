'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { Navbar } from '../../../components/layout/Navbar';
import { IEvent } from '@shared/types';
import {
  Calendar,
  MapPin,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';

export default function EventsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, organization, setOrganization, setCurrentEvent } = useAuth();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('wedding');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zones, setZones] = useState('Main Stage, Dining Lawns, Guest Lounge, Entrance Arch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/events');
      setEvents(res.data.data);
    } catch (err) {
      console.error('Error fetching events', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSelectEvent = (event: IEvent) => {
    setCurrentEvent(event);
    router.push(`/events/${event._id}`);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setFormError('');

      const splitZones = zones
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);

      const res = await api.post('/events', {
        orgId: organization?._id,
        name,
        type,
        venue,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        zones: splitZones,
      });

      if (res.data.organization && !organization && setOrganization) {
        setOrganization(res.data.organization);
      }

      setShowCreateModal(false);
      setName('');
      setVenue('');
      setStartDate('');
      setEndDate('');

      // Refresh list and auto-select
      const newEvent = res.data.data;
      setEvents((prev) => [newEvent, ...prev]);
      handleSelectEvent(newEvent);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('events.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live operational workspaces, team status, and on-ground executions
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('events.create_event')}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              {t('events.no_events')}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Create your event and appoint team leads for Catering, Stage Decor, AV, and Logistics.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t('events.create_event')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event._id}
                onClick={() => handleSelectEvent(event)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                      {event.type}
                    </span>
                    <span className="text-xs font-bold text-slate-400 capitalize">
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                    {event.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{new Date(event.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {event.zones && event.zones.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {event.zones.slice(0, 3).map((zone, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          {zone}
                        </span>
                      ))}
                      {event.zones.length > 3 && (
                        <span className="text-[10px] font-medium text-slate-400 px-1 py-0.5">
                          +{event.zones.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Enter Operations</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('events.create_event')}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Royal Heritage Wedding Setup"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="corporate">Corporate Summit</option>
                    <option value="concert">Concert / Fest</option>
                    <option value="birthday">Birthday Party</option>
                    <option value="custom">Custom Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Palace Grounds, Jaipur"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Operational Zones (Comma-separated)
                </label>
                <input
                  type="text"
                  value={zones}
                  onChange={(e) => setZones(e.target.value)}
                  placeholder="Main Stage, Dining Lawns, Guest Lounge"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
