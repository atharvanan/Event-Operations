'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { ITeam, IUserProfile } from '@shared/types';
import { Modal } from '../common/Modal';

interface CreateTeamModalProps {
  eventId: string;
  onClose: () => void;
  onCreated: (team: ITeam) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ eventId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#2563EB');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const defaultColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Team name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const res = await api.post(`/events/${eventId}/teams`, {
        name,
        description,
        colorHex,
      });

      onCreated(res.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating operational team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Operational Team" maxWidth="md">
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
          <label htmlFor="team-name" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Team Name *
          </label>
          <input
            id="team-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stage & Floral Decor, Catering, AV & Lights, or any custom team name"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="team-description" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1">
            Scope of Responsibility
          </label>
          <textarea
            id="team-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe on-ground outcomes, deliverables, and work area..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div>
          <span id="team-color-label" className="block text-xs font-bold text-[#2B244D] dark:text-brand-100 mb-1.5">
            Team Color Badge
          </span>
          <div
            role="radiogroup"
            aria-labelledby="team-color-label"
            className="flex items-center space-x-2.5 pt-1"
          >
            {defaultColors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={colorHex === c}
                aria-label={`Select color ${c}`}
                onClick={() => setColorHex(c)}
                className={`w-10 h-10 rounded-full border-2 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 ${
                  colorHex === c
                    ? 'border-[#1A162E] dark:border-white scale-110 shadow-md ring-2 ring-brand-500'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
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
            {isSubmitting ? 'Creating Team...' : 'Create Team'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

