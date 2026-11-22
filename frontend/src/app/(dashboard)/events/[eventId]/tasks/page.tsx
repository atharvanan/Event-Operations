'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../../lib/api';
import { TaskCard } from '../../../../../components/tasks/TaskCard';
import { TaskDetailModal } from '../../../../../components/tasks/TaskDetailModal';
import { CreateTaskModal } from '../../../../../components/tasks/CreateTaskModal';
import { ITask, ITeam, TaskStatus, TaskPriority } from '@shared/types';
import {
  KanbanSquare,
  ListFilter,
  Plus,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { t } = useTranslation();
  const params = useParams();
  const eventId = params.eventId as string;

  const [tasks, setTasks] = useState<ITask[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qTeam = new URLSearchParams(window.location.search).get('teamId');
      if (qTeam) setSelectedTeamId(qTeam);
    }
  }, []);

  // Modals
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForParent, setCreateForParent] = useState<ITask | null>(null);

  const fetchTasksAndTeams = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, teamsRes] = await Promise.all([
        api.get(`/events/${eventId}/tasks`),
        api.get(`/events/${eventId}/teams`),
      ]);
      setTasks(tasksRes.data.data);
      setTeams(teamsRes.data.data);
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchTasksAndTeams();
    }
  }, [eventId]);

  // Client-side filtering
  const filteredTasks = tasks.filter((task) => {
    if (selectedTeamId && task.teamId !== selectedTeamId) return false;
    if (selectedStatus && task.status !== selectedStatus) return false;
    if (selectedPriority && task.priority !== selectedPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchZone = task.zone?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchZone) return false;
    }
    return true;
  });

  // Kanban Columns
  const kanbanColumns: {
    id: string;
    title: string;
    statuses: TaskStatus[];
    color: string;
    count: number;
  }[] = [
    {
      id: 'todo',
      title: 'To Do',
      statuses: [TaskStatus.TO_DO],
      color: 'border-slate-300 bg-slate-50 dark:bg-slate-800/40',
      count: filteredTasks.filter((t) => t.status === TaskStatus.TO_DO).length,
    },
    {
      id: 'progress',
      title: 'In Progress / Active',
      statuses: [TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS],
      color: 'border-blue-300 bg-blue-50/30 dark:bg-blue-950/20',
      count: filteredTasks.filter(
        (t) => t.status === TaskStatus.ACKNOWLEDGED || t.status === TaskStatus.IN_PROGRESS
      ).length,
    },
    {
      id: 'blocked',
      title: 'Blocked / Escalated',
      statuses: [TaskStatus.BLOCKED],
      color: 'border-red-300 bg-red-50/30 dark:bg-red-950/20',
      count: filteredTasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
    },
    {
      id: 'review',
      title: 'Review / Rework',
      statuses: [TaskStatus.SUBMITTED_FOR_REVIEW, TaskStatus.REWORK_REQUIRED],
      color: 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20',
      count: filteredTasks.filter(
        (t) =>
          t.status === TaskStatus.SUBMITTED_FOR_REVIEW || t.status === TaskStatus.REWORK_REQUIRED
      ).length,
    },
    {
      id: 'completed',
      title: 'Completed & Verified',
      statuses: [TaskStatus.COMPLETED],
      color: 'border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20',
      count: filteredTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    },
  ];

  return (
    <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                <Link href={`/events/${eventId}`} className="hover:text-brand-700 dark:hover:text-brand-300">
                  Event Workspace
                </Link>
                <span>/</span>
                <span>Task Board</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('tasks.title')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Live task progression, microtask delegation, and evidence review chain
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-white dark:bg-[#18132B] p-1 rounded-2xl border border-brand-200 dark:border-brand-800 shadow-card">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  aria-label="Kanban Board view"
                  aria-pressed={viewMode === 'kanban'}
                  className={`p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <KanbanSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'list'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateForParent(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('tasks.create_task')}</span>
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-[#18132B] p-4 rounded-3xl border border-brand-200/70 dark:border-brand-800 shadow-card flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-brand-600 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, descriptions, or zones..."
                aria-label="Search event tasks"
                className="w-full pl-10 pr-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] text-slate-900 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                aria-label="Filter by team"
                className="w-full sm:w-44 px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="">All Teams</option>
                {teams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                aria-label="Filter by priority"
                className="w-full sm:w-40 px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="">All Priorities</option>
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
                <option value={TaskPriority.CRITICAL}>Critical</option>
              </select>
            </div>
          </div>

          {viewMode === 'kanban' && (
            <div className="flex gap-4 items-start overflow-x-auto pb-4 pt-1">
              {kanbanColumns.map((col) => {
                const columnTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));
                return (
                  <div
                    key={col.id}
                    className={`rounded-3xl border p-3.5 flex flex-col w-[280px] min-w-[270px] shrink-0 xl:flex-1 h-[calc(100vh-270px)] min-h-[460px] max-h-[780px] ${col.color}`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                      <h2 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        {col.title}
                      </h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs">
                        {col.count}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {columnTasks.length === 0 ? (
                        <div className="h-32 border-2 border-dashed border-brand-200 dark:border-brand-800 rounded-2xl flex items-center justify-center text-xs text-slate-500 font-medium">
                          No tasks
                        </div>
                      ) : (
                        columnTasks.map((tItem) => (
                          <TaskCard
                            key={tItem._id}
                            task={tItem}
                            onClick={(t) => setSelectedTask(t)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 shadow-card divide-y divide-brand-100 dark:divide-brand-800 overflow-hidden">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-600 dark:text-slate-300">
                  No tasks matching your current filters.
                </div>
              ) : (
                filteredTasks.map((tItem) => (
                  <button
                    key={tItem._id}
                    type="button"
                    onClick={() => setSelectedTask(tItem)}
                    className="w-full text-left p-4 hover:bg-canvas dark:hover:bg-[#221A40] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-pastel-purple text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                          {tItem.priority}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tItem.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{tItem.description}</p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs shrink-0">
                      <span className="text-slate-600 dark:text-slate-300">
                        {tItem.assignee ? tItem.assignee.name : 'Unassigned'}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {t(`tasks.status.${tItem.status}`)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(tItem.dueTime).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask._id}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            fetchTasksAndTeams();
          }}
          onOpenCreateMicrotask={(parent) => {
            setSelectedTask(null);
            setCreateForParent(parent);
            setShowCreateModal(true);
          }}
        />
      )}

      {showCreateModal && (
        <CreateTaskModal
          eventId={eventId}
          parentTask={createForParent}
          teams={teams}
          allTasks={tasks}
          onClose={() => {
            setShowCreateModal(false);
            setCreateForParent(null);
          }}
          onCreated={() => {
            fetchTasksAndTeams();
          }}
        />
      )}
    </div>
  );
}

