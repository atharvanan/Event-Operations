'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api';
import { EvidenceLightbox } from '../../../../../components/evidence/EvidenceLightbox';
import { ProtectedMedia } from '../../../../../components/evidence/ProtectedMedia';
import { IEvidence, ITeam, EvidenceReviewStatus } from '@shared/types';
import {
  Camera,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function EvidenceInboxPage() {
  const { t } = useTranslation();
  const params = useParams();
  const eventId = params.eventId as string;
  const { user, currentEvent, currentRole } = useAuth();

  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<IEvidence | null>(null);

  const canReview =
    currentEvent?.managerId === user?._id ||
    currentRole === 'EVENT_MANAGER' ||
    currentRole === 'TEAM_LEAD';

  const fetchEvidenceInbox = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.set('reviewStatus', statusFilter);
      if (teamFilter) queryParams.set('teamId', teamFilter);

      const [evidenceRes, teamsRes] = await Promise.all([
        api.get(`/events/${eventId}/evidence/inbox?${queryParams.toString()}`),
        api.get(`/events/${eventId}/teams`),
      ]);

      setEvidenceItems(evidenceRes.data.data);
      setTeams(teamsRes.data.data);
    } catch (err) {
      console.error('Error fetching evidence inbox', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEvidenceInbox();
    }
  }, [eventId, statusFilter, teamFilter]);

  const handleQuickApprove = async (e: React.MouseEvent, evId: string) => {
    e.stopPropagation();
    try {
      await api.patch(`/evidence/${evId}/review`, {
        reviewStatus: EvidenceReviewStatus.APPROVED,
        reviewNote: 'Verified and approved from Operations Inbox',
      });
      fetchEvidenceInbox();
    } catch (err) {
      console.error('Error approving evidence', err);
    }
  };

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                <Link href={`/events/${eventId}`} className="hover:text-brand-700 dark:hover:text-brand-300">
                  Event Workspace
                </Link>
                <span>/</span>
                <span>Evidence Review Inbox</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('evidence.title')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Inspect, verify, approve, or request changes on submitted proof files
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#18132B] p-4 rounded-3xl border border-brand-200/70 dark:border-brand-800 shadow-card flex flex-col sm:flex-row items-center gap-3">
            <div role="tablist" aria-label="Evidence status filters" className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { label: 'All Proof', value: '' },
                { label: 'Pending Review', value: EvidenceReviewStatus.PENDING },
                { label: 'Approved', value: EvidenceReviewStatus.APPROVED },
                { label: 'Changes Requested', value: EvidenceReviewStatus.REJECTED },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    statusFilter === tab.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-canvas dark:hover:bg-[#221A40]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-auto sm:ml-auto">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                aria-label="Filter evidence by team"
                className="w-full sm:w-52 px-3.5 py-2 min-h-[44px] text-xs sm:text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="">All Teams</option>
                {teams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 animate-pulse"
                />
              ))}
            </div>
          ) : evidenceItems.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#18132B] rounded-3xl border border-dashed border-brand-200 dark:border-brand-800 max-w-md mx-auto p-6">
              <Camera className="w-12 h-12 text-brand-400 mx-auto mb-3" />
              <h2 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                No Evidence in Inbox
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                All submitted proof for this filter has been inspected or no proof has been uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evidenceItems.map((item) => {
                const task = item.taskId;

                return (
                  <article
                    key={item._id}
                    className="group bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 overflow-hidden shadow-card hover:shadow-soft transition-all flex flex-col justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveItem(item)}
                      className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                        <ProtectedMedia
                          fileUrl={item.fileUrl}
                          mediaType={item.mediaType}
                          alt={item.caption || 'Submitted task proof'}
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`text-xs uppercase font-bold px-2.5 py-0.5 rounded-lg shadow-md border ${
                              item.reviewStatus === EvidenceReviewStatus.APPROVED
                                ? 'bg-emerald-700 text-white border-emerald-500'
                                : item.reviewStatus === EvidenceReviewStatus.REJECTED
                                ? 'bg-red-700 text-white border-red-500'
                                : 'bg-amber-600 text-white border-amber-500'
                            }`}
                          >
                            {item.reviewStatus}
                          </span>
                        </div>

                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-6 h-6" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        {task && (
                          <div className="flex items-center space-x-2">
                            {task.teamId && (
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded text-white shadow-sm truncate max-w-[130px]"
                                style={{ backgroundColor: task.teamId.colorHex || '#43328E' }}
                              >
                                {task.teamId.name}
                              </span>
                            )}
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </h3>
                          </div>
                        )}

                        {item.caption && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            &quot;{item.caption}&quot;
                          </p>
                        )}

                        {item.reviewStatus === EvidenceReviewStatus.REJECTED && item.reviewNote && (
                          <p className="text-xs text-red-700 dark:text-red-300 italic font-medium">
                            Feedback: {item.reviewNote}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="p-4 pt-2 border-t border-brand-100 dark:border-brand-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                          {item.uploader ? item.uploader.name : 'Crew Member'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {canReview && item.reviewStatus === EvidenceReviewStatus.PENDING && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickApprove(e, item._id)}
                          className="px-3.5 py-2 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

      {activeItem && (
        <EvidenceLightbox
          evidence={activeItem}
          canReview={canReview}
          onClose={() => setActiveItem(null)}
          onReviewed={() => {
            fetchEvidenceInbox();
          }}
        />
      )}
    </div>
  );
}

