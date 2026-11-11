'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import api, { openProtectedFile } from '../../../../lib/api';
import {
  getEventCoverSrc,
  getCountdownBadge,
  formatFriendlyDate,
  formatShortDueDate,
} from '../../../../lib/eventVisuals';
import { getPendingActions, queueOfflineAction } from '../../../../lib/offlineQueue';
import { Modal } from '../../../../components/common/Modal';
import { TeamCard } from '../../../../components/teams/TeamCard';
import { CreateTeamModal } from '../../../../components/teams/CreateTeamModal';
import { CreateTaskModal } from '../../../../components/tasks/CreateTaskModal';
import { TaskDetailModal } from '../../../../components/tasks/TaskDetailModal';
import { InviteMemberModal } from '../../../../components/events/InviteMemberModal';
import { QrTicketModal } from '@/components/events/QrTicketModal';
import { EventSettingsModal } from '../../../../components/operations/EventSettingsModal';
import { WorkloadMatrix } from '../../../../components/operations/WorkloadMatrix';
import { TimelineView } from '../../../../components/operations/TimelineView';
import { ActivityFeed } from '../../../../components/operations/ActivityFeed';
import { EvidenceLightbox } from '../../../../components/evidence/EvidenceLightbox';
import {
  IEvent,
  ITeam,
  ITask,
  IAttendee,
  IEventResource,
  TaskStatus,
  EvidenceReviewStatus,
} from '@shared/types';
import {
  ArrowLeft,
  MoreVertical,
  Home,
  CheckSquare,
  Square,
  Users,
  UserCheck,
  FolderOpen,
  Calendar,
  MapPin,
  Plus,
  QrCode,
  MessageSquare,
  Flame,
  Settings,
  Edit3,
  ChevronRight,
  Clock,
  Ticket,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  UserPlus,
  Layers,
  Eye,
  RotateCcw,
} from 'lucide-react';

type WorkspaceTab = 'overview' | 'tasks' | 'attendees' | 'team' | 'files';

export default function EventWorkspacePage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user, currentRole, setCurrentEvent } = useAuth();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [eventData, setEventData] = useState<IEvent | null>(null);
  const [metrics, setMetrics] = useState<any>({
    totalTasks: 0,
    completedTasks: 0,
    blockedTasks: 0,
    urgentTasks: 0,
    readinessPercentage: 0,
    registeredCount: 0,
    checkedInCount: 0,
  });

  const [tasks, setTasks] = useState<ITask[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [attendees, setAttendees] = useState<IAttendee[]>([]);
  const [resources, setResources] = useState<IEventResource[]>([]);
  const [evidenceInbox, setEvidenceInbox] = useState<any[]>([]);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sub-modals & actions
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [microtaskParent, setMicrotaskParent] = useState<ITask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showRegisterAttendee, setShowRegisterAttendee] = useState(false);
  const [showUploadResource, setShowUploadResource] = useState(false);
  const [qrAttendee, setQrAttendee] = useState<IAttendee | null>(null);
  const [lightboxEvidence, setLightboxEvidence] = useState<any | null>(null);
  const [showOpsAnalytics, setShowOpsAnalytics] = useState(false);

  // Filters & feedback
  const [taskSearch, setTaskSearch] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [feedback, setFeedback] = useState('');

  // Quick register attendee form
  const [attName, setAttName] = useState('');
  const [attEmail, setAttEmail] = useState('');
  const [attTicketType, setAttTicketType] = useState<'General' | 'VIP' | 'Speaker' | 'Staff'>('General');
  const [attSubmitting, setAttSubmitting] = useState(false);

  // Resource upload form
  const [resTitle, setResTitle] = useState('');
  const [resCategory, setResCategory] = useState('Floor Plan');
  const [resFile, setResFile] = useState<File | null>(null);
  const [resUploading, setResUploading] = useState(false);

  // Edit event form
  const [editName, setEditName] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editStatus, setEditStatus] = useState('planning');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qTab = new URLSearchParams(window.location.search).get('tab');
      if (qTab && ['overview', 'tasks', 'attendees', 'team', 'files'].includes(qTab)) {
        setActiveTab(qTab as WorkspaceTab);
      }
    }
  }, []);

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const syncPendingActions = useCallback(async () => {
    const actions = await getPendingActions();
    const tSet = new Set<string>();
    actions.forEach((a) => {
      const m = a.endpoint.match(/\/tasks\/([^/]+)\//);
      if (m?.[1]) tSet.add(m[1]);
    });
    setPendingTaskIds(tSet);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evRes, teamsRes, tasksRes, attRes, resRes, inboxRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/teams`),
        api.get(`/events/${eventId}/tasks`),
        api.get(`/events/${eventId}/attendees`).catch(() => ({ data: { data: { attendees: [] } } })),
        api.get(`/events/${eventId}/resources`).catch(() => ({ data: { data: { resources: [] } } })),
        api.get(`/events/${eventId}/evidence/inbox`).catch(() => ({ data: { data: [] } })),
      ]);

      const ev = evRes.data?.data?.event;
      const role = evRes.data?.data?.userRole;
      setEventData(ev);
      setCurrentEvent(ev, role);
      setMetrics(evRes.data?.data?.metrics || {});
      setTeams(teamsRes.data?.data || []);
      setTasks(tasksRes.data?.data || []);
      setAttendees(attRes.data?.data?.attendees || []);
      setResources(resRes.data?.data?.resources || []);
      setEvidenceInbox(inboxRes.data?.data || []);

      if (ev) {
        setEditName(ev.name);
        setEditVenue(ev.venue);
        setEditStatus(ev.status);
      }
    } catch {
      // Transient error handled calmly
    } finally {
      setLoading(false);
    }
    await syncPendingActions();
  }, [eventId, syncPendingActions]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const isManager =
    (typeof eventData?.managerId === 'object'
      ? eventData?.managerId?._id === user?._id
      : eventData?.managerId === user?._id) || currentRole === 'EVENT_MANAGER';

  const canReviewEvidence = isManager || currentRole === 'TEAM_LEAD';

  const handleToggleChecklistTask = async (task: ITask) => {
    const nextStatus =
      task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED;
    setFeedback('');

    try {
      await api.patch(`/tasks/${task._id}/status`, {
        status: nextStatus,
        expectedUpdatedAt: task.updatedAt,
      });
      await loadWorkspace();
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
        await syncPendingActions();
        setFeedback('Saved offline as Pending Sync until connected.');
      } else {
        setFeedback(err.response?.data?.message || 'Open task details to upload required proof first.');
        setSelectedTaskId(task._id);
      }
    }
  };

  const handleRegisterAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttSubmitting(true);
    try {
      await api.post(`/events/${eventId}/attendees`, {
        name: attName.trim(),
        email: attEmail.trim(),
        ticketType: attTicketType,
      });
      setAttName('');
      setAttEmail('');
      setShowRegisterAttendee(false);
      await loadWorkspace();
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Could not register attendee.');
    } finally {
      setAttSubmitting(false);
    }
  };

  const handleQuickCheckIn = async (att: IAttendee) => {
    try {
      await api.post(`/events/${eventId}/attendees/check-in`, {
        attendeeId: att._id,
        ticketCode: att.ticketCode,
        idempotencyKey: `ws-checkin-${att._id}-${Date.now()}`,
      });
      setFeedback(`${att.name} checked in.`);
      await loadWorkspace();
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Could not check in attendee.');
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resFile) return;
    setResUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', resFile);
      fd.append('title', resTitle.trim() || resFile.name);
      fd.append('category', resCategory);
      await api.post(`/events/${eventId}/resources`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResTitle('');
      setResFile(null);
      setShowUploadResource(false);
      await loadWorkspace();
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Resource upload failed.');
    } finally {
      setResUploading(false);
    }
  };

  const handleReviewProof = async (evidenceId: string, reviewStatus: EvidenceReviewStatus) => {
    try {
      await api.patch(`/evidence/${evidenceId}/review`, {
        reviewStatus,
        reviewNote:
          reviewStatus === EvidenceReviewStatus.APPROVED
            ? 'Verified from Event Workspace'
            : 'Please upload clearer completion proof',
        flagTaskRework: reviewStatus !== EvidenceReviewStatus.APPROVED,
      });
      await loadWorkspace();
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Could not update review status.');
    }
  };

  const handleSaveEventEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.patch(`/events/${eventId}`, {
        name: editName.trim(),
        venue: editVenue.trim(),
        status: editStatus,
      });
      setShowEditEventModal(false);
      await loadWorkspace();
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Failed updating event.');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading && !eventData) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-3xl bg-white/70 dark:bg-[#18132B]/70 animate-pulse" />
        <div className="h-72 rounded-3xl bg-white/70 dark:bg-[#18132B]/70 animate-pulse" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-8 text-center border border-brand-200 dark:border-brand-800 space-y-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Event not found</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You may not have access to this event or it was removed.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  const countdown = getCountdownBadge(eventData.startDate, eventData.endDate, eventData.status);
  const topLevelTasks = tasks.filter((item) => !item.parentTaskId);
  const subtasksByParent = new Map<string, ITask[]>();
  tasks.forEach((item) => {
    if (item.parentTaskId) {
      const arr = subtasksByParent.get(item.parentTaskId) || [];
      arr.push(item);
      subtasksByParent.set(item.parentTaskId, arr);
    }
  });

  const filteredTopTasks = taskSearch.trim()
    ? tasks.filter((item) => item.title.toLowerCase().includes(taskSearch.toLowerCase()))
    : topLevelTasks;

  const completedChecklistCount = tasks.filter((item) => item.status === TaskStatus.COMPLETED).length;
  const totalChecklistCount = tasks.length;
  const checklistPct =
    totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  const filteredAttendees = attendeeSearch.trim()
    ? attendees.filter(
        (a) =>
          a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
          a.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
          a.ticketCode.toLowerCase().includes(attendeeSearch.toLowerCase())
      )
    : attendees;

  const tabItems: { id: WorkspaceTab; label: string; icon: any }[] = [
    { id: 'overview', label: t('nav.dashboard'), icon: Home },
    { id: 'tasks', label: t('nav.tasks'), icon: CheckSquare },
    { id: 'attendees', label: t('nav.attendees'), icon: UserCheck },
    { id: 'team', label: t('nav.team'), icon: Users },
    { id: 'files', label: t('nav.files'), icon: FolderOpen },
  ];

  return (
    <div className="space-y-5">
      {/* Top Event Header matching Reference Workspace Screenshot */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl px-4 sm:px-6 pt-4 pb-0 border border-brand-200/70 dark:border-brand-800/70 shadow-card">
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/events"
              aria-label="Back to Events"
              className="min-w-[44px] min-h-[44px] rounded-2xl bg-canvas dark:bg-[#221A40] border border-brand-200/70 dark:border-brand-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-pastel-purple shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
                {eventData.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                {eventData.venue} · {formatFriendlyDate(eventData.startDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-pastel-purple dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold text-xs sm:text-sm">
              {countdown.label}
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More event actions"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-canvas dark:hover:bg-[#221A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <MoreVertical className="w-5 h-5" aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Event Actions Menu"
                  className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#18132B] rounded-2xl shadow-soft border border-brand-200 dark:border-brand-800 py-2 z-40"
                >
                  <Link
                    href={`/events/${eventId}/check-in`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                  >
                    <QrCode className="w-4 h-4 text-brand-600" aria-hidden="true" />
                    <span>Attendee QR Check-in</span>
                  </Link>
                  <Link
                    href={`/events/${eventId}/chat`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                  >
                    <MessageSquare className="w-4 h-4 text-brand-600" aria-hidden="true" />
                    <span>{t('nav.chat')}</span>
                  </Link>
                  <Link
                    href={`/events/${eventId}/day-mode`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                  >
                    <Flame className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    <span>{t('nav.day_mode')}</span>
                  </Link>
                  <Link
                    href={`/events/${eventId}/tasks`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                  >
                    <Layers className="w-4 h-4 text-brand-600" aria-hidden="true" />
                    <span>Advanced Task Board</span>
                  </Link>
                  {isManager && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowEditEventModal(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40 text-left"
                      >
                        <Edit3 className="w-4 h-4 text-brand-600" aria-hidden="true" />
                        <span>Edit Event Info</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40 text-left"
                      >
                        <Settings className="w-4 h-4 text-brand-600" aria-hidden="true" />
                        <span>Event Permissions</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WAI-ARIA 5-Tab Navigation Bar */}
        <div
          role="tablist"
          aria-label="Event workspace sections"
          className="flex items-center justify-between sm:justify-start sm:gap-6 border-t border-brand-100 dark:border-brand-800/80 overflow-x-auto"
        >
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-3 py-3 min-w-[64px] min-h-[52px] text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  selected
                    ? 'text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" aria-hidden="true" />
                <span className="mt-1 sm:mt-0">{tab.label}</span>
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 inset-x-2 h-1 rounded-t-full bg-brand-600 dark:bg-brand-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center space-x-2 text-sm font-medium text-amber-950 dark:text-amber-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="space-y-5">
          <div className="bg-white dark:bg-[#18132B] rounded-3xl overflow-hidden border border-brand-200/70 dark:border-brand-800/70 shadow-card grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 relative min-h-[200px] bg-brand-900">
              <img
                src={getEventCoverSrc(eventData.type, eventData.coverImage)}
                alt={`${eventData.name} venue`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-7 p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-pastel-purple dark:bg-brand-900 text-brand-800 dark:text-brand-200">
                    {eventData.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-pastel-blue dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 capitalize">
                    {eventData.type}
                  </span>
                </div>

                {eventData.description && (
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {eventData.description}
                  </p>
                )}

                <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                    <span>
                      {formatFriendlyDate(eventData.startDate)} — {formatFriendlyDate(eventData.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                    <span>
                      {eventData.venue}
                      {eventData.address ? ` · ${eventData.address}` : ''}
                    </span>
                  </div>
                </div>

                {eventData.zones?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {eventData.zones.map((z) => (
                      <span
                        key={z}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-canvas dark:bg-[#221A40] border border-brand-200/70 dark:border-brand-700 text-slate-700 dark:text-slate-200"
                      >
                        {z}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <Link
                  href={`/events/${eventId}/check-in`}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-xs"
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                  <span>Start Check-in</span>
                </Link>
                <Link
                  href={`/events/${eventId}/chat`}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                >
                  <MessageSquare className="w-4 h-4 text-brand-600" aria-hidden="true" />
                  <span>Live Chat</span>
                </Link>
                <Link
                  href={`/events/${eventId}/day-mode`}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold"
                >
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  <span>Day Mode</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 4 Single-Stat Clean Cards (Zero Charts) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="bg-white dark:bg-[#18132B] hover:border-brand-400 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card text-left"
            >
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Checklist Progress
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.completedTasks ?? completedChecklistCount}/{metrics.totalTasks ?? totalChecklistCount}
              </p>
              <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mt-1">
                {metrics.readinessPercentage ?? checklistPct}% ready
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendees')}
              className="bg-white dark:bg-[#18132B] hover:border-emerald-400 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card text-left"
            >
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Registered Guests
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.registeredCount ?? attendees.length}
              </p>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                {metrics.checkedInCount ?? attendees.filter((a) => a.status === 'checked_in').length} checked in
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className="bg-white dark:bg-[#18132B] hover:border-sky-400 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card text-left"
            >
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Operational Teams
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {teams.length}
              </p>
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300 mt-1">
                Manage crew & leads
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className="bg-white dark:bg-[#18132B] hover:border-amber-400 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card text-left"
            >
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Proof & Guides
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {resources.length + evidenceInbox.length}
              </p>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-1">
                {evidenceInbox.filter((e) => e.reviewStatus === 'PENDING').length} pending review
              </p>
            </button>
          </div>

          {/* Progressive Disclosure for Operational Timeline & Activity Log */}
          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Timeline & Activity History
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Optional live execution stream and time-ordered milestones
                </p>
              </div>
              <button
                type="button"
                aria-expanded={showOpsAnalytics}
                onClick={() => setShowOpsAnalytics((p) => !p)}
                className="px-4 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-brand-800 dark:text-brand-200 hover:bg-pastel-purple dark:hover:bg-brand-900/40"
              >
                {showOpsAnalytics ? 'Hide History' : 'Show Timeline & Activity'}
              </button>
            </div>

            {showOpsAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 pt-5 border-t border-brand-100 dark:border-brand-800">
                <TimelineView
                  eventId={eventId}
                  onSelectTask={(tk) => setSelectedTaskId(tk._id)}
                />
                <ActivityFeed
                  eventId={eventId}
                  onSelectTask={(tkId) => setSelectedTaskId(tkId)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TASKS (Event Checklist matching Bottom-Middle Screenshot) */}
      {activeTab === 'tasks' && (
        <div role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks" className="space-y-4">
          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('tasks.title')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {completedChecklistCount} of {totalChecklistCount} completed
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/events/${eventId}/tasks`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                >
                  <Layers className="w-4 h-4 text-brand-600" aria-hidden="true" />
                  <span>Full Board & Tree</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMicrotaskParent(null);
                    setShowCreateTask(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{t('tasks.create_task')}</span>
                </button>
              </div>
            </div>

            {/* Clean Gradient Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={checklistPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Event checklist ${checklistPct}% completed`}
              className="h-3 rounded-full bg-brand-100 dark:bg-brand-900 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-400 transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              />
            </div>

            <input
              type="search"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Filter checklist items..."
              aria-label="Filter checklist tasks"
              className="w-full sm:max-w-xs px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 shadow-card overflow-hidden">
            {filteredTopTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
                No checklist tasks yet. Click &quot;Add Task&quot; to create your first milestone.
              </div>
            ) : (
              <ul className="divide-y divide-brand-100/80 dark:divide-brand-800/80">
                {filteredTopTasks.map((task) => {
                  const isDone = task.status === TaskStatus.COMPLETED;
                  const due = formatShortDueDate(task.dueTime);
                  const childTasks = subtasksByParent.get(task._id) || [];
                  const isPendingSync = pendingTaskIds.has(task._id);

                  return (
                    <li key={task._id} className="px-4 sm:px-5 py-3.5 hover:bg-canvas/60 dark:hover:bg-[#221A40]/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklistTask(task)}
                            aria-label={isDone ? `Uncheck "${task.title}"` : `Complete "${task.title}"`}
                            aria-pressed={isDone}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl shrink-0"
                          >
                            {isDone ? (
                              <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                                <CheckSquare className="w-4 h-4" aria-hidden="true" />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-md border-2 border-brand-300 dark:border-brand-600 bg-white dark:bg-[#221A40] flex items-center justify-center text-transparent">
                                <Square className="w-4 h-4" aria-hidden="true" />
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task._id)}
                            className="text-left min-w-0 flex-1 py-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <p
                              className={`text-sm sm:text-base font-semibold truncate ${
                                isDone
                                  ? 'line-through text-slate-500 dark:text-slate-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                              {(task as any).teamId?.name || 'General Team'}
                              {childTasks.length > 0 ? ` · ${childTasks.length} subtasks` : ''}
                              {task.evidenceRequired ? ' · Proof required' : ''}
                            </p>
                          </button>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isPendingSync && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                              <WifiOff className="w-3 h-3" aria-hidden="true" />
                              <span>Pending Sync</span>
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              due.isOverdue && !isDone
                                ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200'
                                : 'bg-pastel-orange/80 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{due.label}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task._id)}
                            aria-label={`Inspect ${task.title}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-brand-700 hover:bg-brand-50"
                          >
                            <ChevronRight className="w-5 h-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Nested subtasks inline preview */}
                      {childTasks.length > 0 && (
                        <ul className="pl-12 pr-2 pt-2 space-y-1.5">
                          {childTasks.map((sub) => (
                            <li key={sub._id} className="flex items-center justify-between text-xs sm:text-sm py-1 border-l-2 border-brand-200 dark:border-brand-700 pl-3">
                              <button
                                type="button"
                                onClick={() => setSelectedTaskId(sub._id)}
                                className={`text-left truncate hover:underline ${
                                  sub.status === TaskStatus.COMPLETED
                                    ? 'line-through text-slate-500'
                                    : 'text-slate-700 dark:text-slate-200 font-medium'
                                }`}
                              >
                                {sub.title}
                              </button>
                              <span className="text-xs font-semibold text-slate-500 shrink-0 ml-2">
                                {t(`tasks.status.${sub.status}`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDEES */}
      {activeTab === 'attendees' && (
        <div role="tabpanel" id="panel-attendees" aria-labelledby="tab-attendees" className="space-y-4">
          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="search"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                placeholder="Search attendee name, email, or ticket code..."
                aria-label="Search event attendees"
                className="w-full px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/events/${eventId}/check-in`}
                className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl bg-pastel-orange hover:bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 text-sm font-bold"
              >
                <QrCode className="w-4 h-4" aria-hidden="true" />
                <span>Launch QR Check-in</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowRegisterAttendee(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Add Attendee</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 shadow-card overflow-hidden">
            {filteredAttendees.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
                No attendees registered for this event yet.
              </div>
            ) : (
              <ul className="divide-y divide-brand-100/80 dark:divide-brand-800/80">
                {filteredAttendees.map((att) => (
                  <li key={att._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">{att.name}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-canvas dark:bg-[#221A40] border border-brand-200 dark:border-brand-700">
                          {att.ticketCode}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pastel-purple text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                          {att.ticketType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{att.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {att.status === 'checked_in' ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-pastel-green text-emerald-900 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Checked In</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickCheckIn(att)}
                          className="px-3.5 py-2 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold"
                        >
                          Check In
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setQrAttendee(att)}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100"
                      >
                        <Ticket className="w-4 h-4 text-brand-600" aria-hidden="true" />
                        <span>QR Pass</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TEAM */}
      {activeTab === 'team' && (
        <div role="tabpanel" id="panel-team" aria-labelledby="tab-team" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Operational Teams ({teams.length})
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Assign leads, organize staff by zone, and track team completion.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isManager && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCreateTeam(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#18132B] text-sm font-semibold text-slate-800 dark:text-white"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>New Team</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    <span>Invite Member</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="bg-white dark:bg-[#18132B] rounded-3xl p-8 text-center border border-brand-200/70 dark:border-brand-800/70">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No teams added yet for {eventData.name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard
                  key={team._id}
                  team={team}
                  onClick={() => router.push(`/events/${eventId}/tasks?teamId=${team._id}`)}
                />
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Team Workload Matrix
            </h3>
            <WorkloadMatrix eventId={eventId} />
          </div>
        </div>
      )}

      {/* TAB 5: FILES & PROOF REVIEW */}
      {activeTab === 'files' && (
        <div role="tabpanel" id="panel-files" aria-labelledby="tab-files" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Files & Verification Proofs
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Shared floor plans, schedules, and field task proofs requiring review.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/events/${eventId}/evidence`}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#18132B] text-sm font-semibold text-slate-800 dark:text-white"
              >
                <Eye className="w-4 h-4 text-brand-600" aria-hidden="true" />
                <span>Full Proof Inbox</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowUploadResource(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Upload Event File</span>
              </button>
            </div>
          </div>

          {/* Evidence Review Queue */}
          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Task Proof Review ({evidenceInbox.length})
            </h3>
            {evidenceInbox.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No field proofs uploaded for this event yet.
              </p>
            ) : (
              <ul className="divide-y divide-brand-100/80 dark:divide-brand-800/80">
                {evidenceInbox.map((ev) => (
                  <li key={ev._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {ev.caption || ev.taskId?.title || 'Task Proof'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {ev.mediaType} · {ev.uploaderId?.name || 'Crew'} · Status:{' '}
                        <strong>{ev.reviewStatus}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxEvidence(ev)}
                        className="px-3 py-2 min-h-[40px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      >
                        Inspect
                      </button>
                      {canReviewEvidence && ev.reviewStatus !== EvidenceReviewStatus.APPROVED && (
                        <button
                          type="button"
                          onClick={() => handleReviewProof(ev._id, EvidenceReviewStatus.APPROVED)}
                          className="inline-flex items-center space-x-1 px-3 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Approve</span>
                        </button>
                      )}
                      {canReviewEvidence && ev.reviewStatus === EvidenceReviewStatus.PENDING && (
                        <button
                          type="button"
                          onClick={() => handleReviewProof(ev._id, EvidenceReviewStatus.REJECTED)}
                          className="inline-flex items-center space-x-1 px-3 py-2 min-h-[40px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Request Changes</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Shared Resources */}
          <div className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Event Guides & Floor Plans ({resources.length})
            </h3>
            {resources.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Upload schedules, venue maps, or PDF checklists to share with your team.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-canvas dark:bg-[#221A40] border border-brand-200/70 dark:border-brand-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {r.category} · {Math.max(1, Math.round(r.fileSizeBytes / 1024))} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProtectedFile(r.fileUrl, r.fileName)}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#18132B] border border-brand-200 dark:border-brand-700 text-xs font-bold text-brand-700 dark:text-brand-200 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal
          eventId={eventId}
          parentTask={microtaskParent || undefined}
          teams={teams}
          allTasks={tasks}
          onClose={() => {
            setShowCreateTask(false);
            setMicrotaskParent(null);
          }}
          onCreated={() => {
            setShowCreateTask(false);
            setMicrotaskParent(null);
            loadWorkspace();
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadWorkspace}
          onOpenCreateMicrotask={(parent) => {
            setSelectedTaskId(null);
            setMicrotaskParent(parent);
            setShowCreateTask(true);
          }}
        />
      )}

      {showCreateTeam && (
        <CreateTeamModal
          eventId={eventId}
          onClose={() => setShowCreateTeam(false)}
          onCreated={() => {
            setShowCreateTeam(false);
            loadWorkspace();
          }}
        />
      )}

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        events={eventData ? [eventData] : []}
        defaultEventId={eventId}
        teams={teams}
        onInvited={loadWorkspace}
      />

      {showSettingsModal && eventData && (
        <EventSettingsModal
          eventId={eventId}
          initialPermissions={eventData.permissions}
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            setShowSettingsModal(false);
            loadWorkspace();
          }}
        />
      )}

      <Modal
        isOpen={showEditEventModal}
        onClose={() => setShowEditEventModal(false)}
        title="Edit Event Details"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEventEdit} className="space-y-4">
          <div>
            <label htmlFor="ed-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Event Title
            </label>
            <input
              id="ed-name"
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            />
          </div>
          <div>
            <label htmlFor="ed-venue" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Venue
            </label>
            <input
              id="ed-venue"
              type="text"
              required
              value={editVenue}
              onChange={(e) => setEditVenue(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            />
          </div>
          <div>
            <label htmlFor="ed-status" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Status
            </label>
            <select
              id="ed-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            >
              <option value="planning">Planning</option>
              <option value="live_setup">Live Setup</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditEventModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 text-white text-sm font-bold"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showRegisterAttendee}
        onClose={() => setShowRegisterAttendee(false)}
        title={`Register Attendee — ${eventData.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleRegisterAttendee} className="space-y-4">
          <div>
            <label htmlFor="ws-att-name" className="block text-sm font-semibold mb-1">
              Full Name *
            </label>
            <input
              id="ws-att-name"
              type="text"
              required
              value={attName}
              onChange={(e) => setAttName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            />
          </div>
          <div>
            <label htmlFor="ws-att-email" className="block text-sm font-semibold mb-1">
              Email *
            </label>
            <input
              id="ws-att-email"
              type="email"
              required
              value={attEmail}
              onChange={(e) => setAttEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            />
          </div>
          <div>
            <label htmlFor="ws-att-tier" className="block text-sm font-semibold mb-1">
              Ticket Tier
            </label>
            <select
              id="ws-att-tier"
              value={attTicketType}
              onChange={(e) => setAttTicketType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            >
              <option value="General">General</option>
              <option value="VIP">VIP</option>
              <option value="Speaker">Speaker</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRegisterAttendee(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={attSubmitting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 text-white text-sm font-bold"
            >
              {attSubmitting ? 'Adding...' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showUploadResource}
        onClose={() => setShowUploadResource(false)}
        title="Upload Event Resource"
        maxWidth="md"
      >
        <form onSubmit={handleUploadResource} className="space-y-4">
          <div>
            <label htmlFor="ws-res-title" className="block text-sm font-semibold mb-1">
              Document Title *
            </label>
            <input
              id="ws-res-title"
              type="text"
              required
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
              placeholder="e.g. Floor Plan & Stage Spec"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            />
          </div>
          <div>
            <label htmlFor="ws-res-cat" className="block text-sm font-semibold mb-1">
              Category
            </label>
            <select
              id="ws-res-cat"
              value={resCategory}
              onChange={(e) => setResCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm"
            >
              <option value="Floor Plan">Floor Plan</option>
              <option value="Schedule">Schedule</option>
              <option value="Checklist">Checklist</option>
              <option value="Briefing">Briefing</option>
              <option value="Media">Media</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="ws-res-file" className="block text-sm font-semibold mb-1">
              File *
            </label>
            <input
              id="ws-res-file"
              type="file"
              required
              onChange={(e) => setResFile(e.target.files?.[0] || null)}
              className="w-full text-sm min-h-[44px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadResource(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resUploading}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 text-white text-sm font-bold"
            >
              {resUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </Modal>

      <QrTicketModal
        attendee={qrAttendee}
        eventName={eventData.name}
        onClose={() => setQrAttendee(null)}
      />

      {lightboxEvidence && (
        <EvidenceLightbox
          evidence={lightboxEvidence}
          canReview={canReviewEvidence}
          onClose={() => setLightboxEvidence(null)}
          onReviewed={() => {
            setLightboxEvidence(null);
            loadWorkspace();
          }}
        />
      )}
    </div>
  );
}
