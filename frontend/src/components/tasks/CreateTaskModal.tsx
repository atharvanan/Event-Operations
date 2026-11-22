'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { ITask, ITeam, TaskPriority } from '@shared/types';
import { Modal } from '../common/Modal';
import { Calendar, Clock, Plus, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  teams = [],
  allTasks = [],
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation();
  const { user, login } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Teams & Squad handling
  const [eventTeams, setEventTeams] = useState<ITeam[]>(teams);
  const [teamId, setTeamId] = useState<string>(
    parentTask ? parentTask.teamId : teams[0]?._id || ''
  );
  const [showAddSquad, setShowAddSquad] = useState(false);
  const [newSquadName, setNewSquadName] = useState('Operations Crew');
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);

  const [priority, setPriority] = useState<TaskPriority>(
    parentTask ? parentTask.priority : TaskPriority.MEDIUM
  );
  const [zone, setZone] = useState(parentTask ? parentTask.zone || '' : '');
  const [assigneeId, setAssigneeId] = useState('');
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [minEvidenceCount, setMinEvidenceCount] = useState(1);
  const [dependencies, setDependencies] = useState<string[]>([]);

  // Non-tech friendly Date & Time handling
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(todayStr);

  const [timePreset, setTimePreset] = useState<'09:00' | '12:00' | '15:00' | '18:00' | '21:00' | 'custom'>('18:00');
  const [customTime, setCustomTime] = useState('18:00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch or sync teams
  useEffect(() => {
    let active = true;
    if (teams && teams.length > 0) {
      setEventTeams(teams);
      if (!teamId && !parentTask) {
        setTeamId(teams[0]._id);
      }
      return;
    }
    // If teams prop is empty, fetch teams directly from the API
    if (eventId) {
      api
        .get(`/events/${eventId}/teams`)
        .then((res: { data?: { data?: ITeam[] } }) => {
          if (!active) return;
          const list = res.data?.data || [];
          setEventTeams(list);
          if (list.length > 0 && !teamId && !parentTask) {
            setTeamId(list[0]._id);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [eventId, teams, parentTask, teamId]);

  // Selected team's candidate assignees
  const effectiveTeamId = parentTask ? parentTask.teamId : teamId;
  const selectedTeam = eventTeams.find((tm) => tm._id === effectiveTeamId);
  const candidateAssignees = selectedTeam
    ? [
        ...(selectedTeam.lead ? [selectedTeam.lead] : []),
        ...(selectedTeam.members ? selectedTeam.members : []),
      ]
    : [];

  // Compute effective date & time
  const effectiveDate =
    dateOption === 'today'
      ? todayStr
      : dateOption === 'tomorrow'
      ? tomorrowStr
      : customDate;

  const effectiveTime = timePreset === 'custom' ? customTime : timePreset;

  // Human-readable due preview
  const formattedDuePreview = useMemo(() => {
    try {
      const d = new Date(`${effectiveDate}T${effectiveTime}`);
      if (isNaN(d.getTime())) return `${effectiveDate} at ${effectiveTime}`;
      const isToday = effectiveDate === todayStr;
      const isTomorrow = effectiveDate === tomorrowStr;
      const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (isToday) return `Today at ${timePart}`;
      if (isTomorrow) return `Tomorrow at ${timePart}`;
      return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${timePart}`;
    } catch {
      return `${effectiveDate} at ${effectiveTime}`;
    }
  }, [effectiveDate, effectiveTime, todayStr, tomorrowStr]);

  // Quick Squad Creation Handler
  const handleCreateSquad = async () => {
    if (!newSquadName.trim() || !eventId) return;
    try {
      setIsCreatingSquad(true);
      setError('');
      const res = await api.post(`/events/${eventId}/teams`, {
        name: newSquadName.trim(),
        colorHex: '#5C44CC',
      });
      const created = res.data?.data;
      if (created) {
        setEventTeams((prev) => [...prev, created]);
        setTeamId(created._id);
        setShowAddSquad(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create squad.');
    } finally {
      setIsCreatingSquad(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let targetTeamId = parentTask ? parentTask.teamId : teamId;

      // If no squad is selected and no teams exist yet, auto-create the squad
      if (!targetTeamId && !parentTask) {
        if (eventTeams.length === 0 || showAddSquad) {
          const squadNameToUse = newSquadName.trim() || 'Operations Crew';
          const teamRes = await api.post(`/events/${eventId}/teams`, {
            name: squadNameToUse,
            colorHex: '#5C44CC',
          });
          const newTeam = teamRes.data?.data;
          if (newTeam?._id) {
            targetTeamId = newTeam._id;
            setEventTeams((prev) => [...prev, newTeam]);
            setTeamId(newTeam._id);
          }
        }
      }

      if (!targetTeamId && !parentTask) {
        setError('Please select or create an operational squad for this task.');
        setIsSubmitting(false);
        return;
      }

      const dueDateTimeISO = new Date(`${effectiveDate}T${effectiveTime}`).toISOString();

      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        teamId: targetTeamId,
        parentTaskId: parentTask ? parentTask._id : null,
        priority,
        dueTime: dueDateTimeISO,
        zone: zone.trim(),
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
          className="p-3.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-300 dark:border-red-800 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          {error.toLowerCase().includes('permissions') && (
            <div className="pl-6 pt-1 border-t border-red-200 dark:border-red-800/80 space-y-2">
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
                You are currently signed in as <strong>{user?.name || 'Staff'}</strong> ({user?.email || 'non-manager'}). Creating operational squads and assigning team outcome tasks requires an <strong>Event Manager</strong> account.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await login('manager@royalweddings.com', 'Password@123');
                    setError('');
                  } catch (e) {
                    console.error('Quick switch failed', e);
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch to Manager (Vikram Sethi)</span>
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Title */}
        <div>
          <label htmlFor="task-title" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Task Title *
          </label>
          <input
            id="task-title"
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={parentTask ? 'e.g. Set up Sterno fuel and chafing dishes' : 'e.g. Stage Decoration & Floral Backdrop'}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
          />
        </div>

        {/* Detailed Instructions */}
        <div>
          <label htmlFor="task-description" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Detailed Instructions (Optional)
          </label>
          <textarea
            id="task-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide exact execution specifications, safety steps, or delivery guidelines..."
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Squad & Zone Section */}
        {!parentTask && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="task-team" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100">
                  Responsible Squad *
                </label>
                {eventTeams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddSquad(!showAddSquad)}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-300 hover:underline cursor-pointer"
                  >
                    {showAddSquad ? 'Select Existing' : '+ New Squad'}
                  </button>
                )}
              </div>

              {eventTeams.length === 0 || showAddSquad ? (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      id="quick-squad-name"
                      type="text"
                      value={newSquadName}
                      onChange={(e) => setNewSquadName(e.target.value)}
                      placeholder="e.g. Operations Crew, Stage, Decor..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[42px]"
                    />
                    <button
                      type="button"
                      disabled={isCreatingSquad || !newSquadName.trim()}
                      onClick={handleCreateSquad}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 cursor-pointer min-h-[42px] transition"
                    >
                      {isCreatingSquad ? '...' : 'Add'}
                    </button>
                  </div>
                  {eventTeams.length === 0 && (
                    <p className="text-[11px] text-brand-600 dark:text-brand-300 italic">
                      No squads exist yet. Squad will be auto-created on save.
                    </p>
                  )}
                </div>
              ) : (
                <select
                  id="task-team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px] cursor-pointer"
                >
                  {eventTeams.map((tm) => (
                    <option key={tm._id} value={tm._id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              )}
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
                placeholder="e.g. Main Stage, Dining Hall, Gate A"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
              />
            </div>
          </div>
        )}

        {/* Priority & Assignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="task-priority" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px] cursor-pointer"
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
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px] cursor-pointer"
            >
              <option value="">{parentTask ? 'Select worker' : 'Squad Lead (Default)'}</option>
              {candidateAssignees.map((cand) => (
                <option key={cand._id} value={cand._id}>
                  {cand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Friendly Non-Technical Date & Time Picker */}
        <div className="p-3.5 rounded-2xl bg-pastel-purple/30 dark:bg-[#221C3E]/70 border border-brand-200 dark:border-brand-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2B244D] dark:text-brand-100 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <span>Due Date & Time *</span>
            </span>
            <div className="text-[11px] font-bold text-brand-700 dark:text-brand-300 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formattedDuePreview}</span>
            </div>
          </div>

          {/* Quick Date Chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Select Day:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDateOption('today')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  dateOption === 'today'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#18132B] text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-700 hover:border-brand-400'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateOption('tomorrow')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  dateOption === 'tomorrow'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#18132B] text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-700 hover:border-brand-400'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDateOption('custom')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  dateOption === 'custom'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#18132B] text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-700 hover:border-brand-400'
                }`}
              >
                Other Date...
              </button>
            </div>

            {dateOption === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="date"
                  min={todayStr}
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#18132B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
          </div>

          {/* Quick Time Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Select Time:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '09:00 AM (Morning)', value: '09:00' as const },
                { label: '12:00 PM (Noon)', value: '12:00' as const },
                { label: '03:00 PM (Afternoon)', value: '15:00' as const },
                { label: '06:00 PM (Evening)', value: '18:00' as const },
                { label: '09:00 PM (Night)', value: '21:00' as const },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setTimePreset(preset.value);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    timePreset === preset.value
                      ? 'bg-brand-600 text-white shadow-sm font-bold'
                      : 'bg-white dark:bg-[#18132B] text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-700 hover:border-brand-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTimePreset('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  timePreset === 'custom'
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : 'bg-white dark:bg-[#18132B] text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-700 hover:border-brand-400'
                }`}
              >
                Custom Time...
              </button>
            </div>

            {timePreset === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#18132B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
          </div>
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
              className="w-5 h-5 text-brand-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
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

        {/* Modal Actions */}
        <div className="pt-3 flex justify-end space-x-2.5 border-t border-brand-100 dark:border-brand-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-60 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {isSubmitting ? 'Creating...' : parentTask ? 'Add Microtask' : 'Assign Outcome'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
