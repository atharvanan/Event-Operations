'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { SupportedLanguage } from '@shared/types';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const { changeLanguage } = useAuth();
  const currentLang = (i18n.language || 'en') as SupportedLanguage;

  const languages: { code: SupportedLanguage; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Language selection"
      className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/60 p-1 rounded-xl border border-brand-200 dark:border-brand-700/60"
    >
      {!compact && (
        <Globe className="w-4 h-4 text-brand-700 dark:text-brand-200 ml-1.5 shrink-0" aria-hidden="true" />
      )}
      {languages.map((item) => {
        const isSelected = currentLang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Switch language to ${item.label}`}
            lang={item.code}
            onClick={() => changeLanguage(item.code)}
            className={`px-3 py-1.5 min-h-[36px] md:min-h-[38px] text-xs font-bold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
              isSelected
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-[#312C4A] dark:text-brand-100 hover:bg-brand-100 dark:hover:bg-brand-800/80'
            }`}
          >
            {item.native}
          </button>
        );
      })}
    </div>
  );
};
