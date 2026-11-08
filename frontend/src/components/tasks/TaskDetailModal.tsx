'use client';

import React, { useState, useEffect } from 'react';
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

  // Action dialog states
  const [showReworkDialog, setShowReworkDialog] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

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
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading operational task...</span>
        </div>
      </div>
    );
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {t(`tasks.priority.${task.priority}`)}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {t(`tasks.status.${task.status}`)}
              </span>
              {task.zone && (
                <span className="text-[10px] font-medium text-slate-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {task.zone}
                </span>
              )}
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
              {task.title}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 mr-6 border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Details & Verification
          </button>

          {!task.parentTaskId && (
            <button
              type="button"
              onClick={() => setActiveTab('microtasks')}
              className={`py-3 mr-6 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'microtasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Microtasks ({microtasks.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({activities.length})</span>
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="m-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {activeTab === 'details' && (
            <>
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
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                      Proof of Work Policy
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {task.evidenceRequired
                        ? `Requires at least ${task.minEvidenceCount} photo/video item(s) before final approval.`
                        : 'No mandatory photo proof required.'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {task.evidenceRequired ? 'Enforced' : 'Optional'}
                </span>
              </div>

              {/* Evidence Gallery & Uploader */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Uploaded Proof ({evidenceList.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => setShowUploader(!showUploader)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
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
            </>
          )}

          {activeTab === 'microtasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Breakdown microtasks assigned to team members
                </span>
                {onOpenCreateMicrotask && (
                  <button
                    type="button"
                    onClick={() => onOpenCreateMicrotask(task)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Microtask</span>
                  </button>
                )}
              </div>

              {microtasks.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No microtasks assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {microtasks.map((micro) => (
                    <div
                      key={micro._id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {micro.title}
                        </h5>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                          <span>Assignee: {micro.assignee ? micro.assignee.name : 'Unassigned'}</span>
                          <span>•</span>
                          <span>Due: {new Date(micro.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-700 border text-slate-700 dark:text-slate-300">
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
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm"
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
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Immutable Activity Trail
              </h4>
              {activities.length === 0 ? (
                <p className="text-xs text-slate-500">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {activities.map((act) => (
                    <div key={act._id} className="relative flex items-start pl-7 text-xs">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {act.actor ? act.actor.name : 'System'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                          {act.action}:{' '}
                          {act.previousValue ? `${act.previousValue} → ` : ''}
                          <span className="font-bold">{act.newValue}</span>
                        </p>
                        {act.reason && (
                          <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5 italic">
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
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 z-10">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Specify Reason for Rework
              </h4>
              <textarea
                required
                rows={3}
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                placeholder="Clearly state what adjustments or extra proof are required..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReworkDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reworkReason.trim() || actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.REWORK_REQUIRED, reworkReason)}
                  className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  Send Rework Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Reason Dialog */}
        {showBlockDialog && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 z-10">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Report Issue / Blocked Reason
              </h4>
              <textarea
                required
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Describe what is preventing progress (e.g. power failure, missing inventory)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBlockDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!blockReason.trim() || actionLoading}
                  onClick={() => handleStatusTransition(TaskStatus.BLOCKED, blockReason)}
                  className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
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
};
