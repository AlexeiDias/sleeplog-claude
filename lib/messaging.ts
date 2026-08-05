//lib/messaging.ts
// Shared helpers for messaging, attachments and the media gallery.

import { User } from '@/types';

// One thread per family, keyed by familyId.
//
// This is deliberate: because the thread document ID IS the familyId, security
// rules can authorize the messages subcollection straight from the path
// (getUserData().familyId == threadId) without reading another document. That
// keeps parent message queries provable for list operations — a rule that has
// to inspect resource data cannot be proven from query constraints and gets
// the whole query rejected.
export function threadIdForFamily(familyId: string): string {
  return familyId;
}

// Storage path for a message attachment. Family-scoped from the start, unlike
// the older children/{childId} paths, so these files can be locked down by
// custom claims later without a migration.
export function attachmentPath(
  familyId: string,
  messageId: string,
  fileName: string
): string {
  return `messages/${familyId}/${messageId}/${sanitizeFileName(fileName)}`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function displayName(user: User): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.email;
}

// Attachments are images only, matching what storage.rules will accept. Keep
// this in sync with storage.rules — the rule is the real enforcement, this is
// just a friendlier failure.
export const MAX_ATTACHMENT_MB = 5;
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

export function validateAttachment(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return `${file.name} is not an image. Only photos can be attached.`;
  }
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    return `${file.name} is larger than ${MAX_ATTACHMENT_MB}MB.`;
  }
  return null;
}

// Groups media into date buckets for the gallery, newest first.
export function groupByDay<T extends { createdAt: Date }>(
  items: T[]
): { label: string; key: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const d = item.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = buckets.get(key);
    if (existing) existing.push(item);
    else buckets.set(key, [item]);
  }

  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(new Date(Date.now() - 86400000));

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, groupItems]) => ({
      key,
      label:
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
          ? 'Yesterday'
          : new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
      items: groupItems.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    }));
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMessageTime(date: Date): string {
  const now = new Date();
  const sameDay = dayKey(date) === dayKey(now);
  return sameDay
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

// Firestore Timestamp | Date | undefined → Date
export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}
