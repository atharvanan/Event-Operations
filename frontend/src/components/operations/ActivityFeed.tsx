'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../lib/api';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Image as ImageIcon,
  Clock,
  Filter,
} from 'lucide-react';

export interface IActivityItem {
  _id: string;
  taskId: {
    _id: string;
    title: string;
    status: string;
    priority: string;
    zone?: string;
  };
  actorId: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  action: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  eventId: string;
  onSelectTask?: (taskId: string) => void;
}

export function ActivityFeed({ eventId, onSelectTask }: ActivityFeedProps) {
  const [activities, setActivities] = useState<IActivityItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'STATUS' | 'EVIDENCE' | 'URGENT'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/events/${eventId}/activities?limit=50`);
      if (res.data?.success) {
        setActivities(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchActivities();
    }
  }, [eventId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (activity: IActivityItem) => {
      setActivities((prev) => [activity, ...prev]);
    };

    socket.on('activity:new', handleNewActivity);
    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket]);

  const filteredActivities = activities.filter((act) => {
    if (filter === 'STATUS') return act.action === 'STATUS_CHANGED';
    if (filter === 'EVIDENCE') return act.action.startsWith('EVIDENCE_');
    if (filter === 'URGENT') {
      return (
        act.newValue === 'BLOCKED' ||
        act.newValue === 'REWORK_REQUIRED' ||
        act.action === 'EVIDENCE_REJECTED'
      );
    }
    return true;
  });

  const getActionBadge = (action: string, newValue?: string) => {
    if (newValue === 'BLOCKED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-black bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span>BLOCKED</span>
        </span>
      );
    }
    if (newValue === 'REWORK_REQUIRED' || action === 'EVIDENCE_REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
          <Flame className="w-3 h-3 text-amber-600" />
          <span>REWORK REQUIRED</span>
        </span>
      );
    }
    if (newValue === 'COMPLETED' || action === 'EVIDENCE_APPROVED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>APPROVED / COMPLETED</span>
        </span>
      );
    }
    if (action.startsWith('EVIDENCE_')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-black bg-brand-100 text-brand-700 dark:bg-brand-950/80 dark:text-brand-200">
          <ImageIcon className="w-3 h-3 text-brand-600" />
          <span>PROOF SUBMITTED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-black bg-brand-50 text-[#2B244D] dark:bg-[#221C3E] dark:text-brand-100">
        <span>{action.replace('_', ' ')}</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/60 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-100 dark:border-brand-800/60 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-brand-600 dark:text-brand-300 animate-pulse" />
            <h3 className="text-base font-black text-[#1A162E] dark:text-white">
              Live Operations Audit Trail
            </h3>
          </div>
          <p className="text-xs text-[#524D6B] dark:text-brand-200 mt-0.5 font-medium">
            Chronological real-time stream of field actions across all teams
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {(['ALL', 'STATUS', 'EVIDENCE', 'URGENT'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === mode
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-brand-50 hover:bg-brand-100 dark:bg-[#221C3E] dark:hover:bg-brand-900 text-[#2B244D] dark:text-brand-100'
              }`}
            >
              {mode === 'ALL' ? 'All Events' : mode === 'STATUS' ? 'State Changes' : mode === 'EVIDENCE' ? 'Proof Uploads' : 'Blockers & Rework'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#524D6B] dark:text-brand-200">Loading live audit stream...</span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-12 text-center text-xs font-medium text-[#524D6B] dark:text-brand-200">
          No recorded activity matching selected filter.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200 dark:before:bg-brand-800">
          {filteredActivities.map((act) => (
            <div key={act._id} className="relative flex items-start space-x-4 group">
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-600 ring-4 ring-white dark:ring-[#18132B] group-hover:scale-125 transition" />

              <div className="flex-1 bg-brand-50/50 dark:bg-[#221C3E] rounded-2xl p-4 border border-brand-100 dark:border-brand-800/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-[#1A162E] dark:text-white">
                      {act.actorId?.name || 'Operations Lead'}
                    </span>
                    {getActionBadge(act.action, act.newValue)}
                  </div>
                  <span className="text-xs font-semibold text-[#524D6B] dark:text-brand-200 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>

                {act.taskId && (
                  <button
                    type="button"
                    onClick={() => onSelectTask && onSelectTask(act.taskId._id)}
                    className="mt-2 text-left text-xs font-bold text-brand-600 dark:text-brand-300 hover:underline block truncate max-w-lg"
                  >
                    Task: {act.taskId.title}
                    {act.taskId.zone ? ` (${act.taskId.zone})` : ''}
                  </button>
                )}

                {act.reason && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium italic bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    &ldquo;{act.reason}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

