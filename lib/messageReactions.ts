//lib/messageReactions.ts
// Reactions on a private message, so a photo or a note can be acknowledged
// without sending "thanks!" and pushing the conversation along.
//
// Same shape as announcement reactions: the document ID is the reacting user's
// uid, which makes one-each, changeable, removable and unforgeable fall out of
// the path rather than needing rules to check anything.

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
  emoji: string;
  byName: string;
  byRole: 'parent' | 'staff';
}

function reactionsPath(familyId: string, messageId: string) {
  return collection(db, 'messageThreads', familyId, 'messages', messageId, 'reactions');
}

/**
 * Add, change or clear the current user's reaction.
 *
 * Tapping the emoji already showing removes it, which is what every messaging
 * app does and what people expect without being told.
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
    'messages',
    messageId,
    'reactions',
    user.uid
  );

  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().emoji === emoji) {
    await deleteDoc(ref);
    return;
  }

  await setDoc(ref, {
    emoji,
    byName: displayName(user),
    byRole: role,
    createdAt: serverTimestamp(),
  });
}

/**
 * Live reactions for every message in a thread, keyed by message ID.
 *
 * One listener per message would mean dozens of listeners on a busy thread, so
 * the caller subscribes per message only for messages currently on screen —
 * see MessageReactions, which does exactly that.
 */
export function subscribeToMessageReactions(
  familyId: string,
  messageId: string,
  onData: (reactions: MessageReaction[]) => void
) {
  return onSnapshot(
    reactionsPath(familyId, messageId),
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => ({
          uid: d.id,
          emoji: (d.data().emoji as string) || '',
          byName: (d.data().byName as string) || 'Someone',
          byRole: (d.data().byRole as 'parent' | 'staff') || 'staff',
        }))
      );
    },
    (err) => console.error('Message reaction listener error:', err)
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
