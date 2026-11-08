'use client';

import React, { useState } from 'react';
import { IEvidence, EvidenceReviewStatus } from '@shared/types';
import { api } from '../../lib/api';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  User as UserIcon,
  Download,
} from 'lucide-react';

interface EvidenceLightboxProps {
  evidence: IEvidence;
  canReview?: boolean;
  onClose: () => void;
  onReviewed: (updated: IEvidence) => void;
}

export const EvidenceLightbox: React.FC<EvidenceLightboxProps> = ({
  evidence,
  canReview = false,
  onClose,
  onReviewed,
}) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const fullMediaUrl = evidence.fileUrl.startsWith('http')
    ? evidence.fileUrl
    : `${backendUrl}${evidence.fileUrl}`;

  const handleReview = async (reviewStatus: EvidenceReviewStatus, flagTaskRework = false) => {
    try {
      setIsSubmitting(true);
      setError('');

      const res = await api.patch(`/evidence/${evidence._id}/review`, {
        reviewStatus,
        reviewNote: rejectNote || undefined,
        flagTaskRework,
      });

      onReviewed(res.data.data);
      setShowRejectInput(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error reviewing proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 font-bold flex items-center justify-center text-xs">
            {evidence.uploader ? evidence.uploader.name.charAt(0) : 'U'}
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm block">
              {evidence.uploader ? evidence.uploader.name : 'Team Member'}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(evidence.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md border ${
              evidence.reviewStatus === EvidenceReviewStatus.APPROVED
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : evidence.reviewStatus === EvidenceReviewStatus.REJECTED
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-amber-950 text-amber-300 border-amber-700'
            }`}
          >
            {evidence.reviewStatus}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Center */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center my-4 overflow-hidden">
        {evidence.mediaType === 'VIDEO' ? (
          <video
            src={fullMediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[65vh] max-w-full rounded-xl shadow-2xl object-contain border border-slate-800"
          />
        ) : (
          <img
            src={fullMediaUrl}
            alt={evidence.caption || 'Evidence proof'}
            className="max-h-[65vh] max-w-full rounded-xl shadow-2xl object-contain border border-slate-800"
          />
        )}
      </div>

      {/* Caption & Reviewer Actions */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-white space-y-3">
        {evidence.caption && (
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            "{evidence.caption}"
          </p>
        )}

        {evidence.reviewStatus === EvidenceReviewStatus.REJECTED && evidence.reviewNote && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Rejection Feedback:</span>
              <span>{evidence.reviewNote}</span>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {showRejectInput ? (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300">
              Reason for rejecting proof / requesting rework:
            </label>
            <textarea
              rows={2}
              required
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Photo is out of focus, or the floral arch ties are visible..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectNote.trim() || isSubmitting}
                onClick={() => handleReview(EvidenceReviewStatus.REJECTED, true)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
              >
                Reject & Flag Rework
              </button>
            </div>
          </div>
        ) : (
          canReview && (
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-900/60 text-xs font-bold rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Rework</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview(EvidenceReviewStatus.APPROVED)}
                className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Proof</span>
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

