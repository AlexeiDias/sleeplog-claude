//components/messaging/useUnreadMessages.ts
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/messaging';

// Stable identity so the empty case does not produce a new object each render.
const EMPTY: ReadonlySet<string> = new Set();

// A thread is unread for one side when the last message arrived after that
// side last read it. Senders stamp their OWN lastRead field when they send, so
// your own message never shows as unread to you.
function isUnread(lastMessageAt: unknown, lastReadAt: unknown): boolean {
  if (!lastMessageAt) return false;
  if (!lastReadAt) return true;
  return toDate(lastMessageAt).getTime() > toDate(lastReadAt).getTime();
}

/**
 * Staff/admin view: which families have unread messages, live.
 * Query is constrained by daycareId so the list rule is provable.
 */
export function useStaffUnreadThreads(daycareId?: string): {
  unreadFamilyIds: ReadonlySet<string>;
  count: number;
} {
  const [unreadFamilyIds, setUnreadFamilyIds] = useState<ReadonlySet<string>>(EMPTY);

  useEffect(() => {
    if (!daycareId) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'messageThreads'), where('daycareId', '==', daycareId)),
      (snapshot) => {
        const unread = new Set<string>();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (isUnread(data.lastMessageAt, data.lastReadByStaffAt)) {
            unread.add(d.id);
          }
        });
        setUnreadFamilyIds(unread);
      },
      (err) => {
        // A badge is not worth surfacing an error for; log and stay quiet.
        console.error('Unread thread listener error:', err);
      }
    );

    return unsubscribe;
  }, [daycareId]);

  // Derived during render rather than reset inside the effect, so signing out
  // clears the badge without a cascading state update.
  const result = daycareId ? unreadFamilyIds : EMPTY;
  return { unreadFamilyIds: result, count: result.size };
}

/** Parent view: does this family's thread have something new from the daycare? */
export function useParentUnread(familyId?: string): boolean {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'messageThreads', familyId),
      (snapshot) => {
        const data = snapshot.data();
        setUnread(data ? isUnread(data.lastMessageAt, data.lastReadByParentAt) : false);
      },
      (err) => {
        console.error('Unread thread listener error:', err);
      }
    );

    return unsubscribe;
  }, [familyId]);

  return familyId ? unread : false;
}
