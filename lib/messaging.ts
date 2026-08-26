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

// Short clips only. The limit is DURATION, not megabytes: nobody can judge
// whether a video is under 40MB by looking at it, but everyone can count to
// ten. The size cap below is only a backstop for a very high-resolution ten
// seconds, and is what storage.rules enforces, since rules cannot see how long
// a video runs.
export const MAX_VIDEO_SECONDS = 10;
export const MAX_VIDEO_MB = 60;

export function isVideo(file: { type: string }): boolean {
  return file.type.startsWith('video/');
}

/**
 * Synchronous checks: type and size.
 *
 * Documents stay blocked, and not casually. Storage download URLs bypass
 * security rules, so any attachment is readable by anyone holding the link.
 * That is tolerable for photos and short clips of a child, whose parents are
 * the audience anyway; it is not tolerable for medical or contractual
 * documents, which need server-side access control instead.
 */
export function validateAttachment(
  file: File,
  options: { allowVideo?: boolean } = {}
): string | null {
  const video = isVideo(file);

  if (video && !options.allowVideo) {
    return `${file.name} is a video. Videos can only be sent in messages.`;
  }

  if (!file.type.startsWith('image/') && !video) {
    return `${file.name} is not a photo or a video. Documents can't be sent through messages yet — please contact the daycare directly.`;
  }

  if (video) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      return `${file.name} is larger than ${MAX_VIDEO_MB}MB. Record a shorter clip, or set the camera to a lower resolution.`;
    }
    return null;
  }

  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    return `${file.name} is larger than ${MAX_ATTACHMENT_MB}MB.`;
  }
  return null;
}

/** Length of a video file, read from its metadata without uploading it. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';

    const done = (fn: () => void) => {
      URL.revokeObjectURL(url);
      probe.removeAttribute('src');
      fn();
    };

    probe.onloadedmetadata = () => {
      const seconds = probe.duration;
      done(() => resolve(Number.isFinite(seconds) ? seconds : NaN));
    };
    probe.onerror = () => done(() => reject(new Error('Could not read the video')));

    probe.src = url;
  });
}

/**
 * Full check including length, which needs the file's metadata and so cannot
 * be synchronous.
 *
 * A duration that cannot be read is allowed through rather than blocked: some
 * phone formats do not report it, and refusing a clip because the browser is
 * coy about its length would be worse than letting a slightly long one past.
 * The size cap still applies, and storage.rules still has the final word.
 */
export async function validateAttachmentAsync(
  file: File,
  options: { allowVideo?: boolean } = {}
): Promise<string | null> {
  const basic = validateAttachment(file, options);
  if (basic || !isVideo(file)) return basic;

  try {
    const seconds = await readVideoDuration(file);
    if (Number.isFinite(seconds) && seconds > MAX_VIDEO_SECONDS + 0.5) {
      return `${file.name} is ${Math.round(seconds)} seconds. Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`;
    }
  } catch {
    // Unreadable metadata — fall through on the size cap alone.
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
