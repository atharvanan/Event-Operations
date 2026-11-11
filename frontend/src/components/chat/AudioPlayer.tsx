'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  durationSeconds?: number;
  isOutgoing?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, durationSeconds, isOutgoing = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const fullSrc = src.startsWith('http') || src.startsWith('blob:') ? src : `${backendUrl}${src}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cyclePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      className={`flex items-center space-x-2.5 p-2 rounded-xl max-w-xs ${
        isOutgoing
          ? 'bg-brand-800/70 text-white'
          : 'bg-brand-50/70 dark:bg-[#221C3E] text-[#1A162E] dark:text-white'
      }`}
    >
      <audio ref={audioRef} src={fullSrc} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          isOutgoing
            ? 'bg-white text-brand-700 hover:bg-brand-50'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Progress & Waveform Sim */}
      <div className="flex-1 space-y-1">
        <div className="h-1.5 w-full bg-brand-200 dark:bg-brand-900 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isOutgoing ? 'bg-white' : 'bg-brand-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs opacity-90">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Speed Button */}
      <button
        type="button"
        onClick={cyclePlaybackRate}
        aria-label={`Playback speed ${playbackRate}x`}
        className={`text-xs font-bold px-2 py-1 min-h-[32px] rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          isOutgoing
            ? 'border-brand-300/50 hover:bg-brand-700/60'
            : 'border-brand-200 dark:border-brand-700 hover:bg-brand-100 dark:hover:bg-brand-900'
        }`}
      >
        {playbackRate}x
      </button>
    </div>
  );
};

