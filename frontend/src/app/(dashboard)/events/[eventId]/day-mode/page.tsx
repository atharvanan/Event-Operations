'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api';
import { queueOfflineAction } from '../../../../../lib/offlineQueue';
import { useSocket } from '../../../../../hooks/useSocket';
import { IEvent, ITask, TaskStatus, TaskPriority } from '@shared/types';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  Play,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  Mic,
  Wifi,
  WifiOff,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { EvidenceUploader } from '../../../../../components/evidence/EvidenceUploader';
import { VoiceRecorder } from '../../../../../components/chat/VoiceRecorder';

export default function EventDayModePage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user, currentRole } = useAuth();
  const { socket } = useSocket();

  const [eventData, setEventData] = useState<IEvent | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [filter, setFilter] = useState<'MY_TASKS' | 'URGENT' | 'ALL'>('MY_TASKS');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Time remaining to event
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Action states
  const [activeUploadTask, setActiveUploadTask] = useState<ITask | null>(null);
  const [blockerModalTask, setBlockerModalTask] = useState<ITask | null>(null);
  const [blockerReason, setBlockerReason] = useState<string>('');
  const [showQuickVoice, setShowQuickVoice] = useState<boolean>(false);

  const fetchDayData = async () => {
    try {
      setIsLoading(true);
      const [evRes, tasksRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/tasks`),
      ]);

      if (evRes.data?.success) setEventData(evRes.data.data.event);
      if (tasksRes.data?.success) setTasks(tasksRes.data.data);
    } catch (err) {
      console.error('Error fetching day-mode data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchDayData();

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOn = () => setIsOnline(true);
      const onOff = () => setIsOnline(false);
      window.addEventListener('online', onOn);
      window.addEventListener('offline', onOff);
      return () => {
        window.removeEventListener('online', onOn);
        window.removeEventListener('offline', onOff);
      };
    }
  }, [eventId]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handleTaskUpdated = (updatedTask: ITask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    };
    socket.on('task:updated', handleTaskUpdated);
    return () => {
      socket.off('task:updated', handleTaskUpdated);
    };
  }, [socket]);

  // Countdown timer
  useEffect(() => {
    if (!eventData?.startDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(eventData.startDate).getTime();
      const diff = Math.max(0, target - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [eventData]);

  // Quick Action Handler (with offline queue fallback)
  const handleStatusTransition = async (taskId: string, newStatus: TaskStatus, reason?: string) => {
    try {
      if (!isOnline) {
        // Queue in IndexedDB
        await queueOfflineAction({
          type: 'TASK_STATUS_UPDATE',
          endpoint: `/tasks/${taskId}/status`,
          method: 'PATCH',
          payload: { status: newStatus, reason },
        });

        // Optimistically update local UI state
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
        return;
      }

      const res = await api.patch(`/tasks/${taskId}/status`, {
        status: newStatus,
        reason,
      });

      if (res.data?.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? res.data.data : t))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating task status');
    }
  };

  const isManager = currentRole === 'EVENT_MANAGER' || eventData?.managerId === user?._id;

  const myTasks = tasks.filter(
    (t) => t.assigneeId === user?._id || (!t.assigneeId && isManager)
  );

  const urgentTasks = tasks.filter(
    (t) =>
      t.status === TaskStatus.BLOCKED ||
      t.status === TaskStatus.REWORK_REQUIRED ||
      t.priority === TaskPriority.CRITICAL ||
      t.priority === TaskPriority.URGENT ||
      t.isUrgentEscalated
  );

  const displayedTasks =
    filter === 'MY_TASKS'
      ? (myTasks.length > 0 ? myTasks : tasks)
      : filter === 'URGENT'
      ? urgentTasks
      : tasks;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* High-Contrast Outdoors Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b-2 border-amber-500 px-4 py-3 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/events/${eventId}`)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-extrabold text-xs rounded-xl border border-slate-700 active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Command Center</span>
          </button>

          {/* Milestone Ticker */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/40">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black tracking-widest text-amber-300 font-mono">
              {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
              {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>

          {/* Connection Status */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${
              isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOnline ? 'Live Sync' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28">
        {/* Urgent & Blockers Alert Bar */}
        {urgentTasks.length > 0 && (
          <div className="bg-red-950/90 border-2 border-red-500 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-red-100 uppercase tracking-wide">
                  {urgentTasks.length} Urgent Blocker{urgentTasks.length === 1 ? '' : 's'} on Venue Floor
                </h2>
                <p className="text-xs text-red-300 font-bold">
                  Immediate attention required before ceremony commencement
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilter('URGENT')}
              className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl tracking-wider uppercase active:scale-95 transition text-center shadow-lg shadow-red-900/50"
            >
              Focus Blockers
            </button>
          </div>
        )}

        {/* Large Ergonomic Filter Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('MY_TASKS')}
            className={`py-3.5 text-xs sm:text-sm font-black rounded-xl transition ${
              filter === 'MY_TASKS'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Station ({myTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('URGENT')}
            className={`py-3.5 text-xs sm:text-sm font-black rounded-xl transition ${
              filter === 'URGENT'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Urgent ({urgentTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`py-3.5 text-xs sm:text-sm font-black rounded-xl transition ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Ops ({tasks.length})
          </button>
        </div>

        {/* Rapid Task Cards List */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Loading high-contrast field cards...
            </p>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-8 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-black text-white uppercase">All Tasks Resolved</h3>
            <p className="text-xs text-slate-400 font-medium">
              No active tasks found in this queue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTasks.map((task) => (
              <div
                key={task._id}
                className={`rounded-3xl p-5 sm:p-6 border-2 transition shadow-xl space-y-4 ${
                  task.status === TaskStatus.BLOCKED
                    ? 'bg-red-950/40 border-red-500'
                    : task.status === TaskStatus.REWORK_REQUIRED
                    ? 'bg-amber-950/40 border-amber-500'
                    : task.status === TaskStatus.COMPLETED
                    ? 'bg-slate-900/50 border-emerald-500/50 opacity-70'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                {/* Header Strip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg ${
                        task.status === TaskStatus.COMPLETED
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : task.status === TaskStatus.BLOCKED
                          ? 'bg-red-500 text-white'
                          : task.status === TaskStatus.IN_PROGRESS
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>

                    {task.isUrgentEscalated && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white uppercase tracking-wider">
                        <Flame className="w-3 h-3" />
                        <span>Escalated</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-amber-400 font-mono">
                    Due: {new Date(task.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title & Zone */}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {task.description}
                    </p>
                  )}
                  {task.zone && (
                    <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-bold mt-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{task.zone}</span>
                    </div>
                  )}
                </div>

                {/* Rework Reason if rejected */}
                {task.status === TaskStatus.REWORK_REQUIRED && task.reworkReason && (
                  <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500 text-xs font-bold text-amber-200">
                    <span className="block uppercase text-[10px] tracking-wider text-amber-400 mb-0.5">
                      ⚠️ Lead Rework Instructions:
                    </span>
                    {task.reworkReason}
                  </div>
                )}

                {/* Single-Hand Large Touch Targets (Minimum 52px high) */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.status === TaskStatus.TO_DO && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition(task._id, TaskStatus.ACKNOWLEDGED)}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>ACKNOWLEDGE TASK</span>
                    </button>
                  )}

                  {task.status === TaskStatus.ACKNOWLEDGED && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition(task._id, TaskStatus.IN_PROGRESS)}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>COMMENCE WORK</span>
                    </button>
                  )}

                  {(task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK_REQUIRED) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveUploadTask(task)}
                        className="w-full h-14 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-sm font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/30 transition"
                      >
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        <span>UPLOAD PROOF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBlockerModalTask(task);
                          setBlockerReason('');
                        }}
                        className="w-full h-14 bg-slate-800 hover:bg-slate-700 active:scale-95 text-red-400 text-sm font-black rounded-2xl flex items-center justify-center space-x-2 border border-slate-700 transition"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <span>REPORT BLOCKER</span>
                      </button>
                    </>
                  )}

                  {task.status === TaskStatus.BLOCKED && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition(task._id, TaskStatus.IN_PROGRESS, 'Blocker resolved on field')}
                      className="w-full h-14 col-span-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>MARK BLOCKER RESOLVED</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Push-to-Talk / Voice SOS Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setShowQuickVoice(!showQuickVoice)}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-2xl active:scale-90 transition transform"
          title="Field Voice Broadcast"
        >
          <Mic className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Blocker Modal */}
      {blockerModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-red-500 w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>Report Station Blocker</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Explain why {blockerModalTask.title} cannot proceed so the command center can intervene immediately.
            </p>
            <textarea
              rows={3}
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="e.g. Generator tripped, missing HDMI cable, stage decor delayed"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-bold"
            />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBlockerModalTask(null)}
                className="py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!blockerReason.trim()) return alert('Please enter a reason');
                  handleStatusTransition(blockerModalTask._id, TaskStatus.BLOCKED, blockerReason);
                  setBlockerModalTask(null);
                }}
                className="py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30"
              >
                Submit Blocker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Upload Modal */}
      {activeUploadTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-lg rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Upload Verification Proof
              </h3>
              <button
                type="button"
                onClick={() => setActiveUploadTask(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <EvidenceUploader
              taskId={activeUploadTask._id}
              onUploaded={() => {
                setActiveUploadTask(null);
                fetchDayData();
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Voice Broadcast Drawer */}
      {showQuickVoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Field Voice Note</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickVoice(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Record a quick audio message to broadcast on the team operational channel.
            </p>

            <VoiceRecorder
              onRecorded={(audioBlob, durationSec) => {
                setShowQuickVoice(false);
                alert(`Voice note recorded (${durationSec}s). Sent to operational chat!`);
              }}
              onCancel={() => setShowQuickVoice(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
