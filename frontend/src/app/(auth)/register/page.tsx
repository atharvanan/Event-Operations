'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { LanguageSwitcher } from '../../../components/layout/LanguageSwitcher';
import { ThemeToggle } from '../../../components/layout/ThemeToggle';
import { CalendarCheck2, UserPlus, AlertCircle, Building2 } from 'lucide-react';
import { SupportedLanguage } from '@shared/types';

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await register({
      name,
      email,
      password,
      phone,
      organizationName,
      preferredLanguage,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push('/home');
    } else {
      setError(result.message || 'Registration failed.');
    }
  };

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-canvas dark:bg-canvas-dark"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <div
              className="w-11 h-11 bg-gradient-to-br from-brand-700 to-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-600/25"
              aria-hidden="true"
            >
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('app_name')}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {t('app_tagline')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle compact />
            <LanguageSwitcher compact />
          </div>
        </div>

        <div className="bg-white dark:bg-[#18132B] py-7 px-6 sm:px-9 shadow-soft rounded-3xl border border-brand-200/70 dark:border-brand-800/70">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('auth.register_title')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t('auth.register_subtitle')}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl flex items-center space-x-2.5 text-xs sm:text-sm text-red-800 dark:text-red-200 font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {t('auth.name')}
              </label>
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Atharva Deshmukh"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="register-password" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {t('auth.password')}
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="register-phone" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {t('auth.phone')}
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-org" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {t('auth.org_name')}
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-brand-500 dark:text-brand-300 absolute left-3.5 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="register-org"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Royal Events & Logistics"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <span id="register-language-label" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('auth.language_label')}
              </span>
              <div role="radiogroup" aria-labelledby="register-language-label" className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'mr', label: 'मराठी' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    role="radio"
                    aria-checked={preferredLanguage === item.code}
                    onClick={() => setPreferredLanguage(item.code as SupportedLanguage)}
                    className={`py-2.5 min-h-[44px] text-xs font-bold rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      preferredLanguage === item.code
                        ? 'border-brand-600 bg-pastel-purple dark:bg-brand-900/60 text-brand-800 dark:text-brand-200'
                        : 'border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 min-h-[46px] bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {isSubmitting ? (
                <span>{t('common.loading')}</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{t('auth.register')}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('auth.have_account')}{' '}
              <Link
                href="/login"
                className="font-bold text-brand-700 dark:text-brand-300 hover:text-brand-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
              >
                {t('auth.sign_in')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
