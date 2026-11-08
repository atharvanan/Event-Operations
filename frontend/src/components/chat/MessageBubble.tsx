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
        <span className="text-[11px] font-bold text-slate-500 mb-1 ml-1">
          {message.senderId.name}
        </span>
      )}

      <div
        className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] sm:max-w-md shadow-sm space-y-1.5 ${
          isOutgoing
            ? 'bg-blue-600 text-white rounded-tr-xs'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
        }`}
      >
        {/* Reply context if any */}
        {message.replyToMessageId && (
          <div
            className={`p-1.5 rounded-lg text-[11px] border-l-2 mb-1 opacity-90 truncate ${
              isOutgoing
                ? 'bg-blue-700/60 border-white text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 border-blue-600 text-slate-600 dark:text-slate-300'
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
          <div
            onClick={() => onOpenImage && onOpenImage(fullMediaUrl)}
            className="rounded-xl overflow-hidden cursor-pointer max-h-60 max-w-xs"
          >
            <img src={fullMediaUrl} alt="Photo attachment" className="object-cover w-full h-full rounded-xl" />
          </div>
        )}

        {/* 4. Task Link Reference */}
        {message.taskIdReference && (
          <div
            onClick={() => onOpenTask && onOpenTask(message.taskIdReference._id)}
            className={`mt-1 p-2.5 rounded-xl border cursor-pointer transition-colors ${
              isOutgoing
                ? 'bg-blue-700/50 border-blue-400 text-white hover:bg-blue-700/80'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-1">
              <span className="flex items-center">
                <KanbanSquare className="w-3 h-3 mr-1" />
                Linked Operational Task
              </span>
              <ExternalLink className="w-3 h-3" />
            </div>

            <h5 className="font-extrabold text-xs truncate">
              {message.taskIdReference.title}
            </h5>

            <div className="flex items-center space-x-2 mt-1.5 text-[10px] font-bold">
              <span className="px-1.5 py-0.5 rounded bg-black/20">
                {message.taskIdReference.priority}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black/20">
                {message.taskIdReference.status}
              </span>
            </div>
          </div>
        )}

        {/* Timestamp & Read Receipt Checkmarks */}
        <div
          className={`flex items-center justify-end space-x-1 text-[10px] pt-0.5 ${
            isOutgoing ? 'text-blue-100' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOutgoing && (
            <span>
              {message.readBy && message.readBy.length > 1 ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

