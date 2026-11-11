'use client';

import React, { useEffect, useState } from 'react';
import { resolveAssetUrl, openProtectedFile } from '../../lib/api';
import { FileText, Video, Music, Loader2, ExternalLink } from 'lucide-react';

interface ProtectedMediaProps {
  fileUrl: string;
  mediaType: string;
  alt: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
}

export const ProtectedMedia: React.FC<ProtectedMediaProps> = ({
  fileUrl,
  mediaType,
  alt,
  className = '',
  controls = false,
  muted = true,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    const load = async () => {
      if (!fileUrl) {
        setLoading(false);
        return;
      }
      if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
        setBlobUrl(fileUrl);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('eventops_token') : null;
        const res = await fetch(resolveAssetUrl(fileUrl), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(createdUrl);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-brand-950/10 dark:bg-brand-900/40 text-slate-600 dark:text-slate-300 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (mediaType === 'DOCUMENT' || failed) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-canvas dark:bg-[#221A40] text-center space-y-2 ${className}`}>
        <FileText className="w-10 h-10 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-xs truncate">
          {alt || 'Uploaded Document'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openProtectedFile(fileUrl);
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-brand-600 text-white text-xs font-bold"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Open File</span>
        </button>
      </div>
    );
  }

  if (mediaType === 'VIDEO') {
    return controls ? (
      <video src={blobUrl} controls playsInline muted={muted} className={className} />
    ) : (
      <div className={`flex flex-col items-center justify-center bg-slate-900 text-white ${className}`}>
        <Video className="w-9 h-9 text-brand-300" aria-hidden="true" />
      </div>
    );
  }

  if (mediaType === 'AUDIO') {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-canvas dark:bg-[#221A40] space-y-2 ${className}`}>
        <Music className="w-8 h-8 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        <audio src={blobUrl} controls className="max-w-full" />
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
};

