'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Image as ImageIcon, Flame, CheckCircle, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { INotification } from '@shared/types';
import { useSocket } from '../../hooks/useSocket';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [pushMessage, setPushMessage] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=15');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch {
      // Ignore if unauthenticated or offline
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPushStatus('granted');
      } else if (Notification.permission === 'denied') {
        setPushStatus('denied');
      } else {
        setPushStatus('prompt');
      }
    } else {
      setPushStatus('unsupported');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => {
      fetchNotifications();
    };
    socket.on('notification:new', handleNewNotif);
    socket.on('activity:new', handleNewNotif);
    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('activity:new', handleNewNotif);
    };
  }, [socket]);

  const handleSubscribePush = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      setPushMessage('Push alerts are unavailable in this browser. In-app alerts continue working normally.');
      return;
    }

    try {
      setIsSubscribing(true);
      setPushMessage('');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushStatus('denied');
        return;
      }

      const keyRes = await api.get('/notifications/vapid-key');
      const publicKey = keyRes.data?.data?.publicKey;
      if (!publicKey) throw new Error('No VAPID key configured');

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh')!))));
      const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth')!))));

      await api.post('/notifications/subscribe', {
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
      });

      setPushStatus('granted');
      setPushMessage('Device alerts enabled.');
    } catch {
      setPushMessage('Could not register device push right now. In-app alerts remain active.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore offline
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore offline
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'BLOCKER_RAISED':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'REWORK_REQUIRED':
        return <Flame className="w-4 h-4 text-amber-700" />;
      case 'PROOF_UPLOADED':
        return <ImageIcon className="w-4 h-4 text-brand-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18132B] border border-brand-200 dark:border-brand-700/60 text-[#2B244D] dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900 shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 text-xs font-extrabold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Event notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#18132B] shadow-card border border-brand-200 dark:border-brand-700/60 py-3 z-50"
        >
          <div className="px-4 pb-2.5 border-b border-brand-100 dark:border-brand-800/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1A162E] dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-brand-600 dark:text-brand-300 hover:underline min-h-[36px] px-2 rounded-lg"
              >
                Mark all read
              </button>
            )}
          </div>

          {pushStatus === 'prompt' && (
            <div className="mx-3 my-2.5 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700/60 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-[#2B244D] dark:text-brand-100">
                  Enable push alerts to hear immediately about urgent task updates and blockers.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubscribePush}
                disabled={isSubscribing}
                className="w-full min-h-[44px] px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition"
              >
                {isSubscribing ? 'Enabling Alerts...' : 'Turn On Push Alerts'}
              </button>
            </div>
          )}

          {pushStatus === 'denied' && (
            <div className="mx-3 my-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-100">
              <p className="font-bold">Push notifications are blocked</p>
              <p className="mt-1 leading-relaxed">
                To re-enable alerts, open your browser&apos;s site lock icon in the address bar and allow Notifications. Updates still appear here live.
              </p>
            </div>
          )}

          {pushMessage && (
            <div role="status" className="mx-3 mb-2 text-xs font-semibold text-brand-700 dark:text-brand-200 px-2">
              {pushMessage}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-brand-100/70 dark:divide-brand-800/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#524D6B] dark:text-brand-200 font-medium">
                You&apos;re all caught up. No new notifications.
              </div>
            ) : (
              notifications.map((n: any) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => !n.isRead && handleMarkOneRead(n._id)}
                  className={`w-full text-left p-3.5 min-h-[52px] flex items-start space-x-3 transition hover:bg-brand-50 dark:hover:bg-brand-900/40 ${
                    !n.isRead ? 'bg-brand-50/70 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-800/60 shrink-0 mt-0.5" aria-hidden="true">
                    {getIconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1A162E] dark:text-white">{n.title}</p>
                    <p className="text-xs text-[#524D6B] dark:text-brand-200 mt-0.5 line-clamp-2">
                      {n.message || n.body}
                    </p>
                    <span className="text-xs text-[#645E80] dark:text-brand-300 mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-1.5" aria-label="Unread notification" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
