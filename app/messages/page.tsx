//app/messages/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import MessageThreadView from '@/components/messaging/MessageThreadView';
import AnnouncementComposer from '@/components/announcements/AnnouncementComposer';
import AnnouncementList from '@/components/announcements/AnnouncementList';
import PhotoBroadcastComposer from '@/components/messaging/PhotoBroadcastComposer';
import { useStaffUnreadThreads } from '@/components/messaging/useUnreadMessages';
import { Family, MessageThread } from '@/types';
import { formatMessageTime, toDate } from '@/lib/messaging';

interface FamilyRow {
  family: Family;
  thread?: MessageThread;
}

export default function StaffMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [selected, setSelected] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { unreadFamilyIds } = useStaffUnreadThreads(user?.daycareId);
  const [view, setView] = useState<'families' | 'group' | 'announcements'>('families');

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user?.daycareId) return;

    setLoading(true);
    setError('');

    try {
      // Both queries constrained by daycareId so the list rules are provable.
      const [familySnap, threadSnap] = await Promise.all([
        getDocs(query(collection(db, 'families'), where('daycareId', '==', user.daycareId))),
        getDocs(query(collection(db, 'messageThreads'), where('daycareId', '==', user.daycareId))),
      ]);

      const threads = new Map<string, MessageThread>();
      threadSnap.docs.forEach((d) => {
        threads.set(d.id, {
          id: d.id,
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          lastMessageAt: d.data().lastMessageAt ? toDate(d.data().lastMessageAt) : undefined,
        } as MessageThread);
      });

      const families = familySnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toDate(d.data().createdAt),
      })) as Family[];

      const withThreads = families
        .map((family) => ({ family, thread: threads.get(family.id) }))
        .sort((a, b) => {
          const at = a.thread?.lastMessageAt?.getTime() || 0;
          const bt = b.thread?.lastMessageAt?.getTime() || 0;
          return bt - at;
        });

      setRows(withThreads);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error loading message threads:', err);
      setError(`Could not load conversations.${code ? ` (${code})` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [user?.daycareId]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
          <p className="text-sm text-gray-600">
            Private conversations with families, and announcements to everyone
          </p>
        </div>

        <div className="mb-4 flex gap-1 border-b">
          {([
            { key: 'families', label: 'Families' },
            { key: 'group', label: 'Group send' },
            { key: 'announcements', label: 'Announcements' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                view === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {view === 'announcements' ? (
          <div className="space-y-6">
            <AnnouncementComposer author={user} />
            <AnnouncementList user={user} viewerRole="staff" />
          </div>
        ) : view === 'group' ? (
          <PhotoBroadcastComposer
            families={rows.map((row) => row.family)}
            currentUser={user}
            daycareId={user.daycareId as string}
            onSent={() => setView('families')}
          />
        ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <div
            className={`bg-white rounded-lg shadow overflow-hidden md:h-[calc(100vh-15rem)] md:min-h-[280px] flex-col ${
              selected ? 'hidden md:flex' : 'flex'
            }`}
          >
            {loading ? (
              <p className="p-6 text-sm text-gray-500 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                No families registered yet.
              </p>
            ) : (
              <ul className="divide-y h-full overflow-y-auto">
                {rows.map(({ family, thread }) => {
                  const name = family.motherName || family.fatherName || 'Unknown family';
                  const active = selected?.id === family.id;
                  return (
                    <li key={family.id}>
                      <button
                        onClick={() => setSelected(family)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                          active ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-baseline gap-2">
                          <p
                            className={`truncate ${
                              unreadFamilyIds.has(family.id)
                                ? 'font-semibold text-gray-900'
                                : 'font-medium text-gray-800'
                            }`}
                          >
                            {unreadFamilyIds.has(family.id) && (
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-2 align-middle"
                                aria-label="Unread messages"
                              />
                            )}
                            {name}
                          </p>
                          {thread?.lastMessageAt && (
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {formatMessageTime(thread.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {thread?.lastMessagePreview || 'No messages yet'}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* A fixed height is what makes MessageThreadView behave as designed:
              its list is flex-1 overflow-y-auto, but with no height above it
              the list just grew and the PAGE became the scroll container, so
              the composer sat at the bottom of a very long page and the
              auto-scroll dragged the whole page instead of the list. */}
          <div
            className={`bg-white rounded-lg shadow overflow-hidden flex-col h-[calc(100vh-15rem)] min-h-[280px] ${
              selected ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selected ? (
              <>
                <div className="px-4 py-3 border-b shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="md:hidden text-sm text-blue-600 hover:underline mb-1"
                  >
                    ← All families
                  </button>
                  <h2 className="font-semibold text-gray-800">
                    {selected.motherName || selected.fatherName || 'Family'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Visible to any parent with portal access to this family
                  </p>
                </div>
                <MessageThreadView
                  key={selected.id}
                  familyId={selected.id}
                  daycareId={selected.daycareId}
                  currentUser={user}
                  viewerRole="staff"
                  emptyHint="No messages yet with this family."
                />
              </>
            ) : (
              <p className="p-12 text-center text-sm text-gray-500">
                Select a family to view the conversation.
              </p>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
