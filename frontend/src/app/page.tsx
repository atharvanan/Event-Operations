'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { CalendarCheck2 } from 'lucide-react';

export default function RootEntryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas-dark px-4"
    >
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
          <CalendarCheck2 className="w-7 h-7 animate-pulse" aria-hidden="true" />
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Loading EventOps...
        </span>
      </div>
    </main>
  );
}
