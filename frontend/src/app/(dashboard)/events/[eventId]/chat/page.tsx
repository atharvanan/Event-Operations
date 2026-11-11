'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { api } from '../../../../../lib/api';
import { useSocket } from '../../../../../hooks/useSocket';
import { MessageBubble } from '../../../../../components/chat/MessageBubble';
import { VoiceRecorder } from '../../../../../components/chat/VoiceRecorder';
import { TaskDetailModal } from '../../../../../components/tasks/TaskDetailModal';
import { ITask, MessageType, ConversationType } from '@shared/types';
import {
  MessageSquare,
  Send,
  Mic,
  Paperclip,
  KanbanSquare,
  Users,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const { t } = useTranslation();
  const params = useParams();
  const eventId = params.eventId as string;
  const { user } = useAuth();
  const { isConnected, joinConversation, leaveConversation, onMessageReceived, onTypingUpdate, emitTyping } =
    useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Task Link sharing
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<ITask[]>([]);
  const [selectedInspectTask, setSelectedInspectTask] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const res = await api.get(`/events/${eventId}/conversations`);
      const convList = res.data.data;
      setConversations(convList);
      if (convList.length > 0 && !activeConversation) {
        setActiveConversation(convList[0]);
      }
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await api.get(`/conversations/${convId}/messages`);
      setMessages(res.data.data);
      joinConversation(convId);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setIsLoadingMessages(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const fetchEventTasks = async () => {
    try {
      const res = await api.get(`/events/${eventId}/tasks`);
      setAvailableTasks(res.data.data);
    } catch (err) {
      console.error('Error fetching tasks for chat share', err);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchConversations();
      fetchEventTasks();
    }
  }, [eventId]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
    }
  }, [activeConversation?._id]);

  // Real-time message listener
  useEffect(() => {
    onMessageReceived((newMsg: any) => {
      if (activeConversation && newMsg.conversationId === activeConversation._id) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 100);
      }

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === newMsg.conversationId
            ? { ...c, lastMessage: newMsg, lastMessageAt: newMsg.createdAt }
            : c
        )
      );
    });

    onTypingUpdate((data: any) => {
      if (activeConversation && data.conversationId === activeConversation._id) {
        if (data.isTyping && data.userId !== user?._id) {
          setTypingUsers((prev) => Array.from(new Set([...prev, data.userName || 'Someone'])));
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
        }
      }
    });
  }, [activeConversation, user?._id, onMessageReceived, onTypingUpdate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    const content = messageText.trim();
    setMessageText('');
    emitTyping(activeConversation._id, false);

    try {
      const res = await api.post(`/conversations/${activeConversation._id}/messages`, {
        content,
        messageType: MessageType.TEXT,
      });

      // Optimistic update if socket doesn't echo back immediately
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const handleShareTask = async (task: ITask) => {
    if (!activeConversation) return;
    try {
      const res = await api.post(`/conversations/${activeConversation._id}/messages`, {
        content: `Shared operational task: ${task.title}`,
        messageType: MessageType.TASK_LINK,
        taskIdReference: task._id,
      });

      setShowTaskPicker(false);
      setMessages((prev) => [...prev, res.data.data]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Error sharing task', err);
    }
  };

  const handleSendPhotoAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('durationSeconds', '0');

      const res = await api.post(`/conversations/${activeConversation._id}/voice-note`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessages((prev) => [...prev, res.data.data]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Error sending photo attachment', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] md:h-[calc(100dvh-7.5rem)] overflow-hidden">
      <div className="flex-1 flex gap-4 h-full overflow-hidden">
          {/* Left Pane: Channels List */}
          <div
            className={`w-full md:w-80 bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 flex flex-col overflow-hidden shrink-0 shadow-card ${
              activeConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search Header */}
            <div className="p-3.5 border-b border-brand-100 dark:border-brand-800">
              <div className="flex items-center justify-between mb-2">
                <h1 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Live Channels
                </h1>
                <Link
                  href={`/events/${eventId}`}
                  className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                >
                  Back to Event
                </Link>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Filter channels..."
                  aria-label="Filter operational channels"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-brand-200 dark:border-brand-700 bg-canvas dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[40px]"
                />
              </div>
            </div>

            {/* Channels List */}
            <div role="tablist" aria-label="Available operational channels" className="flex-1 overflow-y-auto divide-y divide-brand-100/70 dark:divide-brand-800/60 p-1">
              {isLoadingConversations ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading channels...</div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No channels found.</div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = activeConversation?._id === conv._id;
                  return (
                    <button
                      key={conv._id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveConversation(conv)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        isSelected
                          ? 'bg-pastel-purple dark:bg-brand-900/60 border border-brand-200 dark:border-brand-700'
                          : 'hover:bg-canvas dark:hover:bg-[#221A40]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{
                            backgroundColor:
                              conv.type === ConversationType.GLOBAL_EVENT
                                ? '#43328E'
                                : conv.teamId?.colorHex || '#475569',
                          }}
                        >
                          {conv.type === ConversationType.GLOBAL_EVENT ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conv.title}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                          </p>
                        </div>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Window */}
          <div
            className={`flex-1 bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800 flex flex-col overflow-hidden shadow-card ${
              activeConversation ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Header */}
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex items-center space-x-2.5">
                    {/* Back Button for mobile */}
                    <button
                      type="button"
                      onClick={() => setActiveConversation(null)}
                      aria-label="Back to conversations list"
                      className="md:hidden p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                    </button>

                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{
                        backgroundColor:
                          activeConversation.type === ConversationType.GLOBAL_EVENT
                            ? '#2563EB'
                            : activeConversation.teamId?.colorHex || '#475569',
                      }}
                      aria-hidden="true"
                    >
                      {activeConversation.title.charAt(0)}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-xs">
                        {activeConversation.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                        {typingUsers.length > 0
                          ? `${typingUsers.join(', ')} typing...`
                          : isConnected
                          ? 'Real-Time Connected'
                          : 'Reconnecting to operational comms...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowTaskPicker(true)}
                      aria-label="Share task card in this channel"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 min-h-[36px] bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <KanbanSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Share Task</span>
                    </button>
                  </div>
                </div>

                {/* Message Thread */}
                <div
                  role="log"
                  aria-live="polite"
                  aria-label={`${activeConversation.title} messages`}
                  className="flex-1 overflow-y-auto p-4 space-y-1"
                >
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 dark:text-slate-300 text-xs">
                      No messages yet in this channel. Send the first message below.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble
                        key={msg._id}
                        message={msg}
                        isOutgoing={msg.senderId?._id === user?._id}
                        onOpenTask={(tId) => setSelectedInspectTask(tId)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Voice Recorder Overlay */}
                {showVoiceRecorder && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <VoiceRecorder
                      conversationId={activeConversation._id}
                      onVoiceNoteSent={(msg) => {
                        setMessages((prev) => [...prev, msg]);
                        setTimeout(scrollToBottom, 50);
                      }}
                      onCancel={() => setShowVoiceRecorder(false)}
                    />
                  </div>
                )}

                {/* Input Bar */}
                {!showVoiceRecorder && (
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSendPhotoAttachment}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label="Attach Photo"
                      title="Attach Photo"
                    >
                      <Paperclip className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVoiceRecorder(true)}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label="Record Voice Note"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        emitTyping(activeConversation._id, e.target.value.length > 0);
                      }}
                      placeholder="Type a message or updates for the team..."
                      aria-label="Type a message or updates for the team"
                      className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                    />

                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      aria-label="Send message"
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Select a Conversation
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm">
                  Choose an operational channel or team conversation from the list to start coordinating in real time.
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Share Task Modal Picker */}
      {showTaskPicker && (
        <div role="dialog" aria-modal="true" aria-label="Share task into chat" className="fixed inset-0 z-50 bg-[#150E31]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200 dark:border-brand-800 max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[80dvh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-brand-100 dark:border-brand-800">
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Share an Operational Task into Chat
              </h2>
              <button
                type="button"
                aria-label="Close share task dialog"
                onClick={() => setShowTaskPicker(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {availableTasks.map((tItem) => (
                <button
                  key={tItem._id}
                  type="button"
                  onClick={() => handleShareTask(tItem)}
                  className="w-full text-left p-3.5 rounded-2xl border border-brand-200 dark:border-brand-800 hover:border-brand-500 hover:bg-pastel-purple/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-pastel-purple text-brand-800">
                      {tItem.priority}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                      {tItem.zone || 'General'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {tItem.title}
                  </h3>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Inspection Modal */}
      {selectedInspectTask && (
        <TaskDetailModal
          taskId={selectedInspectTask}
          onClose={() => setSelectedInspectTask(null)}
          onTaskUpdated={() => {}}
        />
      )}
    </div>
  );
}

