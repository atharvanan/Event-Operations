'use client';

import React, { useState } from 'react';
import { IEvidence, EvidenceReviewStatus } from '@shared/types';
import { EvidenceLightbox } from './EvidenceLightbox';
import { ProtectedMedia } from './ProtectedMedia';
import { Camera, Eye } from 'lucide-react';

interface EvidenceGalleryProps {
  evidenceList: IEvidence[];
  canReview?: boolean;
  onEvidenceUpdated: (updated: IEvidence) => void;
}

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  evidenceList,
  canReview = false,
  onEvidenceUpdated,
}) => {
  const [activeItem, setActiveItem] = useState<IEvidence | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  if (!evidenceList || evidenceList.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">No proof uploaded yet.</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
          Attach photo, video, audio, or document evidence to document completion.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {evidenceList.map((item) => {
          const reviewBadgeStyles: Record<string, string> = {
            [EvidenceReviewStatus.APPROVED]: 'bg-emerald-700 text-white border-emerald-500',
            [EvidenceReviewStatus.REJECTED]: 'bg-red-700 text-white border-red-500',
            [EvidenceReviewStatus.PENDING]: 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950 dark:text-amber-200',
            [EvidenceReviewStatus.CLARIFICATION_REQUESTED]: 'bg-orange-100 text-orange-950 border-orange-400 dark:bg-orange-950 dark:text-orange-200',
          };

          return (
            <button
              key={item._id}
              type="button"
              aria-label={`View evidence proof: ${item.caption || item.mediaType}. Review status: ${item.reviewStatus}.`}
              onClick={() => setActiveItem(item)}
              className="group relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-brand-200/70 dark:border-brand-800 shadow-card hover:shadow-md transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <ProtectedMedia
                fileUrl={item.fileUrl}
                mediaType={item.mediaType}
                alt={item.caption || `Completion proof ${item.reviewStatus.toLowerCase()}`}
                className="w-full h-full object-cover"
              />

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`text-xs uppercase font-bold px-2 py-0.5 rounded-lg shadow-sm border ${
                    reviewBadgeStyles[item.reviewStatus] || 'bg-slate-700 text-white border-slate-600'
                  }`}
                >
                  {item.reviewStatus}
                </span>
              </div>

              {/* Hover / Focus Overlay */}
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye className="w-6 h-6" aria-hidden="true" />
              </div>

              {/* Caption Bar */}
              {item.caption && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950/90 to-transparent">
                  <p className="text-xs text-white font-medium truncate">{item.caption}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activeItem && (
        <EvidenceLightbox
          evidence={activeItem}
          canReview={canReview}
          onClose={() => setActiveItem(null)}
          onReviewed={(updated) => {
            setActiveItem(updated);
            onEvidenceUpdated(updated);
          }}
        />
      )}
    </div>
  );
};

