'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { queueOfflineAction, getPendingActions } from '../../lib/offlineQueue';
import { IAttendee, IEvent } from '@shared/types';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
  Ticket,
  Shield,
} from 'lucide-react';

interface QrScannerViewProps {
  initialEventId?: string;
}

type CheckInFeedback = {
  kind: 'valid' | 'duplicate' | 'invalid' | 'offline_pending';
  title: string;
  subtitle: string;
  attendee?: IAttendee;
};

export const QrScannerView: React.FC<QrScannerViewProps> = ({ initialEventId }) => {
  const { t } = useTranslation();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [attendees, setAttendees] = useState<IAttendee[]>([]);
  const [stats, setStats] = useState({ registeredCount: 0, checkedInCount: 0, capacity: 0 });
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resultFeedback, setResultFeedback] = useState<CheckInFeedback | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; at: number } | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const loadEventsAndPending = useCallback(async () => {
    try {
      const res = await api.get('/events');
      const list: IEvent[] = res.data?.data || [];
      setEvents(list);
      if (!selectedEventId && list[0]?._id) {
        setSelectedEventId(list[0]._id);
      }
    } catch {
      // Transient offline
    }
    const actions = await getPendingActions();
    setPendingQueueCount(actions.filter((a) => a.type === 'ATTENDEE_CHECKIN').length);
  }, [selectedEventId]);

  useEffect(() => {
    loadEventsAndPending();
    const handler = () => loadEventsAndPending();
    window.addEventListener('offline-queue-changed', handler);
    return () => window.removeEventListener('offline-queue-changed', handler);
  }, [loadEventsAndPending]);

  const loadEventAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await api.get(`/events/${selectedEventId}/attendees`);
      setAttendees(res.data?.data?.attendees || []);
      setStats(res.data?.data?.stats || { registeredCount: 0, checkedInCount: 0, capacity: 0 });
    } catch {
      // Handled gracefully offline
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEventAttendees();
  }, [loadEventAttendees]);

  const submitCheckInPayload = useCallback(
    async (rawInput: string, specificAttendee?: IAttendee) => {
      if (!selectedEventId || processing) return;
      const trimmed = rawInput.trim();
      if (!trimmed && !specificAttendee) return;

      setProcessing(true);
      const idempotencyKey = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: any = { idempotencyKey };

      if (specificAttendee) {
        payload.attendeeId = specificAttendee._id;
        payload.ticketCode = specificAttendee.ticketCode;
      } else if (trimmed.startsWith('EVENTOPS:')) {
        payload.qrPayload = trimmed;
      } else {
        payload.ticketCode = trimmed;
      }

      try {
        const res = await api.post(`/events/${selectedEventId}/attendees/check-in`, payload);
        const att = res.data?.data as IAttendee;
        setResultFeedback({
          kind: 'valid',
          title: `Checked In — ${att.name}`,
          subtitle: `${att.ticketType} Pass · Ticket ${att.ticketCode}`,
          attendee: att,
        });
        setManualInput('');
        await loadEventAttendees();
      } catch (err: any) {
        if (!err.response || !navigator.onLine) {
          await queueOfflineAction({
            type: 'ATTENDEE_CHECKIN',
            endpoint: `/events/${selectedEventId}/attendees/check-in`,
            method: 'POST',
            payload,
            label: `Check-in ${specificAttendee ? specificAttendee.name : trimmed}`,
          });
          await loadEventsAndPending();
          setResultFeedback({
            kind: 'offline_pending',
            title: 'Queued Offline — Pending Sync',
            subtitle: `Scan saved locally (${specificAttendee?.ticketCode || trimmed}). Will confirm with server once reconnected.`,
            attendee: specificAttendee,
          });
        } else {
          const code = err.response?.data?.code;
          const msg = err.response?.data?.message || 'Check-in unsuccessful.';
          const existingAtt = err.response?.data?.data as IAttendee | undefined;
          if (code === 'ALREADY_CHECKED_IN') {
            setResultFeedback({
              kind: 'duplicate',
              title: `Already Checked In${existingAtt?.name ? ` — ${existingAtt.name}` : ''}`,
              subtitle: msg,
              attendee: existingAtt,
            });
          } else {
            setResultFeedback({
              kind: 'invalid',
              title: 'Ticket Not Validated',
              subtitle: msg,
            });
          }
        }
      } finally {
        setProcessing(false);
      }
    },
    [selectedEventId, processing, loadEventAttendees, loadEventsAndPending]
  );

  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    let detectedValue: string | null = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes?.[0]?.rawValue) {
          detectedValue = barcodes[0].rawValue;
        }
      } catch {
        // Fallback smoothly to jsQR below
      }
    }

    if (!detectedValue) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const qr = jsQR(imgData.data, width, height, { inversionAttempts: 'dontInvert' });
      if (qr?.data) {
        detectedValue = qr.data;
      }
    }

    if (detectedValue) {
      const now = Date.now();
      const prev = lastScannedCodeRef.current;
      if (!prev || prev.code !== detectedValue || now - prev.at > 3000) {
        lastScannedCodeRef.current = { code: detectedValue, at: now };
        stopCamera();
        submitCheckInPayload(detectedValue);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, submitCheckInPayload]);

  const handleStartScanning = async () => {
    setCameraError('');
    if (!selectedEventId) {
      setCameraError('Please choose an event first.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser. Use manual ticket lookup below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      // Attach stream after state updates video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      }, 60);
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was detected. Allow camera access in your browser site settings or use Manual Ticket Lookup below.'
      );
      setScanning(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await submitCheckInPayload(manualInput.trim());
  };

  const matchingSuggestions =
    manualInput.trim().length >= 2
      ? attendees
          .filter(
            (a) =>
              a.name.toLowerCase().includes(manualInput.toLowerCase()) ||
              a.ticketCode.toLowerCase().includes(manualInput.toLowerCase()) ||
              a.email.toLowerCase().includes(manualInput.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const activeEvent = events.find((e) => e._id === selectedEventId);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header matching Reference Check-in Screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Link
            href={initialEventId ? `/events/${initialEventId}` : '/home'}
            aria-label={initialEventId ? 'Back to Event Workspace' : 'Back to Home'}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-white dark:bg-[#18132B] border border-brand-200/80 dark:border-brand-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-brand-50 shadow-card"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('check_in.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {activeEvent ? `${activeEvent.name} · ` : ''}
              {stats.checkedInCount} of {stats.registeredCount} guests checked in
            </p>
          </div>
        </div>

        {!initialEventId && events.length > 0 && (
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setResultFeedback(null);
            }}
            aria-label="Select event for check-in"
            className="w-full sm:w-64 px-3.5 py-2.5 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#18132B] text-sm font-semibold text-slate-900 dark:text-white shadow-card"
          >
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {pendingQueueCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-pastel-orange dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center space-x-2.5 text-sm font-semibold text-amber-950 dark:text-amber-200">
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {pendingQueueCount} offline check-in{pendingQueueCount > 1 ? 's' : ''} awaiting server confirmation (Pending Sync).
          </span>
        </div>
      )}

      {/* Main Scanner Card matching Bottom-Right Screenshot Frame */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl p-6 sm:p-8 border border-brand-200/70 dark:border-brand-800/70 shadow-card grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Viewfinder */}
        <div className="md:col-span-5 flex flex-col items-center space-y-4">
          <div className="relative w-60 h-60 rounded-3xl bg-canvas dark:bg-[#221A40] flex items-center justify-center p-4 overflow-hidden border border-brand-200/60 dark:border-brand-800">
            {/* Corner Brackets */}
            <span aria-hidden="true" className="absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-brand-600 rounded-tl-xl" />
            <span aria-hidden="true" className="absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-brand-600 rounded-tr-xl" />
            <span aria-hidden="true" className="absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-brand-600 rounded-bl-xl" />
            <span aria-hidden="true" className="absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-brand-600 rounded-br-xl" />

            {scanning ? (
              <video
                ref={videoRef}
                playsInline
                muted
                aria-label="Live QR scanner camera feed"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <QrCode className="w-24 h-24 text-brand-900 dark:text-white stroke-[1.5]" aria-hidden="true" />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          </div>

          <span
            className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold ${
              scanning
                ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100'
                : 'bg-pastel-green text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{scanning ? 'Camera Active — Point at QR' : t('check_in.ready_to_scan')}</span>
          </span>
        </div>

        {/* Right Controls & Privacy Note */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('check_in.scan_heading')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t('check_in.scan_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!scanning ? (
              <button
                type="button"
                onClick={handleStartScanning}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 min-h-[48px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span>{t('check_in.start_scanning')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 min-h-[48px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <CameraOff className="w-5 h-5" aria-hidden="true" />
                <span>{t('check_in.stop_scanning')}</span>
              </button>
            )}
          </div>

          <p className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-300 bg-canvas dark:bg-[#221A40] p-3 rounded-2xl border border-brand-100 dark:border-brand-800">
            <Shield className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t('check_in.camera_permission_note')}</span>
          </p>

          {cameraError && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm font-medium text-amber-950 dark:text-amber-200"
            >
              {cameraError}
            </div>
          )}

          {/* Manual Lookup Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 space-y-2.5 border-t border-brand-100 dark:border-brand-800">
            <label htmlFor="manual-ticket-input" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('check_in.manual_label')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-brand-600 absolute left-3.5 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="manual-ticket-input"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={t('check_in.manual_placeholder')}
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={processing || !manualInput.trim()}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold disabled:opacity-50 shrink-0"
              >
                {processing ? 'Checking...' : 'Check In'}
              </button>
            </div>

            {matchingSuggestions.length > 0 && (
              <ul className="rounded-2xl border border-brand-200 dark:border-brand-700 divide-y divide-brand-100 dark:divide-brand-800 bg-canvas dark:bg-[#221A40] overflow-hidden">
                {matchingSuggestions.map((att) => (
                  <li key={att._id}>
                    <button
                      type="button"
                      onClick={() => submitCheckInPayload(att.ticketCode, att)}
                      className="w-full flex items-center justify-between px-4 py-2.5 min-h-[44px] text-left hover:bg-pastel-purple/60 dark:hover:bg-brand-900/50 text-sm"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {att.name} <span className="font-mono text-xs text-brand-700 dark:text-brand-300 ml-1">({att.ticketCode})</span>
                      </span>
                      <span className="text-xs font-bold text-brand-700 dark:text-brand-200">
                        {att.status === 'checked_in' ? 'Already Checked In' : 'Check In ->'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>
      </div>

      {/* Scan Verification Result Banner */}
      {resultFeedback && (
        <div
          role="status"
          aria-live="assertive"
          className={`rounded-3xl p-5 border flex items-start justify-between gap-4 shadow-card ${
            resultFeedback.kind === 'valid'
              ? 'bg-pastel-green border-emerald-300 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-100'
              : resultFeedback.kind === 'duplicate' || resultFeedback.kind === 'offline_pending'
              ? 'bg-pastel-orange border-amber-300 text-amber-950 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-100'
              : 'bg-red-50 border-red-300 text-red-950 dark:bg-red-950/70 dark:border-red-700 dark:text-red-100'
          }`}
        >
          <div className="flex items-start space-x-3">
            {resultFeedback.kind === 'valid' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
            ) : resultFeedback.kind === 'duplicate' || resultFeedback.kind === 'offline_pending' ? (
              <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <XCircle className="w-6 h-6 text-red-700 dark:text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <h3 className="text-base font-extrabold">{resultFeedback.title}</h3>
              <p className="text-sm font-medium mt-0.5">{resultFeedback.subtitle}</p>
            </div>
          </div>

          {resultFeedback.attendee && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white/80 dark:bg-black/25 text-xs font-bold shrink-0">
              <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{resultFeedback.attendee.ticketCode}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

