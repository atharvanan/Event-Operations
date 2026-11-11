'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { LanguageSwitcher } from '../../../components/layout/LanguageSwitcher';
import { ThemeToggle } from '../../../components/layout/ThemeToggle';
import { CalendarCheck2, LogIn, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/home');
    } else {
      setError(result.message || t('auth.invalid_creds'));
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError('');
    setIsSubmitting(true);

    const result = await login(demoEmail, 'Password@123');
    setIsSubmitting(false);

    if (result.success) {
      router.push('/home');
    } else {
      setError(result.message || t('auth.invalid_creds'));
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
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('auth.login_title')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t('auth.login_subtitle')}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl flex items-center space-x-2.5 text-xs sm:text-sm text-red-800 dark:text-red-200 font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {t('auth.email')}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@royalweddings.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 pr-12 py-2.5 text-sm rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
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
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{t('auth.sign_in')}</span>
                </>
              )}
            </button>
          </form>

          {/* Instant Demo Logins */}
          <div className="mt-6 pt-5 border-t border-brand-100 dark:border-brand-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Instant Demo Logins</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">1-Click Access</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickLogin('manager@royalweddings.com')}
                className="p-2.5 min-h-[52px] bg-pastel-purple hover:bg-brand-100 dark:bg-brand-900/50 dark:hover:bg-brand-900 text-brand-800 dark:text-brand-200 rounded-xl text-center border border-brand-200 dark:border-brand-700 transition-all disabled:opacity-50 flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span className="text-xs font-bold block">Manager</span>
                <span className="text-xs text-brand-700 dark:text-brand-300 truncate max-w-full mt-0.5">Vikram</span>
                <span className="sr-only"> Demo Login</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickLogin('lead.catering@royalweddings.com')}
                className="p-2.5 min-h-[52px] bg-pastel-green hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-xl text-center border border-emerald-200 dark:border-emerald-800 transition-all disabled:opacity-50 flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <span className="text-xs font-bold block">Team Lead</span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 truncate max-w-full mt-0.5">Chef Sharma</span>
                <span className="sr-only"> Demo Login</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickLogin('member.stage@royalweddings.com')}
                className="p-2.5 min-h-[52px] bg-pastel-blue hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-200 rounded-xl text-center border border-sky-200 dark:border-sky-800 transition-all disabled:opacity-50 flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <span className="text-xs font-bold block">Member</span>
                <span className="text-xs text-sky-800 dark:text-sky-300 truncate max-w-full mt-0.5">Manoj</span>
                <span className="sr-only"> Demo Login</span>
              </button>
            </div>
            <p className="text-xs text-center text-slate-600 dark:text-slate-300 mt-3">
              Demo password: <span className="font-mono font-bold text-slate-800 dark:text-slate-100">Password@123</span>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('auth.need_account')}{' '}
              <Link
                href="/register"
                className="font-bold text-brand-700 dark:text-brand-300 hover:text-brand-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
              >
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
