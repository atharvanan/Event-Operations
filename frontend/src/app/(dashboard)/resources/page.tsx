'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { openProtectedFile } from '../../../lib/api';
import { Modal } from '../../../components/common/Modal';
import { IEvent, IEventResource } from '@shared/types';
import {
  Package,
  Upload,
  FileText,
  Download,
  Camera,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function GlobalResourcesPage() {
  const { t } = useTranslation();

  const [resources, setResources] = useState<IEventResource[]>([]);
  const [evidenceProofs, setEvidenceProofs] = useState<any[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [tab, setTab] = useState<'all' | 'documents' | 'proofs'>('all');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Upload resource modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upEventId, setUpEventId] = useState('');
  const [upTitle, setUpTitle] = useState('');
  const [upCategory, setUpCategory] = useState('Floor Plan');
  const [upDesc, setUpDesc] = useState('');
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const target = eventFilter || 'all';
      const res = await api.get(`/events/${target}/resources`);
      const data = res.data?.data;
      setResources(data?.resources || []);
      setEvidenceProofs(data?.evidenceProofs || []);
      const evList = data?.events || [];
      setEvents(evList);
      if (!upEventId && evList[0]?._id) setUpEventId(evList[0]._id);
    } catch {
      // Transient offline
    } finally {
      setLoading(false);
    }
  }, [eventFilter, upEventId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upEventId || !upFile) {
      setErrorMsg('Please select an event and file.');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', upFile);
      formData.append('title', upTitle.trim() || upFile.name);
      formData.append('description', upDesc.trim());
      formData.append('category', upCategory);

      await api.post(`/events/${upEventId}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUpTitle('');
      setUpDesc('');
      setUpFile(null);
      setUploadOpen(false);
      await loadResources();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenFile = async (fileUrl: string, fileName?: string) => {
    try {
      await openProtectedFile(fileUrl, fileName);
    } catch {
      setErrorMsg('Unable to download file right now.');
    }
  };

  const showResources = tab === 'all' || tab === 'documents';
  const showProofs = tab === 'all' || tab === 'proofs';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('nav.resources')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Floor plans, briefings, schedules, and verified operational task proof across events.
          </p>
        </div>

        <button
          type="button"
          disabled={events.length === 0}
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm disabled:opacity-50"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>Upload Resource</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-4 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Resource type filter" className="inline-flex rounded-2xl bg-canvas dark:bg-[#221A40] p-1 border border-brand-200/60 dark:border-brand-800">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'documents', label: 'Event Guides' },
            { id: 'proofs', label: 'Task Proof' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id as any)}
              className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold transition-all ${
                tab === item.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-brand-900/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          aria-label="Filter resources by event"
          className="w-full sm:w-64 px-3.5 py-2 min-h-[44px] text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white"
        >
          <option value="all">All Events</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center space-x-2 text-sm text-red-800 dark:text-red-200 font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
          Loading resources...
        </div>
      ) : (
        <div className="space-y-6">
          {showResources && (
            <section aria-labelledby="event-guides-heading" className="space-y-3">
              <h2 id="event-guides-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Shared Event Documents ({resources.length})
              </h2>
              {resources.length === 0 ? (
                <div className="bg-white dark:bg-[#18132B] rounded-3xl p-8 text-center border border-brand-200/70 dark:border-brand-800/70 shadow-card">
                  <Package className="w-9 h-9 text-brand-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No floor plans or run-sheets uploaded yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resItem: any) => (
                    <article
                      key={resItem._id}
                      className="bg-white dark:bg-[#18132B] rounded-3xl p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-pastel-purple text-brand-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" aria-hidden="true" />
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pastel-blue dark:bg-sky-950/60 text-sky-900 dark:text-sky-200">
                            {resItem.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {resItem.title}
                        </h3>
                        {resItem.description && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {resItem.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {resItem.eventId?.name ? `${resItem.eventId.name} · ` : ''}
                          {Math.max(1, Math.round((resItem.fileSizeBytes || 0) / 1024))} KB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenFile(resItem.fileUrl, resItem.fileName)}
                        className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-canvas dark:bg-[#221A40] hover:bg-pastel-purple dark:hover:bg-brand-900/50 text-sm font-semibold text-brand-800 dark:text-brand-200"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>Download File</span>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {showProofs && (
            <section aria-labelledby="task-proofs-heading" className="space-y-3">
              <h2 id="task-proofs-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Operational Task Proof & Attachments ({evidenceProofs.length})
              </h2>
              {evidenceProofs.length === 0 ? (
                <div className="bg-white dark:bg-[#18132B] rounded-3xl p-8 text-center border border-brand-200/70 dark:border-brand-800/70 shadow-card">
                  <Camera className="w-9 h-9 text-brand-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Field proof uploads from checklist tasks will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 shadow-card divide-y divide-brand-100/80 dark:divide-brand-800/80 overflow-hidden">
                  {evidenceProofs.map((ev) => (
                    <div
                      key={ev._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {ev.caption || ev.taskId?.title || 'Task Proof File'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {ev.taskId?.eventId?.name ? `${ev.taskId.eventId.name} · ` : ''}
                          {ev.mediaType} · Uploaded by {ev.uploaderId?.name || 'Crew'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            ev.reviewStatus === 'APPROVED'
                              ? 'bg-pastel-green text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : ev.reviewStatus === 'REJECTED' || ev.reviewStatus === 'CLARIFICATION_REQUESTED'
                              ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200'
                              : 'bg-pastel-orange text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{ev.reviewStatus}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenFile(ev.fileUrl)}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Upload Resource Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Event Resource"
        description="Share floor plans, vendor briefings, schedules, or checklists with your event teams"
        maxWidth="md"
      >
        <form onSubmit={handleUploadResource} className="space-y-4">
          <div>
            <label htmlFor="res-event" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Event *
            </label>
            <select
              id="res-event"
              value={upEventId}
              onChange={(e) => setUpEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="res-title" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Document Title *
              </label>
              <input
                id="res-title"
                type="text"
                required
                value={upTitle}
                onChange={(e) => setUpTitle(e.target.value)}
                placeholder="e.g. Main Hall Floor Plan"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="res-cat" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Category
              </label>
              <select
                id="res-cat"
                value={upCategory}
                onChange={(e) => setUpCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
              >
                <option value="Floor Plan">Floor Plan</option>
                <option value="Schedule">Schedule</option>
                <option value="Checklist">Checklist</option>
                <option value="Briefing">Briefing</option>
                <option value="Media">Media</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="res-desc" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Notes
            </label>
            <textarea
              id="res-desc"
              rows={2}
              value={upDesc}
              onChange={(e) => setUpDesc(e.target.value)}
              placeholder="Optional context for field leads..."
              className="w-full px-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="res-file" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Select File (PDF, Image, CSV, Audio/Video) *
            </label>
            <input
              id="res-file"
              type="file"
              required
              onChange={(e) => setUpFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pastel-purple file:text-brand-800 hover:file:bg-brand-100 min-h-[44px]"
            />
          </div>

          <div className="flex justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

