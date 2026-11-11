'use client';

import React from 'react';
import { useTheme, AppTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Eye, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC<{ compact?: boolean; includeSystem?: boolean }> = ({
  compact = false,
  includeSystem = false,
}) => {
  const { theme, setTheme } = useTheme();

  const options: { id: AppTheme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'high-contrast', label: 'Contrast', icon: Eye },
    ...(includeSystem ? [{ id: 'system' as AppTheme, label: 'Auto', icon: Monitor }] : []),
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Display theme selection"
      className="inline-flex items-center gap-1 p-1 bg-brand-50 dark:bg-brand-900/60 rounded-xl border border-brand-200 dark:border-brand-700/60"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label} Mode`}
            onClick={() => setTheme(opt.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] md:min-h-[38px] rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${isSelected
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-[#312C4A] dark:text-brand-100 hover:bg-brand-100 dark:hover:bg-brand-800/80'
              }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
