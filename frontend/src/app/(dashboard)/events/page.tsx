'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  Building2,
  PartyPopper,
  Briefcase,
  Music,
  Radio,
  X,
  Layers,
} from 'lucide-react';

export default function EventsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, organization, setOrganization, setCurrentEvent } = useAuth();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'PLANNING' | 'COMPLETED'>('ALL');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('wedding');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zones, setZones] = useState('Main Stage, Dining Lawns, Guest Lounge, Entrance Arch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const suggestedZones = [
    'Main Stage',
    'Catering & Buffet',
    'Green Room & VIP',
    'Audio & Lighting',
    'Entrance & Security',
    'Parking & Logistics',
    'Photo Booth',
  ];

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

  const handleAddZone = (zoneName: string) => {
    const currentZones = zones
      .split(',')
      .map((z) => z.trim())
      .filter(Boolean);
    if (!currentZones.includes(zoneName)) {
      setZones([...currentZones, zoneName].join(', '));
    }
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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.zones && ev.zones.some((z) => z.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'LIVE') return ev.status === 'in_progress' || ev.status === 'live_setup';
      if (statusFilter === 'PLANNING') return ev.status === 'planning';
      if (statusFilter === 'COMPLETED') return ev.status === 'completed';
      return true;
    });
  }, [events, searchQuery, statusFilter]);

  // Operational metrics summary
  const liveCount = events.filter((e) => e.status === 'in_progress' || e.status === 'live_setup').length;
  const planningCount = events.filter((e) => e.status === 'planning').length;
  const completedCount = events.filter((e) => e.status === 'completed').length;

  const getTypeIcon = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'wedding':
        return <Sparkles className="w-3.5 h-3.5 text-pink-500" />;
      case 'corporate':
        return <Briefcase className="w-3.5 h-3.5 text-blue-500" />;
      case 'concert':
        return <Music className="w-3.5 h-3.5 text-purple-500" />;
      case 'birthday':
        return <PartyPopper className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Org Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('events.title')}
              </h1>
              {organization && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {organization.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live operational workspaces, ground team coordination, and real-time execution tracking
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('events.create_event')}</span>
          </button>
        </div>

        {/* Operational Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{events.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live & On Ground</span>
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{liveCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Planning Mode</span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{planningCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{completedCount}</div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, venue, or zone..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'LIVE', 'PLANNING', 'COMPLETED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {filter === 'ALL' && 'All'}
                {filter === 'LIVE' && 'Live Setup'}
                {filter === 'PLANNING' && 'Planning'}
                {filter === 'COMPLETED' && 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No matching events found' : t('events.no_events')}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms or filters.'
                : 'Create your event and appoint team leads for Catering, Stage Decor, AV, and Logistics.'}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('events.create_event')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const isLive = event.status === 'in_progress' || event.status === 'live_setup';
              return (
                <div
                  key={event._id}
                  onClick={() => handleSelectEvent(event)}
                  className="interactive-card group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:border-blue-500/60 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Type and Status */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700 capitalize">
                        {getTypeIcon(event.type)}
                        <span>{event.type}</span>
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 ${
                          isLive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : event.status === 'completed'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                        <span className="capitalize">{event.status.replace('_', ' ')}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {event.name}
                    </h3>

                    {/* Meta info: Venue & Date */}
                    <div className="mt-3.5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{event.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium">
                          {new Date(event.startDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          •{' '}
                          {new Date(event.startDate).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Zones Preview Chips */}
                    {event.zones && event.zones.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {event.zones.slice(0, 3).map((zone, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700"
                          >
                            {zone}
                          </span>
                        ))}
                        {event.zones.length > 3 && (
                          <span className="text-[10px] font-bold text-slate-400 px-1 py-0.5 self-center">
                            +{event.zones.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 transition-colors">
                    <span className="tracking-wide">Launch Operations Command</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {t('events.create_event')}
                  </h3>
                  <p className="text-[11px] text-slate-500">Initialize a live operations workspace for your teams</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl border border-red-200 dark:border-red-900">
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
                  placeholder="e.g. Royal Heritage Wedding Jaipur"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="wedding">💍 Wedding</option>
                    <option value="corporate">💼 Corporate Summit</option>
                    <option value="concert">🎵 Concert / Music Fest</option>
                    <option value="birthday">🎉 Birthday Celebration</option>
                    <option value="exhibition">🏛️ Expo / Exhibition</option>
                    <option value="custom">✨ Custom Event</option>
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
                    placeholder="e.g. Grand Hyatt, Goa"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-2"
                />

                {/* Quick Add Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Add:</span>
                  {suggestedZones.map((sz, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddZone(sz)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700 transition-all"
                    >
                      + {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-60 transition-all"
                >
                  {isSubmitting ? 'Creating Workspace...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
