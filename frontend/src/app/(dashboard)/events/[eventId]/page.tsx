'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api';
import { Navbar } from '../../../../components/layout/Navbar';
import { Sidebar } from '../../../../components/layout/Sidebar';
import { BottomNav } from '../../../../components/layout/BottomNav';
import { TeamCard } from '../../../../components/teams/TeamCard';
import { TaskCard } from '../../../../components/tasks/TaskCard';
import { TaskDetailModal } from '../../../../components/tasks/TaskDetailModal';
import { CreateTaskModal } from '../../../../components/tasks/CreateTaskModal';
import { CreateTeamModal } from '../../../../components/teams/CreateTeamModal';
import { ActivityFeed } from '../../../../components/operations/ActivityFeed';
import { WorkloadMatrix } from '../../../../components/operations/WorkloadMatrix';
import { TimelineView } from '../../../../components/operations/TimelineView';
import { EventSettingsModal } from '../../../../components/operations/EventSettingsModal';
import { IEvent, ITeam, ITask, IEventPermissions } from '@shared/types';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Plus,
  Users,
  KanbanSquare,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function EventDashboardPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user, currentRole, setCurrentEvent } = useAuth();

  const [eventData, setEventData] = useState<IEvent | null>(null);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<ITask[]>([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    blockedTasks: 0,
    urgentTasks: 0,
    readinessPercentage: 0,
  });
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITY' | 'WORKLOAD' | 'TIMELINE'>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEventSettings, setShowEventSettings] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [eventRes, teamsRes, tasksRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/teams`),
        api.get(`/events/${eventId}/tasks?isUrgent=true`),
      ]);

      const ev = eventRes.data.data.event;
      setEventData(ev);
      setCurrentEvent(ev, eventRes.data.data.userRole);
      setMetrics(eventRes.data.data.metrics);
      setTeams(teamsRes.data.data);
      setUrgentTasks(tasksRes.data.data);
    } catch (err) {
      console.error('Error fetching event dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchDashboardData();
    }
  }, [eventId]);

  const isManager = eventData?.managerId === user?._id || currentRole === 'EVENT_MANAGER';

  if (isLoading || !eventData) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500">Loading operations command center...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="flex-1 flex pb-16 md:pb-0">
        <Sidebar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {eventData.type}
                </span>
                <span className="text-xs font-bold text-slate-400 capitalize">
                  {eventData.status.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {eventData.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center">
                <span>{eventData.venue}</span>
                <span className="mx-2">•</span>
                <span>{new Date(eventData.startDate).toLocaleDateString()}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => router.push(`/events/${eventId}/day-mode`)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Flame className="w-4 h-4" />
                <span>Launch Day Mode</span>
              </button>

              {isManager && (
                <button
                  type="button"
                  onClick={() => setShowEventSettings(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition"
                  title="Configure Event Permissions"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Permissions</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCreateTask(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Task</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateTeam(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
              >
                <Users className="w-4 h-4" />
                <span>Add Team</span>
              </button>
            </div>
          </div>

          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Readiness</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {metrics.readinessPercentage}%
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${metrics.readinessPercentage}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Tasks</span>
                <KanbanSquare className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {metrics.completedTasks} / {metrics.totalTasks}
              </div>
              <span className="text-[11px] text-slate-500 block mt-2 font-medium">
                {metrics.totalTasks - metrics.completedTasks} pending outcomes
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Urgent Queue</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {metrics.urgentTasks}
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-2 font-medium">
                Critical priority items
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">Blocked Work</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {metrics.blockedTasks}
              </div>
              <span className="text-[11px] text-red-600 dark:text-red-400 block mt-2 font-medium">
                Requires immediate resolution
              </span>
            </div>
          </div>

          {/* Navigation Tabs for Command Center */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                activeTab === 'OVERVIEW'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <KanbanSquare className="w-4 h-4" />
              <span>Overview & Teams</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIVITY')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                activeTab === 'ACTIVITY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Audit Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WORKLOAD')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                activeTab === 'WORKLOAD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Workload & Capacity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TIMELINE')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                activeTab === 'TIMELINE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Timeline Schedule</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
              {/* Urgent & Critical Queue */}
              {urgentTasks.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t('tasks.urgent_queue')}
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900">
                      {urgentTasks.length} Escalated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {urgentTasks.map((tItem) => (
                      <TaskCard
                        key={tItem._id}
                        task={tItem}
                        onClick={(t) => setSelectedTask(t)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Operational Teams Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Operational Teams & Readiness
                    </h2>
                    <p className="text-xs text-slate-500">
                      Work breakdown, lead oversight, and proof verification across venue zones
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/events/${eventId}/teams`)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <span>View All Teams</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">No Teams Added</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Create teams for Catering, Stage Decor, Sound & Lights, and Camera Crew.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateTeam(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Add Team
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((tm) => (
                      <TeamCard
                        key={tm._id}
                        team={tm}
                        onClick={() => router.push(`/events/${eventId}/tasks?teamId=${tm._id}`)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: LIVE AUDIT FEED */}
          {activeTab === 'ACTIVITY' && (
            <ActivityFeed
              eventId={eventId}
              onSelectTask={async (tId) => {
                try {
                  const res = await api.get(`/tasks/${tId}`);
                  if (res.data?.success) setSelectedTask(res.data.data.task);
                } catch (e) {}
              }}
            />
          )}

          {/* TAB 3: WORKLOAD & CAPACITY */}
          {activeTab === 'WORKLOAD' && (
            <WorkloadMatrix
              eventId={eventId}
              onSelectTeam={(tId) => router.push(`/events/${eventId}/tasks?teamId=${tId}`)}
            />
          )}

          {/* TAB 4: TIMELINE SCHEDULE */}
          {activeTab === 'TIMELINE' && (
            <TimelineView
              eventId={eventId}
              onSelectTask={(task) => setSelectedTask(task)}
            />
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
            fetchDashboardData();
          }}
          onOpenCreateMicrotask={(parent) => {
            setSelectedTask(null);
            setShowCreateTask(true);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          eventId={eventId}
          teams={teams}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => {
            fetchDashboardData();
          }}
        />
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <CreateTeamModal
          eventId={eventId}
          onClose={() => setShowCreateTeam(false)}
          onCreated={() => {
            fetchDashboardData();
          }}
        />
      )}

      {/* Event Settings Modal */}
      {showEventSettings && eventData && (
        <EventSettingsModal
          eventId={eventId}
          initialPermissions={eventData.permissions}
          onClose={() => setShowEventSettings(false)}
          onSaved={(newPerms) => {
            setEventData((prev) => (prev ? { ...prev, permissions: newPerms } : null));
          }}
        />
      )}
    </div>
  );
}
