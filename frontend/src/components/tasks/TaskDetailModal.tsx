'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { ITask, ITaskActivity, IEvidence, TaskStatus, TaskPriority, EventRole } from '@shared/types';
import { EvidenceGallery } from '../evidence/EvidenceGallery';
import { EvidenceUploader } from '../evidence/EvidenceUploader';
import {
  X,
  Clock,
  MapPin,
  Flame,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Plus,
  Layers,
  History,
  ShieldCheck,
} from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onTaskUpdated: (updatedTask: ITask) => void;
  onOpenCreateMicrotask?: (parentTask: ITask) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  onClose,
  onTaskUpdated,
  onOpenCreateMicrotask,
}) => {
  const { t } = useTranslation();
  const { user, currentEvent } = useAuth();

  const [task, setTask] = useState<ITask | null>(null);
  const [microtasks, setMicrotasks] = useState<ITask[]>([]);
  const [activities, setActivities] = useState<ITaskActivity[]>([]);
  const [evidenceList, setEvidenceList] = useState<IEvidence[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'microtasks' | 'history'>('details');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Action dialog states
  const [showReworkDialog, setShowReworkDialog] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReworkDialog) {
          setShowReworkDialog(false);
          return;
        }
        if (showBlockDialog) {
          setShowBlockDialog(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose, showReworkDialog, showBlockDialog]);

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const [res, evidenceRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get(`/tasks/${taskId}/evidence`),
      ]);
      const { task: tData, microtasks: mData, activities: aData } = res.data.data;
      setTask(tData);
      setMicrotasks(mData || []);
      setActivities(aData || []);
      setEvidenceList(evidenceRes.data.data || []);
    } catch (err) {
      console.error('Error fetching task details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  if (isLoading || !task) {
    const loadingNode = (
      <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading operational task...</span>
        </div>
      </div>
    );
    return typeof document !== 'undefined' && mounted ? createPortal(loadingNode, document.body) : loadingNode;
  }

  const isManager = currentEvent?.managerId === user?._id;
  const isAssignee = task.assigneeId === user?._id;

  const handleStatusTransition = async (newStatus: TaskStatus, reason?: string) => {
    try {
      setActionLoading(true);
      setActionError('');
      const res = await api.patch(`/tasks/${task._id}/status`, {
        status: newStatus,
        reason,
      });

      const updated = res.data.data;
      setTask(updated);
      onTaskUpdated(updated);
      setShowReworkDialog(false);
      setShowBlockDialog(false);
      fetchTaskDetails();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Error updating task status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setActionLoading(true);
      setActionError('');
      const res = await api.post(`/tasks/${task._id}/escalate`, {
        priority: TaskPriority.CRITICAL,
        reason: 'Immediate on-site priority requested by Manager',
      });
      const updated = res.data.data;
      setTask(updated);
      onTaskUpdated(updated);
      fetchTaskDetails();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Error escalating task');
    } finally {
      setActionLoading(false);
    }
  };

  const modalNode = (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 safe-area-bottom"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/60 max-w-2xl w-full flex flex-col max-h-[90dvh] shadow-2xl animate-in fade-in zoom-in-95 duration-150 focus:outline-none relative z-10"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-brand-100 dark:border-brand-800/60 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-2">
              <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200 border border-brand-200 dark:border-brand-800">
                {t(`tasks.priority.${task.priority}`)}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50/70 dark:bg-[#221C3E] text-[#2B244D] dark:text-brand-100">
                {t(`tasks.status.${task.status}`)}
              </span>
              {task.zone && (
                <span className="text-xs font-medium text-[#524D6B] dark:text-brand-200 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" aria-hidden="true" />
                  {task.zone}
                </span>
              )}
            </div>
            <h2 id="task-detail-title" className="text-base sm:text-lg font-extrabold text-[#1A162E] dark:text-white leading-snug">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="text-[#524D6B] hover:text-[#1A162E] dark:text-brand-200 dark:hover:text-white p-2 min-w-[44px] min-h-[44px] rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900 transition flex items-center justify-center -mr-1 -mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Bar */}
        <div role="tablist" aria-label="Task detail sections" className="flex border-b border-brand-100 dark:border-brand-800/60 px-5 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            role="tab"
            id="tab-details"
            aria-controls="panel-details"
            aria-selected={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            className={`py-3 mr-6 border-b-2 transition-all min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              activeTab === 'details'
                ? 'border-brand-600 text-brand-600 dark:text-brand-300 font-extrabold'
                : 'border-transparent text-[#524D6B] dark:text-brand-300 hover:text-[#1A162E] dark:hover:text-white'
            }`}
          >
            Details & Verification
          </button>

          {!task.parentTaskId && (
            <button
              type="button"
              role="tab"
              id="tab-microtasks"
              aria-controls="panel-microtasks"
              aria-selected={activeTab === 'microtasks'}
              onClick={() => setActiveTab('microtasks')}
              className={`py-3 mr-6 border-b-2 transition-all min-h-[44px] flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                activeTab === 'microtasks'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-300 font-extrabold'
                  : 'border-transparent text-[#524D6B] dark:text-brand-300 hover:text-[#1A162E] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Microtasks ({microtasks.length})</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            id="tab-history"
            aria-controls="panel-history"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-all min-h-[44px] flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600 dark:text-brand-300 font-extrabold'
                : 'border-transparent text-[#524D6B] dark:text-brand-300 hover:text-[#1A162E] dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Audit History ({activities.length})</span>
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div
            role="alert"
            aria-live="assertive"
            className="m-4 p-3.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-300 dark:border-red-800 flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm">
          {activeTab === 'details' && (
            <div id="panel-details" role="tabpanel" aria-labelledby="tab-details" className="space-y-5 focus:outline-none">
              {/* Rework Alert if any */}
              {task.status === TaskStatus.REWORK_REQUIRED && task.reworkReason && (
                <div className="p-3.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-xs text-orange-800 dark:text-orange-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rework Required by Reviewer</span>
                  </div>
                  <p>{task.reworkReason}</p>
                </div>
              )}

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Execution Instructions
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {task.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Assignee</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {task.assignee ? task.assignee.name : 'Unassigned'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Due Deadline</span>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {new Date(task.dueTime).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Evidence Requirement */}
              <div className="p-3.5 bg-brand-50/60 dark:bg-[#221C3E] rounded-xl border border-brand-200/70 dark:border-brand-800/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                  <div>
                    <h5 className="font-bold text-xs text-[#1A162E] dark:text-white">
                      Proof of Work Policy
                    </h5>
                    <p className="text-xs text-[#524D6B] dark:text-brand-200">
                      {task.evidenceRequired
                        ? `Requires at least ${task.minEvidenceCount} photo/video item(s) before final approval.`
                        : 'No mandatory photo proof required.'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-300">
                  {task.evidenceRequired ? 'Enforced' : 'Optional'}
                </span>
              </div>

              {/* Evidence Gallery & Uploader */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#524D6B] dark:text-brand-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Uploaded Proof ({evidenceList.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => setShowUploader(!showUploader)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 min-h-[36px] bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 text-brand-700 dark:text-brand-200 rounded-lg text-xs font-bold border border-brand-200 dark:border-brand-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showUploader ? 'Close' : 'Attach Proof'}</span>
                  </button>
                </div>

                {showUploader && (
                  <EvidenceUploader
                    taskId={task._id}
                    onUploaded={(newEv) => {
                      setEvidenceList([newEv, ...evidenceList]);
                      setShowUploader(false);
                      fetchTaskDetails();
                    }}
                    onCancel={() => setShowUploader(false)}
                  />
                )}

                <EvidenceGallery
                  evidenceList={evidenceList}
                  canReview={isManager}
                  onEvidenceUpdated={() => {
                    fetchTaskDetails();
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'microtasks' && (
            <div id="panel-microtasks" role="tabpanel" aria-labelledby="tab-microtasks" className="space-y-3 focus:outline-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#524D6B] dark:text-brand-200">
                  Breakdown microtasks assigned to team members
                </span>
                {onOpenCreateMicrotask && (
                  <button
                    type="button"
                    onClick={() => onOpenCreateMicrotask(task)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[36px] bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Microtask</span>
                  </button>
                )}
              </div>

              {microtasks.length === 0 ? (
                <div className="text-center py-10 bg-brand-50/40 dark:bg-[#221C3E]/50 rounded-xl border border-dashed border-brand-200 dark:border-brand-800">
                  <Layers className="w-8 h-8 text-brand-400 mx-auto mb-2" />
                  <p className="text-xs text-[#524D6B] dark:text-brand-200">No microtasks assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {microtasks.map((micro) => (
                    <div
                      key={micro._id}
                      className="p-3 bg-brand-50/50 dark:bg-[#221C3E] rounded-xl border border-brand-200/70 dark:border-brand-800/60 flex items-center justify-between gap-2"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-[#1A162E] dark:text-white">
                          {micro.title}
                        </h5>
                        <div className="flex items-center space-x-2 text-xs text-[#524D6B] dark:text-brand-200 mt-1">
                          <span>Assignee: {micro.assignee ? micro.assignee.name : 'Unassigned'}</span>
                          <span>•</span>
                          <span>Due: {new Date(micro.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-[#18132B] border border-brand-200/70 dark:border-brand-800 text-[#2B244D] dark:text-brand-100">
                          {t(`tasks.status.${micro.status}`)}
                        </span>
                        {/* Quick lead approval button for microtask */}
                        {micro.status === TaskStatus.SUBMITTED_FOR_REVIEW && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.patch(`/tasks/${micro._id}/status`, {
                                status: TaskStatus.COMPLETED,
                              });
                              fetchTaskDetails();
                            }}
                            className="px-3 py-1.5 min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="space-y-3 focus:outline-none">
              <h4 className="text-xs font-bold text-[#524D6B] dark:text-brand-300 uppercase tracking-wider mb-2">
                Immutable Activity Trail
              </h4>
              {activities.length === 0 ? (
                <p className="text-xs text-[#524D6B] dark:text-brand-200">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-brand-200 dark:before:bg-brand-800">
                  {activities.map((act) => (
                    <div key={act._id} className="relative flex items-start pl-7 text-xs">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-brand-600 border-2 border-white dark:border-[#18132B]" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#1A162E] dark:text-white">
                            {act.actor ? act.actor.name : 'System'}
                          </span>
                          <span className="text-xs text-[#524D6B] dark:text-brand-300">
                            {new Date(act.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[#2B244D] dark:text-brand-100 mt-0.5 font-medium">
                          {act.action}:{' '}
                          {act.previousValue ? `${act.previousValue} → ` : ''}
                          <span className="font-bold">{act.newValue}</span>
                        </p>
                        {act.reason && (
                          <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5 italic">
                            Reason: "{act.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex items-center justify-between flex-wrap gap-2">
          {/* Manager Escalation Button */}
          {isManager && !task.isUrgentEscalated && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleEscalate}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Escalate Urgent</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            {/* Status transitions based on state */}
            {task.status === TaskStatus.TO_DO && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusTransition(TaskStatus.ACKNOWLEDGED)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Acknowledge Task
              </button>
            )}

            {(task.status === TaskStatus.ACKNOWLEDGED || task.status === TaskStatus.REWORK_REQUIRED) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusTransition(TaskStatus.IN_PROGRESS)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Start Work
              </button>
            )}

            {task.status === TaskStatus.IN_PROGRESS && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowBlockDialog(true)}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl"
                >
                  Report Blocked
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.SUBMITTED_FOR_REVIEW)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Review</span>
                </button>
              </>
            )}

            {task.status === TaskStatus.SUBMITTED_FOR_REVIEW && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowReworkDialog(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request Rework</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.COMPLETED)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Completion</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rework Reason Dialog */}
        {showReworkDialog && (
          <div role="presentation" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4 sm:p-6 z-10">
            <div role="dialog" aria-modal="true" aria-labelledby="rework-dialog-title" className="bg-white dark:bg-[#18132B] rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 border border-brand-200 dark:border-brand-800 shadow-2xl">
              <h4 id="rework-dialog-title" className="font-bold text-sm text-[#1A162E] dark:text-white">
                Specify Reason for Rework
              </h4>
              <label htmlFor="rework-reason-input" className="sr-only">
                Rework reason details
              </label>
              <textarea
                id="rework-reason-input"
                required
                rows={3}
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                placeholder="Clearly state what adjustments or extra proof are required..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-end space-x-2.5 pt-2 border-t border-brand-100 dark:border-brand-800">
                <button
                  type="button"
                  onClick={() => setShowReworkDialog(false)}
                  className="px-4 py-2 min-h-[44px] text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reworkReason.trim() || actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.REWORK_REQUIRED, reworkReason)}
                  className="px-5 py-2 min-h-[44px] bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  Send Rework Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Reason Dialog */}
        {showBlockDialog && (
          <div role="presentation" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4 sm:p-6 z-10">
            <div role="dialog" aria-modal="true" aria-labelledby="blocked-dialog-title" className="bg-white dark:bg-[#18132B] rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 border border-brand-200 dark:border-brand-800 shadow-2xl">
              <h4 id="blocked-dialog-title" className="font-bold text-sm text-[#1A162E] dark:text-white">
                Report Issue / Blocked Reason
              </h4>
              <label htmlFor="block-reason-input" className="sr-only">
                Blocked reason details
              </label>
              <textarea
                id="block-reason-input"
                required
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Describe what is preventing progress (e.g. power failure, missing inventory)..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-end space-x-2.5 pt-2 border-t border-brand-100 dark:border-brand-800">
                <button
                  type="button"
                  onClick={() => setShowBlockDialog(false)}
                  className="px-4 py-2 min-h-[44px] text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!blockReason.trim() || actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.BLOCKED, blockReason)}
                  className="px-5 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  Mark Blocked
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' && mounted ? createPortal(modalNode, document.body) : modalNode;
};
