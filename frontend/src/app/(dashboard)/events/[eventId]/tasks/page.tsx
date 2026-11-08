'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../../lib/api';
import { Navbar } from '../../../../../components/layout/Navbar';
import { Sidebar } from '../../../../../components/layout/Sidebar';
import { BottomNav } from '../../../../../components/layout/BottomNav';
import { TaskCard } from '../../../../../components/tasks/TaskCard';
import { TaskDetailModal } from '../../../../../components/tasks/TaskDetailModal';
import { CreateTaskModal } from '../../../../../components/tasks/CreateTaskModal';
import { ITask, ITeam, TaskStatus, TaskPriority } from '@shared/types';
import {
  KanbanSquare,
  ListFilter,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function TasksPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const initialTeamId = searchParams.get('teamId') || '';

  const [tasks, setTasks] = useState<ITask[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeamId);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="flex-1 flex pb-16 md:pb-0">
        <Sidebar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('tasks.title')}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Live task progression, microtask delegation, and evidence review chain
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Kanban Board"
                >
                  <KanbanSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List View"
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
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('tasks.create_task')}</span>
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, descriptions, or zones..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
              />
            </div>

            {/* Team Filter */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full sm:w-44 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="">All Teams</option>
                {teams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full sm:w-36 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300"
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

          {/* Kanban Board View */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
              {kanbanColumns.map((col) => {
                const columnTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));
                return (
                  <div
                    key={col.id}
                    className={`rounded-2xl border p-3 flex flex-col min-w-[260px] ${col.color}`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {col.title}
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm">
                        {col.count}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 min-h-[300px]">
                      {columnTasks.length === 0 ? (
                        <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-center text-[11px] text-slate-400 font-medium">
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

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No tasks matching your current filters.
                </div>
              ) : (
                filteredTasks.map((tItem) => (
                  <div
                    key={tItem._id}
                    onClick={() => setSelectedTask(tItem)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {tItem.priority}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tItem.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{tItem.description}</p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-slate-500">
                        {tItem.assignee ? tItem.assignee.name : 'Unassigned'}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {t(`tasks.status.${tItem.status}`)}
                      </span>
                      <span className="text-slate-400">
                        {new Date(tItem.dueTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      <BottomNav />

      {/* Task Detail Modal */}
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

      {/* Create Task / Microtask Modal */}
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

