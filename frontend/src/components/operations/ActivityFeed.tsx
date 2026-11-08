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
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span>BLOCKED</span>
        </span>
      );
    }
    if (newValue === 'REWORK_REQUIRED' || action === 'EVIDENCE_REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
          <Flame className="w-3 h-3 text-amber-500" />
          <span>REWORK REQUIRED</span>
        </span>
      );
    }
    if (newValue === 'COMPLETED' || action === 'EVIDENCE_APPROVED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>APPROVED / COMPLETED</span>
        </span>
      );
    }
    if (action.startsWith('EVIDENCE_')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
          <ImageIcon className="w-3 h-3 text-blue-500" />
          <span>PROOF SUBMITTED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <span>{action.replace('_', ' ')}</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Live Operations Audit Trail
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {mode === 'ALL' ? 'All Events' : mode === 'STATUS' ? 'State Changes' : mode === 'EVIDENCE' ? 'Proof Uploads' : 'Blockers & Rework'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Loading live audit stream...</span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-12 text-center text-xs font-medium text-slate-400">
          No recorded activity matching selected filter.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredActivities.map((act) => (
            <div key={act._id} className="relative flex items-start space-x-4 group">
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition" />

              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {act.actorId?.name || 'Operations Lead'}
                    </span>
                    {getActionBadge(act.action, act.newValue)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>

                {act.taskId && (
                  <button
                    type="button"
                    onClick={() => onSelectTask && onSelectTask(act.taskId._id)}
                    className="mt-2 text-left text-xs font-bold text-blue-600 hover:underline block truncate max-w-lg"
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

