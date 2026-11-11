'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { formatFriendlyDate } from '../../../lib/eventVisuals';
import { getPendingActions, queueOfflineAction } from '../../../lib/offlineQueue';
import { TaskDetailModal } from '../../../components/tasks/TaskDetailModal';
import { IEvent, ITask, TaskStatus } from '@shared/types';
import {
  CheckSquare,
  Check,
  Search,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  Camera,
  ArrowUpRight,
} from 'lucide-react';

export default function GlobalTasksPage() {
  const { t } = useTranslation();

  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const syncPendingTaskQueue = useCallback(async () => {
    const actions = await getPendingActions();
    const ids = new Set<string>();
    actions.forEach((a) => {
      if (a.type === 'TASK_STATUS_UPDATE' && a.endpoint) {
        const match = a.endpoint.match(/\/tasks\/([a-f0-9]+)\/status/i);
        if (match?.[1]) ids.add(match[1]);
      }
    });
    setPendingTaskIds(ids);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        api.get(`/dashboard/tasks?scope=${scope}`),
        api.get('/events'),
      ]);
      setTasks(tasksRes.data?.data || []);
      setEvents(eventsRes.data?.data || []);
    } catch {
      // Preserve loaded list when offline
    } finally {
      setLoading(false);
    }
    await syncPendingTaskQueue();
  }, [scope, syncPendingTaskQueue]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handler = () => syncPendingTaskQueue();
    window.addEventListener('offline-queue-changed', handler);
    return () => window.removeEventListener('offline-queue-changed', handler);
  }, [syncPendingTaskQueue]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      const evId = typeof task.eventId === 'object' ? task.eventId?._id : task.eventId;
      if (eventFilter && evId !== eventFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const evName = typeof task.eventId === 'object' ? task.eventId?.name || '' : '';
        return (
          task.title?.toLowerCase().includes(q) ||
          task.zone?.toLowerCase().includes(q) ||
          evName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tasks, eventFilter, statusFilter, searchQuery]);

  const completedCount = filteredTasks.filter((tk) => tk.status === TaskStatus.COMPLETED).length;
  const progressPct =
    filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 0;

  const handleToggleComplete = async (task: ITask) => {
    setFeedback('');
    const nextStatus =
      task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED;

    try {
      await api.patch(`/tasks/${task._id}/status`, {
        status: nextStatus,
        expectedUpdatedAt: task.updatedAt,
      });
      await loadTasks();
    } catch (err: any) {
      if (!err.response || !navigator.onLine) {
        await queueOfflineAction({
          type: 'TASK_STATUS_UPDATE',
          endpoint: `/tasks/${task._id}/status`,
          method: 'PATCH',
          payload: { status: nextStatus, expectedUpdatedAt: task.updatedAt },
          label: `Task "${task.title}" -> ${nextStatus}`,
        });
        setTasks((prev) =>
          prev.map((item) => (item._id === task._id ? { ...item, status: nextStatus } : item))
        );
        await syncPendingTaskQueue();
        setFeedback('Saved offline as Pending Sync until connected.');
      } else {
        setFeedback(err.response?.data?.message || 'Open task details to upload proof before completing.');
        setSelectedTaskId(task._id);
      }
    }
  };

  const priorityBadgeClass = (priority: string) => {
    if (priority === 'CRITICAL' || priority === 'URGENT') {
      return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800';
    }
    if (priority === 'HIGH') {
      return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800';
    }
    return 'bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('nav.tasks')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Track assigned responsibilities, field checklists, and proof submissions across events.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Task ownership scope"
          className="inline-flex self-start rounded-2xl bg-white dark:bg-[#18132B] p-1 border border-brand-200/80 dark:border-brand-800 shadow-card"
        >
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'all'}
            onClick={() => setScope('all')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              scope === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/40'
            }`}
          >
            All Tasks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'mine'}
            onClick={() => setScope('mine')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              scope === 'mine'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/40'
            }`}
          >
            My Tasks
          </button>
        </div>
      </div>

      {/* Filters & Completion Progress */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task title, zone, or event..."
              aria-label="Search tasks"
              className="w-full pl-10 pr-4 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            aria-label="Filter tasks by event"
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
            aria-label="Filter tasks by status"
            className="w-full px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="TO_DO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SUBMITTED_FOR_REVIEW">Submitted for Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            <span>Checklist Completion</span>
            <span>
              {completedCount} of {filteredTasks.length} completed ({progressPct}%)
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Overall task checklist completion"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2.5 rounded-full bg-brand-100 dark:bg-[#221A40] overflow-hidden"
          >
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center space-x-2 text-sm text-amber-900 dark:text-amber-200 font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-24 rounded-3xl bg-white dark:bg-[#18132B] border border-brand-100 dark:border-brand-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-[#18132B] rounded-3xl p-10 text-center border border-brand-200/70 dark:border-brand-800/70 shadow-card">
          <CheckSquare className="w-10 h-10 text-brand-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No matching tasks found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-5">
            Try switching to All Tasks or open an event workspace to add checklist items.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm"
          >
            <span>Browse Events</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Operational tasks list">
          {filteredTasks.map((task: any) => {
            const isDone = task.status === TaskStatus.COMPLETED;
            const isPendingSync = pendingTaskIds.has(task._id);
            const evObj = typeof task.eventId === 'object' ? task.eventId : null;
            const evId = evObj?._id || task.eventId;
            const teamObj = typeof task.teamId === 'object' ? task.teamId : null;

            return (
              <li
                key={task._id}
                className="bg-white dark:bg-[#18132B] rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    aria-label={isDone ? `Reopen ${task.title}` : `Mark ${task.title} as completed`}
                    aria-pressed={isDone}
                    className={`mt-0.5 w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white dark:bg-[#221A40] border-brand-300 dark:border-brand-700 text-transparent hover:border-brand-500'
                    }`}
                  >
                    <Check className="w-5 h-5" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task._id)}
                        className={`text-left text-base font-bold hover:text-brand-700 dark:hover:text-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded ${
                          isDone
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </button>

                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityBadgeClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>

                      {isPendingSync && (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          <span>Pending Sync</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {evObj?.name && (
                        <span className="inline-flex items-center space-x-1 font-semibold text-brand-700 dark:text-brand-300">
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{evObj.name}</span>
                        </span>
                      )}
                      {teamObj?.name && (
                        <span className="inline-flex items-center space-x-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: teamObj.colorHex || '#5C44CC' }}
                            aria-hidden="true"
                          />
                          <span>{teamObj.name}</span>
                        </span>
                      )}
                      {task.zone && (
                        <span className="inline-flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          <span>{task.zone}</span>
                        </span>
                      )}
                      {task.dueTime && (
                        <span>Due {formatFriendlyDate(task.dueTime)}</span>
                      )}
                      {task.requiresEvidence && (
                        <span className="inline-flex items-center space-x-1 text-amber-800 dark:text-amber-300 font-semibold">
                          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Photo Proof</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task._id)}
                    className="px-4 py-2 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] hover:bg-brand-50 text-xs font-bold text-slate-800 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    Details
                  </button>
                  {evId && (
                    <Link
                      href={`/events/${evId}/tasks`}
                      className="inline-flex items-center space-x-1 px-4 py-2 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span>Workspace</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            loadTasks();
          }}
        />
      )}
    </div>
  );
}

