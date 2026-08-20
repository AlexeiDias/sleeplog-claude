//components/messaging/MessageReactions.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  ALLOWED_REACTIONS,
  MessageReaction,
  setMessageReaction,
  subscribeToMessageReactions,
  summarise,
} from '@/lib/messageReactions';
import { User } from '@/types';

/**
 * Reactions under one message bubble.
 *
 * Shown only when there is something to show or the picker is open, so a quiet
 * thread does not grow a row of empty controls under every message.
 */
export default function MessageReactions({
  familyId,
  messageId,
  currentUser,
  viewerRole,
  onDark,
}: {
  familyId: string;
  messageId: string;
  currentUser: User;
  viewerRole: 'parent' | 'staff';
  /** True inside your own blue bubble, where grey-on-blue is unreadable. */
  onDark?: boolean;
}) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeToMessageReactions(familyId, messageId, setReactions);
  }, [familyId, messageId]);

  const { counts, mine, names } = summarise(reactions, currentUser.uid);
  const chosen = Object.keys(counts);

  async function choose(emoji: string) {
    setBusy(true);
    try {
      await setMessageReaction({
        familyId,
        messageId,
        user: currentUser,
        role: viewerRole,
        emoji,
      });
      setPicking(false);
    } catch (err) {
      console.error('Could not save reaction:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {chosen.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={busy}
          onClick={() => choose(emoji)}
          title={names.join(', ')}
          className={`px-1.5 py-0.5 rounded-full text-xs border ${
            mine === emoji
              ? 'bg-blue-100 border-blue-300 text-blue-900'
              : onDark
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-gray-100 border-gray-200 text-gray-700'
          }`}
        >
          {emoji} {counts[emoji]}
        </button>
      ))}

      {picking ? (
        <span className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1 py-0.5 shadow-sm">
          {ALLOWED_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={busy}
              onClick={() => choose(emoji)}
              className="text-base leading-none px-1 hover:scale-110 transition-transform"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="text-gray-400 text-xs px-1"
            aria-label="Close reactions"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Add a reaction"
          className={`px-1.5 py-0.5 rounded-full text-xs border border-dashed ${
            onDark
              ? 'border-blue-300 text-blue-100 hover:bg-blue-500'
              : 'border-gray-300 text-gray-400 hover:bg-gray-100'
          }`}
        >
          ☺ +
        </button>
      )}
    </div>
  );
}
