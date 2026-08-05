//app/parent/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getDateKey } from '@/lib/parentAuth';
import AddToHomeScreenTip from '@/components/parent/AddToHomeScreenTip';
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
  sleep: { icon: '😴', chip: 'bg-indigo-100 text-indigo-800' },
  care: { icon: '🍼', chip: 'bg-emerald-100 text-emerald-800' },
  activity: { icon: '🎨', chip: 'bg-amber-100 text-amber-800' },
  incident: { icon: '⚠️', chip: 'bg-red-100 text-red-800' },
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

export default function ParentDailyFeedPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));
  const [feeds, setFeeds] = useState<ChildFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const childrenSnapshot = await getDocs(
        query(collection(db, 'children'), where('familyId', '==', user.familyId))
      );

      // Archived children are filtered client-side, matching the dashboard —
      // older child documents predate the archived field entirely.
      const children = childrenSnapshot.docs
        .map((childDoc) => ({
          id: childDoc.id,
          ...childDoc.data(),
          dateOfBirth: toDate(childDoc.data().dateOfBirth),
          createdAt: toDate(childDoc.data().createdAt),
        }))
        .filter((child) => !(child as Child).archived) as Child[];

      const dateKey = selectedDate;

      const results = await Promise.all(
        children.map(async (child) => {
          const [sleepSnap, careSnap, activitySnap, incidentSnap] =
            await Promise.all([
              getDocs(collection(db, 'children', child.id, 'sleepLogs', dateKey, 'entries')),
              getDocs(collection(db, 'children', child.id, 'careLogs', dateKey, 'entries')),
              getDocs(collection(db, 'children', child.id, 'activityLogs', dateKey, 'entries')),
              getDocs(collection(db, 'children', child.id, 'incidentLogs', dateKey, 'entries')),
            ]);

          const items: FeedItem[] = [];

          sleepSnap.forEach((entryDoc) => {
            const data = entryDoc.data();
            const label =
              data.type === 'start'
                ? 'Went down for a nap'
                : data.type === 'stop'
                ? 'Woke up'
                : 'Sleep check';
            const parts: string[] = [];
            if (data.position) parts.push(`Position: ${data.position}`);
            if (data.breathing) parts.push(`Breathing: ${data.breathing}`);
            if (data.mood) parts.push(`Mood: ${data.mood}`);
            if (data.notes) parts.push(data.notes);

            items.push({
              id: `sleep-${entryDoc.id}`,
              kind: 'sleep',
              timestamp: toDate(data.timestamp),
              title: label,
              detail: parts.join(' · ') || undefined,
              staffInitials: data.staffInitials,
            });
          });

          careSnap.forEach((entryDoc) => {
            const data = entryDoc.data();
            let title = 'Care';
            const parts: string[] = [];

            if (data.type === 'diaper') {
              title = 'Diaper change';
              if (data.diaperType) parts.push(String(data.diaperType));
            } else if (data.type === 'bottle') {
              title = 'Bottle';
              if (data.amount) parts.push(`${data.amount} oz`);
            } else if (data.type === 'meal') {
              title = 'Meal';
              if (data.ingredients) parts.push(String(data.ingredients));
              if (data.amount) parts.push(`${data.amount} oz`);
              if (data.nutrition?.totalCalories) {
                parts.push(`${Math.round(data.nutrition.totalCalories)} cal`);
              }
            }

            if (data.comments) parts.push(String(data.comments));

            items.push({
              id: `care-${entryDoc.id}`,
              kind: 'care',
              timestamp: toDate(data.timestamp),
              title,
              detail: parts.join(' · ') || undefined,
              staffInitials: data.staffInitials,
            });
          });

          activitySnap.forEach((entryDoc) => {
            const data = entryDoc.data();
            if (data.deleted) return;
            const parts: string[] = [];
            if (data.category) parts.push(String(data.category));
            if (data.duration) parts.push(`${data.duration} min`);
            if (data.notes) parts.push(String(data.notes));

            items.push({
              id: `activity-${entryDoc.id}`,
              kind: 'activity',
              timestamp: toDate(data.timestamp),
              title: data.activityName || 'Activity',
              detail: parts.join(' · ') || undefined,
              staffInitials: data.staffInitials,
            });
          });

          incidentSnap.forEach((entryDoc) => {
            const data = entryDoc.data();
            if (data.deleted) return;
            const parts: string[] = [];
            if (data.location) parts.push(`Location: ${data.location}`);
            if (data.bodyPartAffected) parts.push(String(data.bodyPartAffected));
            if (data.firstAidGiven) parts.push(`First aid: ${data.firstAidGiven}`);

            items.push({
              id: `incident-${entryDoc.id}`,
              kind: 'incident',
              timestamp: toDate(data.timestamp),
              title: `Incident — ${data.type || 'other'}`,
              detail: [data.description, parts.join(' · ')]
                .filter(Boolean)
                .join(' · '),
              staffInitials: data.staffInitials,
            });
          });

          items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          return { child, items };
        })
      );

      setFeeds(results);
    } catch (err) {
      console.error('Error loading parent feed:', err);
      setError(
        'We could not load your child’s day. Please try again, or contact your daycare if this keeps happening.'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.familyId, selectedDate]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const isToday = selectedDate === getDateKey(new Date());

  return (
    <div className="space-y-6">
      <AddToHomeScreenTip />

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
          <input
            type="date"
            value={selectedDate}
            max={getDateKey(new Date())}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
