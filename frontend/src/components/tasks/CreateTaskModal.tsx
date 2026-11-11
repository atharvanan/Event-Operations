'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { ITask, ITeam, TaskPriority, MediaType } from '@shared/types';
import { Modal } from '../common/Modal';

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

  const modalTitle = parentTask ? `Add Microtask under "${parentTask.title}"` : 'Create Team Outcome Task';

  return (
    <Modal isOpen={true} onClose={onClose} title={modalTitle} maxWidth="lg">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-300 dark:border-red-800"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task-title" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Task Title *
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={parentTask ? 'e.g. Set up Sterno fuel and chafing dishes' : 'e.g. Stage Decoration & Floral Backdrop'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="task-description" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Detailed Instructions
          </label>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide exact execution specifications, safety steps, or delivery guidelines..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {!parentTask && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="task-team" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
                Responsible Team *
              </label>
              <select
                id="task-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
              >
                {teams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-zone" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
                Location / Zone
              </label>
              <input
                id="task-zone"
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. Main Stage, Hall A"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="task-priority" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
            >
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
              <option value={TaskPriority.CRITICAL}>Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-assignee" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
              Assignee
            </label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
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
          <label htmlFor="task-due-time" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Due Date & Time *
          </label>
          <input
            id="task-due-time"
            type="datetime-local"
            required
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
          />
        </div>

        {/* Evidence Configuration */}
        <div className="p-3.5 bg-brand-50/50 dark:bg-[#221C3E] rounded-xl border border-brand-200 dark:border-brand-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="task-evidence-required" className="text-xs font-bold text-[#2B244D] dark:text-brand-100 cursor-pointer">
              Require Photo/Video Completion Proof
            </label>
            <input
              id="task-evidence-required"
              type="checkbox"
              checked={evidenceRequired}
              onChange={(e) => setEvidenceRequired(e.target.checked)}
              className="w-5 h-5 text-brand-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          {evidenceRequired && (
            <div className="flex items-center justify-between text-xs text-[#524D6B] dark:text-brand-200 pt-1">
              <label htmlFor="task-min-evidence">Minimum photos required:</label>
              <input
                id="task-min-evidence"
                type="number"
                min={1}
                max={10}
                value={minEvidenceCount}
                onChange={(e) => setMinEvidenceCount(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 text-xs border border-brand-200 dark:border-brand-700 rounded-lg bg-white dark:bg-[#18132B] text-[#1A162E] dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="pt-3 flex justify-end space-x-2.5 border-t border-brand-100 dark:border-brand-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {isSubmitting ? 'Creating...' : parentTask ? 'Add Microtask' : 'Assign Outcome'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

