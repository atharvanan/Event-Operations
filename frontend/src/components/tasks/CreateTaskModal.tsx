'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { ITask, ITeam, TaskPriority, MediaType } from '@shared/types';
import { X, Layers, Clock, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  eventId: string;
  parentTask?: ITask | null; // If provided, creating a microtask
  teams: ITeam[];
  allTasks?: ITask[];
  onClose: () => void;
  onCreated: (task: ITask) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  eventId,
  parentTask,
  teams,
  allTasks = [],
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState(parentTask ? parentTask.teamId : teams[0]?._id || '');
  const [priority, setPriority] = useState<TaskPriority>(
    parentTask ? parentTask.priority : TaskPriority.MEDIUM
  );
  const [dueTime, setDueTime] = useState('');
  const [zone, setZone] = useState(parentTask ? parentTask.zone || '' : '');
  const [assigneeId, setAssigneeId] = useState('');
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [minEvidenceCount, setMinEvidenceCount] = useState(1);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected team's members and lead
  const selectedTeam = teams.find((tm) => tm._id === teamId);
  const candidateAssignees = selectedTeam
    ? [
        ...(selectedTeam.lead ? [selectedTeam.lead] : []),
        ...(selectedTeam.members ? selectedTeam.members : []),
      ]
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueTime) {
      setError('Title and Due Time are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload: any = {
        title,
        description,
        teamId: parentTask ? parentTask.teamId : teamId,
        parentTaskId: parentTask ? parentTask._id : null,
        priority,
        dueTime: new Date(dueTime).toISOString(),
        zone,
        assigneeId: assigneeId || undefined,
        evidenceRequired,
        minEvidenceCount: Number(minEvidenceCount),
        evidenceTypes: ['PHOTO'],
        dependencies,
      };

      const res = await api.post(`/events/${eventId}/tasks`, payload);
      onCreated(res.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {parentTask ? `Add Microtask under "${parentTask.title}"` : 'Create Team Outcome Task'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={parentTask ? 'e.g. Set up Sterno fuel and chafing dishes' : 'e.g. Stage Decoration & Floral Backdrop'}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact execution specifications, safety steps, or delivery guidelines..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {!parentTask && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responsible Team *
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {teams.map((tm) => (
                    <option key={tm._id} value={tm._id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Zone
                </label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. Main Stage, Hall A"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
                <option value={TaskPriority.CRITICAL}>Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">{parentTask ? 'Select worker' : 'Team Lead (Default)'}</option>
                {candidateAssignees.map((cand) => (
                  <option key={cand._id} value={cand._id}>
                    {cand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Due Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Evidence Configuration */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Require Photo/Video Completion Proof
              </span>
              <input
                type="checkbox"
                checked={evidenceRequired}
                onChange={(e) => setEvidenceRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            {evidenceRequired && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Minimum photos required:</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={minEvidenceCount}
                  onChange={(e) => setMinEvidenceCount(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : parentTask ? 'Add Microtask' : 'Assign Outcome'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

