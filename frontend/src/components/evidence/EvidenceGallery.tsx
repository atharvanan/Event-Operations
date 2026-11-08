'use client';

import React, { useState } from 'react';
import { IEvidence, EvidenceReviewStatus } from '@shared/types';
import { EvidenceLightbox } from './EvidenceLightbox';
import { Camera, Video, CheckCircle2, AlertTriangle, Clock, Eye } from 'lucide-react';

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
        <p className="text-[11px] text-slate-400 mt-0.5">
          Attach photo or video evidence to document on-ground completion.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {evidenceList.map((item) => {
          const fullMediaUrl = item.fileUrl.startsWith('http')
            ? item.fileUrl
            : `${backendUrl}${item.fileUrl}`;

          return (
            <div
              key={item._id}
              onClick={() => setActiveItem(item)}
              className="group relative rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              {item.mediaType === 'VIDEO' ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <Video className="w-8 h-8 text-slate-300" />
                </div>
              ) : (
                <img
                  src={fullMediaUrl}
                  alt={item.caption || 'Evidence'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )}

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded shadow-md border ${
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

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye className="w-5 h-5" />
              </div>

              {/* Caption Bar */}
              {item.caption && (
                <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-slate-950/80 to-transparent">
                  <p className="text-[10px] text-white font-medium truncate">{item.caption}</p>
                </div>
              )}
            </div>
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

