'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../../lib/api';
import { TeamCard } from '../../../../../components/teams/TeamCard';
import { CreateTeamModal } from '../../../../../components/teams/CreateTeamModal';
import { ITeam } from '@shared/types';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';

export default function TeamsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [teams, setTeams] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/events/${eventId}/teams`);
      setTeams(res.data.data);
    } catch (err) {
      console.error('Error fetching teams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchTeams();
    }
  }, [eventId]);

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                <Link href={`/events/${eventId}`} className="hover:text-brand-700 dark:hover:text-brand-300">
                  Event Workspace
                </Link>
                <span>/</span>
                <span>Teams</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Operational Teams & Roster
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Appoint team leads, allocate workers, and track execution readiness per department
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Operational Team</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56 bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 animate-pulse"
                />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#18132B] rounded-3xl border border-dashed border-brand-200 dark:border-brand-800 max-w-md mx-auto p-6">
              <Users className="w-12 h-12 text-brand-400 mx-auto mb-3" />
              <h2 className="font-bold text-base text-slate-900 dark:text-white mb-1">No Teams Created</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Start by setting up operational teams like Catering, Stage Decor, or Sound & Lighting.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-sm font-bold shadow-sm"
              >
                Add First Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((tm) => (
                <TeamCard
                  key={tm._id}
                  team={tm}
                  onClick={() => router.push(`/events/${eventId}/tasks?teamId=${tm._id}`)}
                />
              ))}
            </div>
          )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <CreateTeamModal
          eventId={eventId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchTeams();
          }}
        />
      )}
    </div>
  );
}

