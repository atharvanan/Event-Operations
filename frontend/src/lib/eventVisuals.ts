export function getEventCoverSrc(eventType?: string, customCover?: string): string {
  if (customCover && (customCover.startsWith('/images/') || customCover.startsWith('http'))) {
    return customCover;
  }
  const normalized = (eventType || '').toLowerCase();
  if (normalized.includes('wedding') || normalized.includes('sangeet') || normalized.includes('reception')) {
    return '/images/events/wedding.svg';
  }
  if (normalized.includes('concert') || normalized.includes('festival') || normalized.includes('music')) {
    return '/images/events/concert.svg';
  }
  if (normalized.includes('exhibition') || normalized.includes('expo') || normalized.includes('fair') || normalized.includes('trade')) {
    return '/images/events/exhibition.svg';
  }
  if (normalized.includes('birthday') || normalized.includes('party') || normalized.includes('gala')) {
    return '/images/events/birthday.svg';
  }
  if (
    normalized.includes('conference') ||
    normalized.includes('corporate') ||
    normalized.includes('summit') ||
    normalized.includes('seminar') ||
    normalized.includes('workshop') ||
    normalized.includes('hackathon') ||
    normalized.includes('tech')
  ) {
    return '/images/events/corporate.svg';
  }
  return '/images/events/custom.svg';
}

export function getCountdownBadge(startDate?: string, endDate?: string, status?: string): {
  label: string;
  tone: 'purple' | 'green' | 'amber' | 'neutral';
} {
  if (!startDate) return { label: 'Upcoming', tone: 'purple' };
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (status === 'completed') {
    return { label: 'Completed', tone: 'neutral' };
  }
  if (status === 'archived') {
    return { label: 'Archived', tone: 'neutral' };
  }
  if (start <= now && (!end || end >= now)) {
    return { label: 'Live Now', tone: 'green' };
  }
  if (end && end < now) {
    return { label: 'Completed', tone: 'neutral' };
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((startDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { label: 'Today', tone: 'green' };
  if (diffDays === 1) return { label: 'Tomorrow', tone: 'amber' };
  return { label: `In ${diffDays} Days`, tone: 'purple' };
}

export function formatFriendlyDate(dateIso?: string): string {
  if (!dateIso) return 'TBD';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDueDate(dateIso?: string): {
  label: string;
  isOverdue: boolean;
} {
  if (!dateIso) return { label: 'No date', isOverdue: false };
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return { label: 'No date', isOverdue: false };
  const label = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
  return { label, isOverdue: d.getTime() < Date.now() };
}

