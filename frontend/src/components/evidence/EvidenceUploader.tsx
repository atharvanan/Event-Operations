'use client';

import React, { useState, useRef } from 'react';
import { api } from '../../lib/api';
import { compressImage } from '../../lib/compression';
import { IEvidence } from '@shared/types';
import { Camera, Video, Upload, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

interface EvidenceUploaderProps {
  taskId: string;
  onUploaded: (evidence: IEvidence) => void;
  onCancel?: () => void;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({ taskId, onUploaded, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [stage, setStage] = useState<'during_progress' | 'completion_proof'>('completion_proof');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Check size limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum 15MB limit. Please upload a smaller video or compressed photo.');
      return;
    }

    try {
      if (file.type.startsWith('image/')) {
        setIsCompressing(true);
        const compressed = await compressImage(file);
        setSelectedFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
        setIsCompressing(false);
      } else if (
        file.type.startsWith('video/') ||
        file.type === 'application/pdf' ||
        file.type === 'text/plain' ||
        file.type === 'text/csv'
      ) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setError('Unsupported format. Please select JPEG, PNG, WebP, MP4, PDF, or CSV.');
      }
    } catch (err) {
      console.error('Error compressing image', err);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsCompressing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or capture a photo/video first.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      formData.append('stage', stage);

      const res = await api.post(`/tasks/${taskId}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      onUploaded(res.data.data);
      // Reset
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading evidence proof. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
          <Camera className="w-4 h-4 text-brand-600" />
          <span>Capture Proof of Work</span>
        </h4>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-300 dark:border-red-800 flex items-center space-x-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        id="evidence-file-input"
        type="file"
        accept="image/*,video/mp4,video/webm,.pdf,.csv,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Take photo or choose proof file from device"
          className="w-full border-2 border-dashed border-brand-200 dark:border-brand-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 bg-brand-50/40 dark:bg-[#221C3E]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 flex items-center justify-center shadow-sm" aria-hidden="true">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1A162E] dark:text-white">
              Take Photo or Choose Proof File
            </p>
            <p className="text-xs text-[#524D6B] dark:text-brand-200 mt-0.5">
              Supports live camera capture, JPEG, PNG, PDF, CSV, or short MP4 video
            </p>
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Preview Container */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-48 flex items-center justify-center">
            {selectedFile.type.startsWith('video/') ? (
              <video src={previewUrl || ''} controls playsInline className="max-h-48 max-w-full object-contain" />
            ) : selectedFile.type.startsWith('image/') ? (
              <img src={previewUrl || ''} alt="Selected proof preview" className="max-h-48 max-w-full object-contain" />
            ) : (
              <div className="p-6 text-center text-white text-xs font-semibold">
                Document selected: {selectedFile.name}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              aria-label="Remove selected file"
              className="absolute top-2 right-2 p-1.5 min-w-[36px] min-h-[36px] bg-slate-950/80 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label htmlFor="evidence-caption" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Proof Caption / Note
              </label>
              <input
                id="evidence-caption"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe what has been completed in this photo..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221C3E] text-[#1A162E] dark:text-white placeholder:text-[#645E80] dark:placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span id="evidence-stage-label" className="text-[#524D6B] dark:text-brand-200 font-semibold text-xs">Task Stage:</span>
              <div role="radiogroup" aria-labelledby="evidence-stage-label" className="flex items-center space-x-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={stage === 'during_progress'}
                  onClick={() => setStage('during_progress')}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    stage === 'during_progress'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'border-brand-200 dark:border-brand-700 text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900'
                  }`}
                >
                  In-Progress
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={stage === 'completion_proof'}
                  onClick={() => setStage('completion_proof')}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    stage === 'completion_proof'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'border-brand-200 dark:border-brand-700 text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900'
                  }`}
                >
                  Final Proof
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-[#524D6B] dark:text-brand-200 font-bold">
                  <span>Uploading proof...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                  className="w-full h-2 bg-brand-100 dark:bg-brand-900 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || isCompressing}
              className="w-full py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 disabled:opacity-60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Uploading Proof...</span>
                </>
              ) : isCompressing ? (
                <span>Optimizing photo...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Submit Proof for Review</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

