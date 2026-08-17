//lib/childDisplay.ts
// Shared formatting for showing a child in the UI and in reports.

import { Child } from '@/types';

/**
 * Age in words. Months up to two years, then years and months — which is how
 * parents and licensing paperwork both talk about it.
 *
 * Dates of birth are stored at noon UTC and must be read in UTC, or Pacific
 * time shows the day before (the Session 1 bug).
 */
export function monthsOld(dateOfBirth: Date): number {
  const now = new Date();
  const dob = new Date(dateOfBirth);

  let months =
    (now.getFullYear() - dob.getUTCFullYear()) * 12 +
    (now.getMonth() - dob.getUTCMonth());

  if (now.getDate() < dob.getUTCDate()) months -= 1;
  return months < 0 ? 0 : months;
}

export function formatAge(dateOfBirth: Date): string {
  const months = monthsOld(dateOfBirth);

  if (months < 24) {
    return months === 1 ? '1 month old' : `${months} months old`;
  }

  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const yearPart = years === 1 ? '1 year' : `${years} years`;
  if (remainder === 0) return `${yearPart} old`;
  return `${yearPart} ${remainder === 1 ? '1 month' : `${remainder} months`} old`;
}

export function formatDOB(dateOfBirth: Date): string {
  return new Date(dateOfBirth).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** First letter, for the placeholder when a child has no photo. */
export function childInitial(child: Child): string {
  return child.name.trim().charAt(0).toUpperCase() || '?';
}
