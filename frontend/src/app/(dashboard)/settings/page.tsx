'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, AppTheme, FontScale } from '../../../contexts/ThemeContext';
import { usePwa } from '../../../contexts/PwaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SupportedLanguage } from '@shared/types';
import {
  Sun,
  Moon,
  Contrast,
  Laptop,
  Type,
  Globe,
  Smartphone,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, fontScale, setFontScale, reducedMotion, setReducedMotion } = useTheme();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwa();
  const { changeLanguage } = useAuth();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [installMessage, setInstallMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const handleInstallApp = async () => {
    const res = await promptInstall();
    if (res === 'accepted') setInstallMessage('EventOps was installed on your device.');
    else if (res === 'dismissed') setInstallMessage('Install prompt dismissed. You can install anytime from your browser menu.');
    else setInstallMessage('Follow your browser menu -> Add to Home Screen or Install App.');
  };

  const themeOptions: { id: AppTheme; label: string; desc: string; icon: any }[] = [
    { id: 'light', label: 'Light (Default)', desc: 'Warm lavender canvas & crisp white surfaces', icon: Sun },
    { id: 'dark', label: 'Dark Mode', desc: 'Deep twilight surfaces for low-light venues', icon: Moon },
    { id: 'high-contrast', label: 'High Contrast', desc: 'Maximum black/white borders for bright sunlight', icon: Contrast },
    { id: 'system', label: 'Match Device', desc: 'Automatically follows OS theme & contrast', icon: Laptop },
  ];

  const fontScaleOptions: { id: FontScale; label: string; desc: string }[] = [
    { id: 'normal', label: 'Normal (100%)', desc: 'Default compact density' },
    { id: 'large', label: 'Large (112.5%)', desc: 'Extra comfortable reading size' },
    { id: 'x-large', label: 'Extra Large (125%)', desc: 'Maximum legibility on field devices' },
  ];

  const currentLang = (i18n.language || 'en') as SupportedLanguage;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          Personalize visual comfort, accessible text scaling, language, notifications, and app installation.
        </p>
      </div>

      {/* Display Theme */}
      <section aria-labelledby="settings-theme-heading" className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Sun className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
          <h2 id="settings-theme-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            {t('settings.theme')}
          </h2>
        </div>

        <div role="radiogroup" aria-labelledby="settings-theme-heading" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(opt.id)}
                className={`flex items-start space-x-3 p-4 min-h-[68px] rounded-2xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-600 bg-pastel-purple/60 dark:bg-brand-900/60 ring-1 ring-brand-500'
                    : 'border-brand-200/80 dark:border-brand-800 hover:bg-canvas dark:hover:bg-[#221A40]'
                }`}
              >
                <Icon className="w-5 h-5 text-brand-700 dark:text-brand-300 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{opt.label}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5">{opt.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Text Scaling & Reduced Motion */}
      <section aria-labelledby="settings-readability-heading" className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-5">
        <div className="flex items-center space-x-2">
          <Type className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
          <h2 id="settings-readability-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            {t('settings.font_size')} & Motion
          </h2>
        </div>

        <div role="radiogroup" aria-label={t('settings.font_size')} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fontScaleOptions.map((opt) => {
            const active = fontScale === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFontScale(opt.id)}
                className={`p-3.5 min-h-[60px] rounded-2xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-600 bg-pastel-purple/60 dark:bg-brand-900/60 ring-1 ring-brand-500'
                    : 'border-brand-200/80 dark:border-brand-800 hover:bg-canvas dark:hover:bg-[#221A40]'
                }`}
              >
                <span className="block text-sm font-bold text-slate-900 dark:text-white">{opt.label}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-brand-100 dark:border-brand-800 flex items-center justify-between gap-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span id="reduced-motion-label" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t('settings.reduced_motion')}
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-300">
                Minimize animations and page transitions across the app.
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-labelledby="reduced-motion-label"
            aria-checked={reducedMotion}
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              reducedMotion ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-sm transition ${
                reducedMotion ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Language Selector */}
      <section aria-labelledby="settings-language-heading" className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
          <h2 id="settings-language-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            {t('settings.language')}
          </h2>
        </div>

        <div role="radiogroup" aria-labelledby="settings-language-heading" className="grid grid-cols-3 gap-3">
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिन्दी (Hindi)' },
            { code: 'mr', label: 'मराठी (Marathi)' },
          ].map((item) => {
            const active = currentLang.startsWith(item.code);
            return (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeLanguage(item.code as SupportedLanguage)}
                className={`p-3.5 min-h-[48px] rounded-2xl border text-center text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-600 bg-pastel-purple dark:bg-brand-900/60 text-brand-900 dark:text-white'
                    : 'border-brand-200/80 dark:border-brand-800 text-slate-700 dark:text-slate-200 hover:bg-canvas dark:hover:bg-[#221A40]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* PWA Installation & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section aria-labelledby="settings-pwa-heading" className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            <h2 id="settings-pwa-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              {t('settings.pwa_install')}
            </h2>
          </div>

          {isInstalled ? (
            <div className="p-3 rounded-2xl bg-pastel-green dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Installed in standalone app mode.</span>
            </div>
          ) : canInstall ? (
            <button
              type="button"
              onClick={handleInstallApp}
              className="w-full py-3 px-4 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
            >
              Install EventOps App
            </button>
          ) : isIOS ? (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              On iPhone or iPad Safari, tap <strong>Share</strong> at the bottom of your screen, then choose{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Use Chrome or Edge&apos;s address bar Install button or browser menu (&quot;Install EventOps&quot;) to add offline field access.
            </p>
          )}
          {installMessage && (
            <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">{installMessage}</p>
          )}
        </section>

        <section aria-labelledby="settings-notif-heading" className="bg-white dark:bg-[#18132B] rounded-3xl p-5 sm:p-6 border border-brand-200/70 dark:border-brand-800/70 shadow-card space-y-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            <h2 id="settings-notif-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              {t('settings.notifications')}
            </h2>
          </div>

          {notifPermission === 'granted' ? (
            <div className="p-3 rounded-2xl bg-pastel-green dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Desktop & PWA push notifications are enabled.</span>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className="p-3.5 rounded-2xl bg-pastel-orange/80 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Notifications are currently blocked</span>
              </div>
              <p className="leading-relaxed">
                Click the lock/site-info icon next to the browser address bar, set <strong>Notifications</strong> to{' '}
                <strong>Allow</strong>, then reload this page.
              </p>
            </div>
          ) : notifPermission === 'unsupported' ? (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              In-app real-time alerts via Socket.IO are active automatically.
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Receive instant alerts for urgent task assignments, blocker flags, and proof reviews.
              </p>
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="w-full py-2.5 px-4 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
              >
                Enable Push Notifications
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

