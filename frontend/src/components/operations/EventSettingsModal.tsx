'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { IEventPermissions } from '@shared/types';
import { X, ShieldCheck, MessageSquare, CheckCircle2, UserCheck, Check } from 'lucide-react';

interface EventSettingsModalProps {
  eventId: string;
  initialPermissions?: IEventPermissions;
  onClose: () => void;
  onSaved: (updatedPermissions: IEventPermissions) => void;
}

export function EventSettingsModal({
  eventId,
  initialPermissions,
  onClose,
  onSaved,
}: EventSettingsModalProps) {
  const [permissions, setPermissions] = useState<IEventPermissions>({
    allowWorkersGlobalChat: initialPermissions?.allowWorkersGlobalChat ?? true,
    allowWorkersTeamChat: initialPermissions?.allowWorkersTeamChat ?? true,
    requireLeadReviewFirst: initialPermissions?.requireLeadReviewFirst ?? true,
    allowLeadTaskCreation: initialPermissions?.allowLeadTaskCreation ?? true,
    allowWorkerSelfAssignment: initialPermissions?.allowWorkerSelfAssignment ?? false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggle = (key: keyof IEventPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await api.patch(`/events/${eventId}/permissions`, permissions);
      if (res.data?.success) {
        setSaveSuccess(true);
        onSaved(res.data.data);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update event permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Operations & Access Permissions
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure role access, chat permissions, and verification gates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Permission Item 1 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Worker Posting in Global Event Chat
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Allow field workers to post text, photos, and voice notes to the all-hands event channel.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('allowWorkersGlobalChat')}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                permissions.allowWorkersGlobalChat ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  permissions.allowWorkersGlobalChat ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Permission Item 2 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Worker Posting in Team Internal Chat
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Allow crew members to post messages in their respective department channels.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('allowWorkersTeamChat')}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                permissions.allowWorkersTeamChat ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  permissions.allowWorkersTeamChat ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Permission Item 3 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Two-Tier Verification Gate (Lead Review First)
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Require the designated Team Lead to review and approve photo/video proof before final sign-off.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('requireLeadReviewFirst')}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                permissions.requireLeadReviewFirst ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  permissions.requireLeadReviewFirst ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Permission Item 4 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Team Lead Microtask Assignment
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Empower Team Leads to decompose parent outcomes into microtasks and assign directly to crew.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('allowLeadTaskCreation')}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                permissions.allowLeadTaskCreation ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  permissions.allowLeadTaskCreation ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Permission Item 5 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Worker Self-Assignment
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Allow unassigned workers to claim open unassigned operational tasks from the team backlog.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('allowWorkerSelfAssignment')}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                permissions.allowWorkerSelfAssignment ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  permissions.allowWorkerSelfAssignment ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition flex items-center space-x-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>{isSaving ? 'Saving...' : 'Apply Permissions'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

