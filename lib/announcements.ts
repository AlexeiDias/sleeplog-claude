//lib/announcements.ts
// Helpers for daycare-wide announcements.
//
// Scoped by daycareId, including for parents. That is deliberate and is the
// one place in the app where it is correct — an announcement is addressed to
// every family. Never store anything family-specific here.

import {
  collection, doc, deleteDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Announcement, MessageAttachment, User } from '@/types';
import { toDate, sanitizeFileName, displayName } from '@/lib/messaging';

// Kept short and unambiguously positive. Mirrored in firestore.rules, which is
// the actual enforcement — a reaction outside this set is rejected there.
export const ALLOWED_REACTIONS = ['❤️', '😊', '👏', '🎉', '👍'] as const;

export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function announcementPhotoPath(announcementId: string, fileName: string): string {
  return `announcements/${announcementId}/${sanitizeFileName(fileName)}`;
}

/** Live announcements for a daycare, newest first. */
export function subscribeToAnnouncements(
  daycareId: string,
  onData: (items: Announcement[]) => void,
  onError: (err: unknown) => void
) {
  // Constrained by daycareId, which is what the rules authorise on, so this
  // query is provable for a list operation.
  return onSnapshot(
    query(collection(db, 'announcements'), where('daycareId', '==', daycareId)),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toDate(d.data().createdAt),
      })) as Announcement[];
      // Sorted client-side: where() plus orderBy() on a different field would
      // need a composite index.
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(items);
    },
    onError
  );
}

export async function postAnnouncement(opts: {
  author: User;
  text: string;
  files: File[];
  allowReplies: boolean;
}): Promise<void> {
  if (!opts.author.daycareId) throw new Error('No daycare on this account');

  // Reserve the ID first so photo paths can include it.
  const announcementRef = doc(collection(db, 'announcements'));
  const attachments: MessageAttachment[] = [];

  for (const file of opts.files) {
    const path = announcementPhotoPath(announcementRef.id, file.name);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type });
    attachments.push({
      path,
      url: await getDownloadURL(storageRef),
      contentType: file.type,
      size: file.size,
      fileName: file.name,
    });
  }

  await setDoc(announcementRef, {
    daycareId: opts.author.daycareId,
    authorId: opts.author.uid,
    authorName: displayName(opts.author),
    text: opts.text.trim(),
    attachments,
    allowReplies: opts.allowReplies,
    createdAt: serverTimestamp(),
  });
}

export async function setReaction(
  announcementId: string,
  user: User,
  emoji: ReactionEmoji | null
): Promise<void> {
  const reactionRef = doc(db, 'announcements', announcementId, 'reactions', user.uid);

  if (emoji === null) {
    await deleteDoc(reactionRef);
    return;
  }

  await setDoc(reactionRef, {
    emoji,
    byRole: user.role === 'parent' ? 'parent' : 'staff',
    byName: displayName(user),
    createdAt: serverTimestamp(),
  });
}

export interface ReactionSummary {
  counts: Record<string, number>;
  mine: string | null;
  names: { emoji: string; name: string }[];
}

/** Live reaction summary. Names are only ever displayed to staff — see below. */
export function subscribeToReactions(
  announcementId: string,
  myUid: string,
  onData: (summary: ReactionSummary) => void
) {
  return onSnapshot(
    collection(db, 'announcements', announcementId, 'reactions'),
    (snapshot) => {
      const counts: Record<string, number> = {};
      const names: { emoji: string; name: string }[] = [];
      let mine: string | null = null;

      snapshot.forEach((d) => {
        const data = d.data();
        const emoji = data.emoji as string;
        counts[emoji] = (counts[emoji] || 0) + 1;
        names.push({ emoji, name: (data.byName as string) || 'Someone' });
        if (d.id === myUid) mine = emoji;
      });

      onData({ counts, mine, names });
    },
    (err) => console.error('Reaction listener error:', err)
  );
}

export async function addReply(
  announcementId: string,
  author: User,
  text: string
): Promise<void> {
  await setDoc(doc(collection(db, 'announcements', announcementId, 'replies')), {
    authorId: author.uid,
    authorName: displayName(author),
    authorRole: author.role === 'parent' ? 'parent' : 'staff',
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function fetchReplies(announcementId: string) {
  const snapshot = await getDocs(
    query(collection(db, 'announcements', announcementId, 'replies'), orderBy('createdAt'))
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  }));
}
