'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';
import { Mic, Square, Trash2, Send, Pause, Play, AlertCircle, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  conversationId?: string;
  onVoiceNoteSent?: (msg: any) => void;
  onRecorded?: (blob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  conversationId,
  onVoiceNoteSent,
  onRecorded,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Voice recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
        setPreviewAudioUrl(URL.createObjectURL(audioBlob));
        // Stop audio stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Collect chunks every 250ms
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access to record voice notes.');
      } else {
        setError('Unable to access microphone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    try {
      setIsUploading(true);
      setError('');

      if (onRecorded) {
        onRecorded(audioBlob, duration);
        onCancel();
        return;
      }

      if (!conversationId) {
        setError('No conversation ID provided');
        return;
      }

      const formData = new FormData();
      formData.append('file', audioBlob, `voice_${Date.now()}.webm`);
      formData.append('durationSeconds', duration.toString());

      const res = await api.post(`/conversations/${conversationId}/voice-note`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onVoiceNoteSent) onVoiceNoteSent(res.data.data);
      onCancel();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading voice note.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-lg animate-in slide-in-from-bottom-2 duration-150">
      {error ? (
        <div className="flex items-center justify-between w-full text-xs text-red-400 px-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 min-h-[36px] bg-slate-800 text-white rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      ) : isRecording ? (
        <div className="flex items-center justify-between w-full">
          {/* Recording pulse & Timer */}
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs font-bold">{formatTimer(duration)}</span>
            <span className="text-xs text-slate-300">Recording voice note...</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel recording"
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 rounded-lg text-xs"
              title="Cancel"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1.5 min-h-[36px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        /* Preview and Send State */
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex items-center space-x-2">
            <audio src={previewAudioUrl || ''} controls className="h-8 max-w-[200px]" />
            <span className="text-xs text-slate-300">{formatTimer(duration)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Discard voice note"
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 rounded-lg"
              title="Discard"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={handleSend}
              className="px-4 py-1.5 min-h-[36px] bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Voice Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

