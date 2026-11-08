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

  const handleSelect = (lang: SupportedLanguage) => {
    changeLanguage(lang);
  };

  return (
    <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
      {!compact && <Globe className="w-4 h-4 text-slate-500 ml-1" />}
      {languages.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => handleSelect(item.code)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            currentLang === item.code
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {item.native}
        </button>
      ))}
    </div>
  );
};
