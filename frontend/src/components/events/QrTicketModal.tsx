'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../common/Modal';
import { Download, Check, Copy, Ticket, Sparkles } from 'lucide-react';

interface QrTicketModalProps {
  attendee: {
    _id: string;
    name: string;
    email?: string;
    ticketCode: string;
    ticketType?: string;
    status?: string;
    qrPayload?: string;
  } | null;
  eventName?: string;
  onClose: () => void;
}

export const QrTicketModal: React.FC<QrTicketModalProps> = ({
  attendee,
  eventName,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const payload = attendee?.qrPayload || attendee?.ticketCode || '';

  useEffect(() => {
    let active = true;
    if (!attendee || !payload) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#221849',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [attendee, payload]);

  const handleCopyCode = async () => {
    if (!attendee?.ticketCode) return;
    try {
      await navigator.clipboard.writeText(attendee.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl || !attendee) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${attendee.ticketCode || 'eventops-pass'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Modal
      isOpen={Boolean(attendee)}
      onClose={onClose}
      title="Attendee Entry Pass"
      description={eventName ? `Entry pass for ${eventName}` : 'Scannable QR ticket pass'}
      maxWidth="md"
    >
      {attendee && (
        <div className="space-y-5 text-center">
          <div className="rounded-2xl bg-brand-50/70 dark:bg-[#221C3E] border border-brand-200/80 dark:border-brand-700/60 p-4 space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#18132B] text-brand-700 dark:text-brand-200 text-xs font-bold border border-brand-200 dark:border-brand-700 mb-1">
              <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{attendee.ticketType || 'General'} Pass</span>
            </div>
            <h3 className="text-lg font-extrabold text-[#1A162E] dark:text-white">
              {attendee.name}
            </h3>
            {eventName && (
              <p className="text-xs font-semibold text-[#524D6B] dark:text-brand-200">
                {eventName}
              </p>
            )}
          </div>

          <div className="mx-auto w-60 h-60 rounded-2xl bg-white p-3 border border-brand-200/80 shadow-sm flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR entry code for ${attendee.name}, ticket ${attendee.ticketCode}`}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center space-y-2 text-[#524D6B]">
                <Sparkles className="w-6 h-6 animate-pulse" aria-hidden="true" />
                <span className="text-xs font-semibold">Generating QR code...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-[#221C3E] border border-brand-200 dark:border-brand-700 font-mono text-sm font-bold text-[#1A162E] dark:text-white">
              {attendee.ticketCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copy ticket code"
              className="inline-flex items-center space-x-1 px-3 py-2 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-xs font-bold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900/50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-brand-100 dark:border-brand-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download QR</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
