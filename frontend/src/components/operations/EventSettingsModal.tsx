'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Modal } from '../common/Modal';
import { IEventPermissions } from '@shared/types';
import { Check } from 'lucide-react';

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
  const [saveError, setSaveError] = useState('');

  const handleToggle = (key: keyof IEventPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError('');
      const res = await api.patch(`/events/${eventId}/permissions`, permissions);
      if (res.data?.success) {
        setSaveSuccess(true);
        onSaved(res.data.data);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to update event permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const settingsList = [
    {
      key: 'allowWorkersGlobalChat' as const,
      label: 'Worker Posting in Global Event Chat',
      desc: 'Allow field workers to post text, photos, and voice notes to the all-hands event channel.',
    },
    {
      key: 'allowWorkersTeamChat' as const,
      label: 'Worker Posting in Team Internal Chat',
      desc: 'Allow crew members to post messages in their respective department channels.',
    },
    {
      key: 'requireLeadReviewFirst' as const,
      label: 'Two-Tier Verification Gate (Lead Review First)',
      desc: 'Require the designated Team Lead to review and approve photo/video proof before final sign-off.',
    },
    {
      key: 'allowLeadTaskCreation' as const,
      label: 'Team Lead Microtask Assignment',
      desc: 'Empower Team Leads to decompose parent outcomes into microtasks and assign directly to crew.',
    },
    {
      key: 'allowWorkerSelfAssignment' as const,
      label: 'Worker Self-Assignment',
      desc: 'Allow unassigned workers to claim open unassigned operational tasks from the team backlog.',
    },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Operations & Access Permissions"
      description="Configure role access, chat permissions, and verification gates"
      maxWidth="xl"
    >
      {saveError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-300 dark:border-red-800"
        >
          {saveError}
        </div>
      )}

      <div className="space-y-3.5">
        {settingsList.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-brand-50/50 dark:bg-[#221C3E] border border-brand-200/70 dark:border-brand-800/60 gap-3"
          >
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-black text-[#1A162E] dark:text-white block">
                {label}
              </span>
              <span className="text-xs text-[#524D6B] dark:text-brand-200 font-medium block">
                {desc}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={permissions[key]}
              aria-label={label}
              onClick={() => handleToggle(key)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 min-h-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${permissions[key] ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${permissions[key] ? 'translate-x-6' : ''
                  }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-brand-100 dark:border-brand-800/60">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Saved!</span>
            </>
          ) : (
            <span>{isSaving ? 'Saving...' : 'Apply Permissions'}</span>
          )}
        </button>
      </div>
    </Modal>
  );
}

