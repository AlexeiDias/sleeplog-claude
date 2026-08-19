//app/parent/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getDateKey } from '@/lib/parentAuth';
import Link from 'next/link';
import AddToHomeScreenTip from '@/components/parent/AddToHomeScreenTip';
import SuppliesNote from '@/components/parent/SuppliesNote';
import SetPasswordCard from '@/components/parent/SetPasswordCard';
import AnnouncementList from '@/components/announcements/AnnouncementList';
import { Child } from '@/types';

type FeedKind = 'sleep' | 'care' | 'activity' | 'incident';

interface FeedItem {
  id: string;
  kind: FeedKind;
  timestamp: Date;
  title: string;
  detail?: string;
  staffInitials?: string;
}

interface ChildFeed {
  child: Child;
  items: FeedItem[];
}

const KIND_STYLES: Record<FeedKind, { icon: string; chip: string }> = {
  sleep: { icon: '\u{1F634}', chip: 'bg-indigo-100 text-indigo-800' },
  care: { icon: '\u{1F37C}', chip: 'bg-emerald-100 text-emerald-800' },
  activity: { icon: '\u{1F3A8}', chip: 'bg-amber-100 text-amber-800' },
  incident: { icon: '\u26A0\uFE0F', chip: 'bg-red-100 text-red-800' },
};

// Log subcollection name per feed kind. Each gets its own live listener.
const KIND_COLLECTIONS: Record<FeedKind, string> = {
  sleep: 'sleepLogs',
  care: 'careLogs',
  activity: 'activityLogs',
  incident: 'incidentLogs',
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type DocData = Record<string, unknown>;

// Plain words for a parent reading their child's day. "tried" on its own reads
// as a failure; "Tried, nothing yet" does not.
const BATHROOM_WORDS: Record<string, string> = {
  pee: 'Pee',
  poop: 'Poop',
  both: 'Pee and poop',
  accident: 'Accident',
  tried: 'Tried, nothing yet',
};

function buildItem(kind: FeedKind, id: string, data: DocData): FeedItem | null {
  const parts: string[] = [];
  const push = (value: unknown, prefix = '') => {
    if (value) parts.push(prefix ? `${prefix}${value}` : String(value));
  };

  if (kind === 'sleep') {
    const type = data.type;
    const title =
      type === 'start' ? 'Went down for a nap'
      : type === 'stop' ? 'Woke up'
      : 'Sleep check';
    push(data.position, 'Position: ');
    push(data.breathing, 'Breathing: ');
    push(data.mood, 'Mood: ');
    push(data.notes);
    return {
      id: `sleep-${id}`, kind, timestamp: toDate(data.timestamp), title,
      detail: parts.join(' \u00B7 ') || undefined,
      staffInitials: data.staffInitials as string | undefined,
    };
  }

  if (kind === 'care') {
    let title = 'Care';
    if (data.type === 'bathroom') {
      title = 'Bathroom';
      push(BATHROOM_WORDS[data.result as string] || data.result);
    } else if (data.type === 'diaper') {
      title = 'Diaper change';
      push(data.diaperType);
    } else if (data.type === 'bottle') {
      title = 'Bottle';
      if (data.amount) parts.push(`${data.amount} oz`);
    } else if (data.type === 'meal') {
      title = 'Meal';
      push(data.ingredients);
      if (data.amount) parts.push(`${data.amount} oz`);
      const nutrition = data.nutrition as { totalCalories?: number } | undefined;
      if (nutrition?.totalCalories) {
        parts.push(`${Math.round(nutrition.totalCalories)} cal`);
      }
    }
    push(data.comments);
    return {
      id: `care-${id}`, kind, timestamp: toDate(data.timestamp), title,
      detail: parts.join(' \u00B7 ') || undefined,
      staffInitials: data.staffInitials as string | undefined,
    };
  }

  if (kind === 'activity') {
    if (data.deleted) return null;
    push(data.category);
    if (data.duration) parts.push(`${data.duration} min`);
    push(data.notes);
    return {
      id: `activity-${id}`, kind, timestamp: toDate(data.timestamp),
      title: (data.activityName as string) || 'Activity',
      detail: parts.join(' \u00B7 ') || undefined,
      staffInitials: data.staffInitials as string | undefined,
    };
  }

  if (data.deleted) return null;
  push(data.location, 'Location: ');
  push(data.bodyPartAffected);
  push(data.firstAidGiven, 'First aid: ');
  return {
    id: `incident-${id}`, kind, timestamp: toDate(data.timestamp),
    title: `Incident \u2014 ${data.type || 'other'}`,
    detail: [data.description, parts.join(' \u00B7 ')].filter(Boolean).join(' \u00B7 '),
    staffInitials: data.staffInitials as string | undefined,
  };
}

export default function ParentDailyFeedPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));
  const [children, setChildren] = useState<Child[]>([]);
  const [itemsByChild, setItemsByChild] = useState<Record<string, FeedItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Raw results per child per kind, merged into itemsByChild on every snapshot.
  const bucketsRef = useRef<Map<string, FeedItem[]>>(new Map());

  // Children rarely change, so one read is enough here — it is the day's log
  // entries that need to be live.
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getDocs(query(collection(db, 'children'), where('familyId', '==', user.familyId)))
      .then((snapshot) => {
        if (cancelled) return;
        setChildren(
          snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
              dateOfBirth: toDate(d.data().dateOfBirth),
              createdAt: toDate(d.data().createdAt),
            }))
            .filter((child) => !(child as Child).archived) as Child[]
        );
      })
      .catch((err) => {
        console.error('Error loading children:', err);
        if (!cancelled) setError('We could not load your children. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.familyId]);

  const childIdKey = useMemo(() => children.map((c) => c.id).join(','), [children]);

  // Live listeners on each log subcollection, so an entry logged by staff shows
  // up without the parent switching tabs to force a refetch.
  useEffect(() => {
    if (children.length === 0) return;

    bucketsRef.current = new Map();
    setItemsByChild({});

    const flush = () => {
      const merged: Record<string, FeedItem[]> = {};
      bucketsRef.current.forEach((items, key) => {
        const childId = key.split('::')[0];
        merged[childId] = (merged[childId] || []).concat(items);
      });
      Object.values(merged).forEach((items) =>
        items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      );
      setItemsByChild(merged);
    };

    const unsubscribes = children.flatMap((child) =>
      (Object.keys(KIND_COLLECTIONS) as FeedKind[]).map((kind) =>
        onSnapshot(
          collection(
            db, 'children', child.id, KIND_COLLECTIONS[kind], selectedDate, 'entries'
          ),
          (snapshot) => {
            bucketsRef.current.set(
              `${child.id}::${kind}`,
              snapshot.docs
                .map((d) => buildItem(kind, d.id, d.data() as DocData))
                .filter((item): item is FeedItem => item !== null)
            );
            flush();
          },
          (err) => {
            console.error(`Feed listener error (${kind}):`, err);
            setError(
              'We could not load part of your child\u2019s day. Please contact your daycare if this keeps happening.'
            );
          }
        )
      )
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // childIdKey stands in for the children array, whose identity changes on
    // every load even when the same children come back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdKey, selectedDate]);

  const feeds: ChildFeed[] = children.map((child) => ({
    child,
    items: itemsByChild[child.id] || [],
  }));

  const isToday = selectedDate === getDateKey(new Date());

  return (
    <div className="space-y-6">
      <AddToHomeScreenTip />
      <SetPasswordCard />

      {user && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-1">From the daycare</h2>
          <p className="text-sm text-gray-600 mb-3">
            News and photos shared with all families.
          </p>
          {/* Capped at three so announcements never push the day's entries
              off the top of a phone screen. */}
          <AnnouncementList user={user} viewerRole="parent" limit={3} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isToday ? 'Today' : 'Daily summary'}
            </h2>
            <p className="text-sm text-gray-600">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              max={getDateKey(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Link
              href="/parent/reports"
              className="text-sm text-blue-600 hover:underline whitespace-nowrap"
            >
              Download records
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            No children are linked to your account yet. Please contact your daycare.
          </p>
        </div>
      ) : (
        feeds.map(({ child, items }) => (
          <div key={child.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
              {child.photoUrl ? (
                <img
                  src={child.photoUrl}
                  alt={child.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                  {child.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-800">{child.name}</h3>
                <p className="text-xs text-gray-500">
                  {items.length} {items.length === 1 ? 'entry' : 'entries'} logged
                </p>
                {/* What is left at the daycare, so a parent can check before
                    shopping. Read-only; staff hold the real count. */}
                <SuppliesNote childId={child.id} />
              </div>
            </div>

            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                Nothing logged for this day yet.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id} className="p-4 flex gap-3">
                    <div className="text-xl leading-none pt-0.5">
                      {KIND_STYLES[item.kind].icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      {item.detail && (
                        <p className="text-sm text-gray-600 mt-0.5 break-words">
                          {item.detail}
                        </p>
                      )}
                      {item.staffInitials && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            KIND_STYLES[item.kind].chip
                          }`}
                        >
                          Logged by {item.staffInitials}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      <p className="text-xs text-gray-500 text-center px-4">
        This portal shows care records as logged by daycare staff. If something
        looks wrong, please contact your daycare directly.
      </p>
    </div>
  );
}
