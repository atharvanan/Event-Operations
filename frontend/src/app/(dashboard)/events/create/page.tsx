'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import api from '../../../../lib/api';
import { getEventCoverSrc, formatFriendlyDate } from '../../../../lib/eventVisuals';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: 'corporate', label: 'Conference / Summit' },
  { value: 'wedding', label: 'Wedding / Celebration' },
  { value: 'concert', label: 'Concert / Festival' },
  { value: 'exhibition', label: 'Exhibition / Expo' },
  { value: 'birthday', label: 'Birthday / Private Party' },
  { value: 'custom', label: 'Custom Event' },
];

export default function CreateEventWizardPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Details
  const [name, setName] = useState('');
  const [type, setType] = useState('corporate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Venue & Zones
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [eventMode, setEventMode] = useState<'in_person' | 'hybrid' | 'virtual'>('in_person');
  const [zonesText, setZonesText] = useState('Main Stage, Registration Desk, Catering Area, Exit Gate');

  // Step 3: Registration
  const [regEnabled, setRegEnabled] = useState(true);
  const [capacity, setCapacity] = useState('500');
  const [requireApproval, setRequireApproval] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(true);
  const [requirements, setRequirements] = useState<string[]>(['Full Name', 'Email Address']);

  const steps = [
    { num: 1, label: t('create_event.step_details') },
    { num: 2, label: t('create_event.step_venue') },
    { num: 3, label: t('create_event.step_registration') },
    { num: 4, label: t('create_event.step_review') },
  ];

  const toggleRequirement = (reqItem: string) => {
    setRequirements((prev) =>
      prev.includes(reqItem) ? prev.filter((item) => item !== reqItem) : [...prev, reqItem]
    );
  };

  const validateStep = (targetStep: number): boolean => {
    setError('');
    if (step === 1 && targetStep > 1) {
      if (!name.trim()) {
        setError('Please enter an event title.');
        return false;
      }
      if (!startDate || !endDate) {
        setError('Please select both a start date and end date.');
        return false;
      }
      if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
        setError('End date and time must be after the start date and time.');
        return false;
      }
    }
    if (step === 2 && targetStep > 2) {
      if (!venue.trim()) {
        setError('Please enter a venue name or location.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step < 4 && validateStep(step + 1)) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleStepJump = (num: 1 | 2 | 3 | 4) => {
    if (num < step || validateStep(num)) {
      setStep(num);
    }
  };

  const parsedZones = zonesText
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);

  const handleCreateEvent = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        description: description.trim(),
        venue: venue.trim(),
        address: address.trim(),
        eventMode,
        zones: parsedZones,
        coverImage: getEventCoverSrc(type),
        registrationConfig: {
          enabled: regEnabled,
          capacity: Math.max(0, Number(capacity) || 0),
          requireApproval,
          checkInOpen,
          requirements,
        },
      };

      const res = await api.post('/events', payload);
      const createdId = res.data?.data?._id;
      if (createdId) {
        router.push(`/events/${createdId}`);
      } else {
        router.push('/events');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header matching Reference Create Event Frame */}
      <div className="flex items-center space-x-3">
        <Link
          href="/events"
          aria-label="Back to Events"
          className="min-w-[44px] min-h-[44px] rounded-2xl bg-white dark:bg-[#18132B] border border-brand-200/80 dark:border-brand-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-brand-50 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('create_event.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Step {step} of 4 — Guided setup
          </p>
        </div>
      </div>

      {/* 4-Step Progress Stepper */}
      <nav aria-label="Event creation progress" className="bg-white dark:bg-[#18132B] rounded-3xl p-4 sm:p-5 border border-brand-200/70 dark:border-brand-800/70 shadow-card">
        <ol className="grid grid-cols-4 gap-2 sm:gap-4">
          {steps.map((st) => {
            const isActive = step === st.num;
            const isCompleted = step > st.num;
            return (
              <li key={st.num}>
                <button
                  type="button"
                  onClick={() => handleStepJump(st.num as 1 | 2 | 3 | 4)}
                  aria-current={isActive ? 'step' : undefined}
                  className="w-full flex flex-col items-center text-center group min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl py-1"
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900'
                        : 'bg-canvas dark:bg-[#221A40] text-slate-600 dark:text-slate-300 border border-brand-200 dark:border-brand-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" aria-hidden="true" /> : st.num}
                  </span>
                  <span
                    className={`mt-1.5 text-xs sm:text-sm font-semibold ${
                      isActive || isCompleted
                        ? 'text-brand-800 dark:text-brand-200'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center space-x-2.5 text-sm font-semibold text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Card: Form (Left) + Visual Preview Panel (Right) */}
      <div className="bg-white dark:bg-[#18132B] rounded-3xl border border-brand-200/70 dark:border-brand-800/70 shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('create_event.details_heading')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('create_event.details_subheading')}
                </p>
              </div>

              <div>
                <label htmlFor="ce-name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('events.event_name')} *
                </label>
                <input
                  id="ce-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TechConnect 2026"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="ce-start" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    Start Date & Time *
                  </label>
                  <input
                    id="ce-start"
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label htmlFor="ce-end" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    End Date & Time *
                  </label>
                  <input
                    id="ce-end"
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ce-type" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('events.type')}
                </label>
                <select
                  id="ce-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ce-desc" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  id="ce-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share a quick summary for your coordinators and field teams..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('create_event.venue_heading')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('create_event.venue_subheading')}
                </p>
              </div>

              <div>
                <label htmlFor="ce-venue" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('events.venue')} *
                </label>
                <input
                  id="ce-venue"
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Amravati Convention Center"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label htmlFor="ce-address" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Full Street Address or Access Notes
                </label>
                <input
                  id="ce-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Gate 2 Loading Bay, Camp Road, Amravati"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Event Format
                </span>
                <div role="radiogroup" className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'in_person', label: 'In-Person' },
                    { id: 'hybrid', label: 'Hybrid' },
                    { id: 'virtual', label: 'Virtual' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={eventMode === mode.id}
                      onClick={() => setEventMode(mode.id as any)}
                      className={`py-2.5 px-3 min-h-[44px] rounded-xl border text-sm font-semibold transition-all ${
                        eventMode === mode.id
                          ? 'border-brand-600 bg-pastel-purple dark:bg-brand-900/60 text-brand-900 dark:text-white'
                          : 'border-brand-200 dark:border-brand-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ce-zones" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('events.zones')} (Comma-separated)
                </label>
                <input
                  id="ce-zones"
                  type="text"
                  value={zonesText}
                  onChange={(e) => setZonesText(e.target.value)}
                  placeholder="Main Stage, Catering Hall, VIP Entrance"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('create_event.registration_heading')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('create_event.registration_subheading')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas dark:bg-[#221A40] border border-brand-200/70 dark:border-brand-800 flex items-center justify-between gap-3">
                <div>
                  <span id="reg-enabled-lbl" className="block text-sm font-bold text-slate-900 dark:text-white">
                    Enable Attendee Registration & QR Passes
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Allows registering guests and generating contactless QR tickets
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby="reg-enabled-lbl"
                  aria-checked={regEnabled}
                  onClick={() => setRegEnabled(!regEnabled)}
                  className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    regEnabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-7 w-7 rounded-full bg-white shadow transition ${
                      regEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {regEnabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="ce-cap" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Attendee Capacity
                      </label>
                      <input
                        id="ce-cap"
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-[#221A40] text-sm text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col justify-end space-y-2">
                      <label className="flex items-center space-x-2.5 min-h-[44px] cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={checkInOpen}
                          onChange={(e) => setCheckInOpen(e.target.checked)}
                          className="w-5 h-5 rounded accent-brand-600"
                        />
                        <span>Open QR Check-in Immediately</span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2.5 min-h-[44px] cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={requireApproval}
                      onChange={(e) => setRequireApproval(e.target.checked)}
                      className="w-5 h-5 rounded accent-brand-600"
                    />
                    <span>Require Organizer Approval Before Issuing Ticket</span>
                  </label>

                  <div>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Registration Fields Collected
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['Full Name', 'Email Address', 'Phone Number', 'Organization', 'Meal Preference'].map(
                        (item) => {
                          const selected = requirements.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleRequirement(item)}
                              className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                                selected
                                  ? 'bg-brand-600 text-white border-brand-600'
                                  : 'bg-canvas dark:bg-[#221A40] text-slate-700 dark:text-slate-200 border-brand-200 dark:border-brand-700'
                              }`}
                            >
                              {item}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('create_event.review_heading')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {t('create_event.review_subheading')}
                </p>
              </div>

              <dl className="rounded-2xl bg-canvas dark:bg-[#221A40] border border-brand-200/70 dark:border-brand-800 p-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-brand-100 dark:border-brand-800 pb-2">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Event Title</dt>
                  <dd className="font-bold text-slate-900 dark:text-white text-right">{name}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand-100 dark:border-brand-800 pb-2">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Category</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white capitalize">{type}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand-100 dark:border-brand-800 pb-2">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Start</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right">
                    {startDate ? new Date(startDate).toLocaleString() : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand-100 dark:border-brand-800 pb-2">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Venue</dt>
                  <dd className="font-bold text-slate-900 dark:text-white text-right">
                    {venue} {address ? `(${address})` : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand-100 dark:border-brand-800 pb-2">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Zones</dt>
                  <dd className="font-medium text-slate-900 dark:text-white text-right">
                    {parsedZones.length > 0 ? parsedZones.join(', ') : 'Default Venue Zone'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">Registration</dt>
                  <dd className="font-semibold text-emerald-800 dark:text-emerald-300 text-right">
                    {regEnabled ? `Enabled (Capacity: ${capacity || 'Unlimited'})` : 'Disabled'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="pt-4 border-t border-brand-100 dark:border-brand-800 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep((step - 1) as 1 | 2 | 3 | 4);
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-2xl border border-brand-200 dark:border-brand-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-brand-50 dark:hover:bg-brand-900/40"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>{t('create_event.back')}</span>
              </button>
            ) : (
              <span />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center space-x-2 px-6 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
              >
                <span>{t('create_event.next')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreateEvent}
                className="inline-flex items-center space-x-2 px-6 py-2.5 min-h-[46px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>{submitting ? 'Creating Workspace...' : t('create_event.create')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Live Lavender Card Preview matching Reference Create Event Frame */}
        <aside
          aria-label="Live event preview"
          className="lg:col-span-5 bg-gradient-to-br from-pastel-purple via-brand-50 to-indigo-100 dark:from-[#221A40] dark:via-[#2B1F5C] dark:to-[#18132B] p-6 sm:p-8 flex flex-col justify-center items-center border-t lg:border-t-0 lg:border-l border-brand-200/70 dark:border-brand-800"
        >
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Live Card Preview</span>
            </div>

            <div className="bg-white dark:bg-[#18132B] rounded-3xl overflow-hidden shadow-soft border border-white/80 dark:border-brand-700">
              <div className="relative h-40 bg-brand-900">
                <img
                  src={getEventCoverSrc(type)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="w-11 h-11 rounded-2xl bg-white/95 text-brand-700 flex items-center justify-center shadow-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Calendar className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {name.trim() || 'TechConnect 2026'}
                </h3>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    <span>{startDate ? formatFriendlyDate(startDate) : 'Select a date'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    <span className="truncate">{venue.trim() || 'Venue to be confirmed'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    <span>
                      {regEnabled ? `Capacity ${capacity || 0}` : 'Invite-only team workspace'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

