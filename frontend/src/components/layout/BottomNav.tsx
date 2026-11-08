'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, KanbanSquare, Camera, MessageSquare, Flame } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentEvent } = useAuth();

  if (!currentEvent) return null;

  const base = `/events/${currentEvent._id}`;

  const navItems = [
    { href: `${base}`, label: 'Overview', icon: LayoutDashboard },
    { href: `${base}/tasks`, label: 'Tasks', icon: KanbanSquare },
    { href: `${base}/evidence`, label: 'Proof', icon: Camera, highlight: true },
    { href: `${base}/chat`, label: 'Chat', icon: MessageSquare },
    { href: `${base}/day-mode`, label: 'Day Mode', icon: Flame },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 border-4 border-white dark:border-slate-900">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-1">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
