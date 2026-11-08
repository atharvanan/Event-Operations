'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api';
import { Navbar } from '../../../../../components/layout/Navbar';
import { Sidebar } from '../../../../../components/layout/Sidebar';
import { BottomNav } from '../../../../../components/layout/BottomNav';
import { EvidenceLightbox } from '../../../../../components/evidence/EvidenceLightbox';
import { IEvidence, ITeam, EvidenceReviewStatus } from '@shared/types';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Filter,
  Eye,
  Video,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function EvidenceInboxPage() {
  const { t } = useTranslation();
  const params = useParams();
  const eventId = params.eventId as string;
  const { user, currentEvent } = useAuth();

  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<IEvidence | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const isManager = currentEvent?.managerId === user?._id;

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="flex-1 flex pb-16 md:pb-0">
        <Sidebar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
                <Link href={`/events/${eventId}`} className="hover:text-blue-600">
                  Dashboard
                </Link>
                <span>/</span>
                <span>Evidence Review Inbox</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('evidence.title')}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Inspect, verify, approve, or request rework on submitted on-ground photographic and video proof
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { label: 'All Proof', value: '' },
                { label: 'Pending Review', value: EvidenceReviewStatus.PENDING },
                { label: 'Approved', value: EvidenceReviewStatus.APPROVED },
                { label: 'Rework Required', value: EvidenceReviewStatus.REJECTED },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    statusFilter === tab.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Department Filter */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="">All Teams / Depts</option>
                {teams.map((tm) => (
                  <option key={tm._id} value={tm._id}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inbox Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : evidenceItems.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 max-w-md mx-auto p-6">
              <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                No Evidence in Inbox
              </h3>
              <p className="text-xs text-slate-500">
                All submitted proof for this filter has been inspected or no proof has been uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evidenceItems.map((item) => {
                const fullMediaUrl = item.fileUrl.startsWith('http')
                  ? item.fileUrl
                  : `${backendUrl}${item.fileUrl}`;

                const task = item.taskId;

                return (
                  <div
                    key={item._id}
                    onClick={() => setActiveItem(item)}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Media Thumbnail */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                        {item.mediaType === 'VIDEO' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                            <Video className="w-10 h-10" />
                          </div>
                        ) : (
                          <img
                            src={fullMediaUrl}
                            alt={item.caption || 'Proof'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        )}

                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`text-[9px] uppercase font-black px-2 py-0.5 rounded shadow-md border ${
                              item.reviewStatus === EvidenceReviewStatus.APPROVED
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : item.reviewStatus === EvidenceReviewStatus.REJECTED
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-amber-500 text-white border-amber-400'
                            }`}
                          >
                            {item.reviewStatus}
                          </span>
                        </div>

                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-6 h-6" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        {task && (
                          <div className="flex items-center space-x-2">
                            {task.teamId && (
                              <span
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded text-white shadow-sm truncate max-w-[120px]"
                                style={{ backgroundColor: task.teamId.colorHex || '#3B82F6' }}
                              >
                                {task.teamId.name}
                              </span>
                            )}
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </h4>
                          </div>
                        )}

                        {item.caption && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            "{item.caption}"
                          </p>
                        )}

                        {item.reviewStatus === EvidenceReviewStatus.REJECTED && item.reviewNote && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 italic font-medium">
                            Feedback: {item.reviewNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                          {item.uploader ? item.uploader.name : 'Worker'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* 1-Click Approve if pending */}
                      {item.reviewStatus === EvidenceReviewStatus.PENDING && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickApprove(e, item._id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <BottomNav />

      {/* Lightbox Modal */}
      {activeItem && (
        <EvidenceLightbox
          evidence={activeItem}
          canReview={isManager}
          onClose={() => setActiveItem(null)}
          onReviewed={() => {
            fetchEvidenceInbox();
          }}
        />
      )}
    </div>
  );
}

