//components/announcements/AnnouncementList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Announcement, User } from '@/types';
import {
  ALLOWED_REACTIONS, ReactionEmoji, ReactionSummary,
  subscribeToAnnouncements, subscribeToReactions, setReaction,
  addReply, fetchReplies,
} from '@/lib/announcements';
import { formatMessageTime } from '@/lib/messaging';
import Button from '@/components/Button';

interface AnnouncementListProps {
  user: User;
  /** Staff see reactor names and every post's reply setting. Parents do not. */
  viewerRole: 'parent' | 'staff';
  limit?: number;
}

interface Reply {
  id: string;
  authorName?: string;
  authorRole?: string;
  text?: string;
  createdAt: Date;
}

export default function AnnouncementList({
  user,
  viewerRole,
  limit,
}: AnnouncementListProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // No setState in this branch — an account with no daycare has nothing to
    // show, and that is decided during render below rather than here.
    if (!user.daycareId) return;

    const unsubscribe = subscribeToAnnouncements(
      user.daycareId,
      (list) => {
        setItems(list);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('Announcement listener error:', err);
        setError('Could not load announcements.');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user.daycareId]);

  if (!user.daycareId) return null;

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        {viewerRole === 'staff'
          ? 'No announcements yet. Post one above.'
          : 'No news from the daycare yet.'}
      </p>
    );
  }

  const visible = limit ? items.slice(0, limit) : items;

  return (
    <div className="space-y-4">
      {visible.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          user={user}
          viewerRole={viewerRole}
        />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  user,
  viewerRole,
}: {
  announcement: Announcement;
  user: User;
  viewerRole: 'parent' | 'staff';
}) {
  const [summary, setSummary] = useState<ReactionSummary>({
    counts: {}, mine: null, names: [],
  });
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return subscribeToReactions(announcement.id, user.uid, setSummary);
  }, [announcement.id, user.uid]);

  async function loadReplies() {
    try {
      setReplies((await fetchReplies(announcement.id)) as Reply[]);
      setShowReplies(true);
    } catch (err) {
      console.error('Could not load replies:', err);
    }
  }

  async function toggleReaction(emoji: ReactionEmoji) {
    try {
      await setReaction(announcement.id, user, summary.mine === emoji ? null : emoji);
    } catch (err) {
      console.error('Could not save reaction:', err);
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await addReply(announcement.id, user, replyText);
      setReplyText('');
      await loadReplies();
    } catch (err) {
      console.error('Could not post reply:', err);
    } finally {
      setSending(false);
    }
  }

  const canReply = viewerRole === 'staff' || announcement.allowReplies;
  const totalReactions = Object.values(summary.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-baseline gap-2 mb-2">
          <p className="text-sm font-medium text-gray-800">{announcement.authorName}</p>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatMessageTime(announcement.createdAt)}
          </span>
        </div>

        {announcement.text && (
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {announcement.text}
          </p>
        )}

        {announcement.attachments && announcement.attachments.length > 0 && (
          <div
            className={`grid gap-2 mt-3 ${
              announcement.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {announcement.attachments.map((attachment) => (
              <a
                key={attachment.path}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="rounded w-full object-cover max-h-64"
                />
              </a>
            ))}
          </div>
        )}

        {viewerRole === 'staff' && (
          <p className="text-xs text-gray-400 mt-2">
            {announcement.allowReplies ? 'Replies allowed' : 'Reactions only'}
          </p>
        )}
      </div>

      <div className="px-4 py-2 border-t bg-gray-50 flex items-center gap-1 flex-wrap">
        {ALLOWED_REACTIONS.map((emoji) => {
          const count = summary.counts[emoji] || 0;
          const isMine = summary.mine === emoji;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              aria-pressed={isMine}
              className={`text-sm px-2 py-1 rounded-full border transition-colors ${
                isMine
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              {count > 0 && <span className="ml-1 text-xs text-gray-600">{count}</span>}
            </button>
          );
        })}

        {viewerRole === 'staff' && totalReactions > 0 && (
          <span className="ml-2 text-xs text-gray-500">
            {summary.names.map((n) => n.name).join(', ')}
          </span>
        )}
      </div>

      {canReply && (
        <div className="px-4 py-3 border-t">
          {!showReplies ? (
            <button
              onClick={loadReplies}
              className="text-sm text-blue-600 hover:underline"
            >
              {viewerRole === 'staff' ? 'View replies' : 'Reply'}
            </button>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <span className="font-medium text-gray-800">{reply.authorName}</span>
                  <span className="text-gray-500 ml-2 text-xs">
                    {formatMessageTime(reply.createdAt)}
                  </span>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {reply.text}
                  </p>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base"
                />
                <Button
                  variant="primary"
                  isLoading={sending}
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!canReply && viewerRole === 'parent' && (
        <p className="px-4 py-2 border-t text-xs text-gray-500">
          Replies are off for this post. To reach the daycare, use Messages.
        </p>
      )}
    </div>
  );
}
