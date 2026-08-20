//lib/messageReactions.ts
// Reactions on a private message, so a photo or a note can be acknowledged
// without sending "thanks!" and pushing the conversation along.
//
// Stored flat under the THREAD, not under each message:
//
//     messageThreads/{familyId}/reactions/{messageId}_{uid}
//
// The first version put them in a subcollection of each message, which meant
// one onSnapshot listener per message on screen. Thirty messages meant thirty
// listeners attaching and detaching as the thread rendered, and that churn
// tripped an internal assertion inside the Firestore SDK
// (firebase-js-sdk#9267) that took the whole page down. One listener per
// thread covers every message and cannot churn.
//
// The document ID still ends in the reacting user's uid, so one-each,
// changeable, removable and unforgeable still fall out of the path.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ALLOWED_REACTIONS } from '@/lib/announcements';
import { displayName } from '@/lib/messaging';
import { User } from '@/types';

export { ALLOWED_REACTIONS };

export interface MessageReaction {
  uid: string;
  messageId: string;
  emoji: string;
  byName: string;
  byRole: 'parent' | 'staff';
}

/** Reactions for every message in a thread, keyed by message ID. */
export type ReactionsByMessage = Record<string, MessageReaction[]>;

export function reactionDocId(messageId: string, uid: string): string {
  return `${messageId}_${uid}`;
}

/**
 * Add, change or clear the current user's reaction.
 *
 * Tapping the emoji already showing removes it, which is what every messaging
 * app does and what nobody needs telling.
 */
export async function setMessageReaction({
  familyId,
  messageId,
  user,
  role,
  emoji,
}: {
  familyId: string;
  messageId: string;
  user: User;
  role: 'parent' | 'staff';
  emoji: string;
}): Promise<void> {
  if (!(ALLOWED_REACTIONS as readonly string[]).includes(emoji)) {
    throw new Error(`Reaction ${emoji} is not allowed`);
  }

  const ref = doc(
    db,
    'messageThreads',
    familyId,
    'reactions',
    reactionDocId(messageId, user.uid)
  );

  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().emoji === emoji) {
    await deleteDoc(ref);
    return;
  }

  await setDoc(ref, {
    messageId,
    uid: user.uid,
    emoji,
    byName: displayName(user),
    byRole: role,
    createdAt: serverTimestamp(),
  });
}

/**
 * One listener for every reaction in the thread.
 *
 * Constrained by the path alone, so the list rule is provable without reading
 * any document.
 */
export function subscribeToThreadReactions(
  familyId: string,
  onData: (byMessage: ReactionsByMessage) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, 'messageThreads', familyId, 'reactions'),
    (snapshot) => {
      const byMessage: ReactionsByMessage = {};

      snapshot.forEach((d) => {
        const data = d.data();
        const messageId = (data.messageId as string) || '';
        if (!messageId) return;

        const reaction: MessageReaction = {
          uid: (data.uid as string) || '',
          messageId,
          emoji: (data.emoji as string) || '',
          byName: (data.byName as string) || 'Someone',
          byRole: (data.byRole as 'parent' | 'staff') || 'staff',
        };

        const existing = byMessage[messageId];
        if (existing) existing.push(reaction);
        else byMessage[messageId] = [reaction];
      });

      onData(byMessage);
    },
    (err) => {
      console.error('Thread reaction listener error:', err);
      onError?.(err);
    }
  );
}

/** Counts per emoji, plus which one the viewer chose. */
export function summarise(
  reactions: MessageReaction[],
  myUid: string
): { counts: Record<string, number>; mine: string | null; names: string[] } {
  const counts: Record<string, number> = {};
  const names: string[] = [];
  let mine: string | null = null;

  for (const reaction of reactions) {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    names.push(`${reaction.byName} ${reaction.emoji}`);
    if (reaction.uid === myUid) mine = reaction.emoji;
  }

  return { counts, mine, names };
}
