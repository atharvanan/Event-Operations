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
      } else if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setError('Unsupported format. Please select JPEG, PNG, WebP, or MP4 video.');
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
          <Camera className="w-4 h-4 text-blue-600" />
          <span>Capture Proof of Work</span>
        </h4>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Take Photo or Choose Proof File
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports live camera capture, JPEG, PNG, or short MP4 video
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview Container */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-48 flex items-center justify-center">
            {selectedFile.type.startsWith('video/') ? (
              <video src={previewUrl || ''} controls className="max-h-48 max-w-full object-contain" />
            ) : (
              <img src={previewUrl || ''} alt="Preview" className="max-h-48 max-w-full object-contain" />
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 p-1.5 bg-slate-950/80 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Proof Caption / Note
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe what has been completed in this photo..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Task Stage:</span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setStage('during_progress')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    stage === 'during_progress'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  In-Progress
                </button>
                <button
                  type="button"
                  onClick={() => setStage('completion_proof')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    stage === 'completion_proof'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  Final Proof
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>Uploading proof...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || isCompressing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Proof...</span>
                </>
              ) : isCompressing ? (
                <span>Optimizing photo...</span>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
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

