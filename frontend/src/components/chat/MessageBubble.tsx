'use client';

import React from 'react';
import { IMessage, MessageType } from '@shared/types';
import { AudioPlayer } from './AudioPlayer';
import { KanbanSquare, Check, CheckCheck, ExternalLink } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isOutgoing: boolean;
  onOpenTask?: (taskId: string) => void;
  onOpenImage?: (imageUrl: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOutgoing,
  onOpenTask,
  onOpenImage,
}) => {
  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const fullMediaUrl = message.mediaUrl
    ? message.mediaUrl.startsWith('http')
      ? message.mediaUrl
      : `${backendUrl}${message.mediaUrl}`
    : '';

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col mb-3 ${isOutgoing ? 'items-end' : 'items-start'}`}>
      {/* Sender Name for incoming messages */}
      {!isOutgoing && message.senderId && (
        <span className="text-xs font-bold text-[#524D6B] dark:text-brand-200 mb-1 ml-1">
          {message.senderId.name}
        </span>
      )}

      <div
        className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] sm:max-w-md shadow-sm space-y-1.5 ${
          isOutgoing
            ? 'bg-brand-600 text-white rounded-tr-xs'
            : 'bg-white dark:bg-[#18132B] text-[#1A162E] dark:text-white border border-brand-200/70 dark:border-brand-800/60 rounded-tl-xs'
        }`}
      >
        {/* Reply context if any */}
        {message.replyToMessageId && (
          <div
            className={`p-1.5 rounded-lg text-xs border-l-2 mb-1 opacity-90 truncate ${
              isOutgoing
                ? 'bg-brand-700/60 border-white text-white'
                : 'bg-brand-50/70 dark:bg-[#221C3E] border-brand-600 text-[#4B4566] dark:text-brand-200'
            }`}
          >
            <span className="font-bold block">
              {message.replyToMessageId.senderId?.name || 'Message'}
            </span>
            <span className="truncate">{message.replyToMessageId.content}</span>
          </div>
        )}

        {/* 1. Text Message */}
        {message.messageType === MessageType.TEXT && (
          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
            {message.content}
          </p>
        )}

        {/* 2. Voice Note Message */}
        {message.messageType === MessageType.VOICE_NOTE && (
          <div className="py-0.5">
            <AudioPlayer
              src={fullMediaUrl}
              durationSeconds={message.voiceDurationSeconds}
              isOutgoing={isOutgoing}
            />
          </div>
        )}

        {/* 3. Photo Attachment */}
        {message.messageType === MessageType.PHOTO && fullMediaUrl && (
          <button
            type="button"
            aria-label="View photo attachment in full size"
            onClick={() => onOpenImage && onOpenImage(fullMediaUrl)}
            className="rounded-xl overflow-hidden cursor-pointer max-h-60 max-w-xs block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <img src={fullMediaUrl} alt="Photo attachment sent in chat" className="object-cover w-full h-full rounded-xl" />
          </button>
        )}

        {/* 4. Task Link Reference */}
        {message.taskIdReference && (
          <button
            type="button"
            aria-label={`Open linked task: ${message.taskIdReference.title}`}
            onClick={() => onOpenTask && onOpenTask(message.taskIdReference._id)}
            className={`w-full text-left mt-1 p-2.5 rounded-xl border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isOutgoing
                ? 'bg-brand-700/50 border-brand-300 text-white hover:bg-brand-700/80'
                : 'bg-brand-50/60 dark:bg-[#221C3E] border-brand-200 dark:border-brand-700 hover:border-brand-500'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-95 mb-1">
              <span className="flex items-center">
                <KanbanSquare className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Linked Operational Task
              </span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </div>

            <h5 className="font-extrabold text-xs truncate">
              {message.taskIdReference.title}
            </h5>

            <div className="flex items-center space-x-2 mt-1.5 text-xs font-bold">
              <span className="px-1.5 py-0.5 rounded bg-black/25">
                {message.taskIdReference.priority}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black/25">
                {message.taskIdReference.status}
              </span>
            </div>
          </button>
        )}

        {/* Timestamp & Read Receipt Checkmarks */}
        <div
          className={`flex items-center justify-end space-x-1 text-xs pt-0.5 ${
            isOutgoing ? 'text-brand-100 font-medium' : 'text-[#524D6B] dark:text-brand-300'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOutgoing && (
            <span>
              {message.readBy && message.readBy.length > 1 ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-200" aria-label="Read by team" />
              ) : (
                <Check className="w-3.5 h-3.5" aria-label="Delivered" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

