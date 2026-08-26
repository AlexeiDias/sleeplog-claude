//app/parent/media/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MediaItem } from '@/types';
import { groupByDay, toDate } from '@/lib/messaging';

export default function ParentMediaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Single equality filter, no orderBy: combining where() with orderBy on
      // a different field would need a composite index. Sorting happens in
      // groupByDay instead.
      const snapshot = await getDocs(query(
        collection(db, 'media'),
        where('familyId', '==', user.familyId)
      ));

      setItems(snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toDate(d.data().createdAt),
      })) as MediaItem[]);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error loading media:', err);
      setError(`Could not load photos.${code ? ` (${code})` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = groupByDay(items);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-800">Photos</h2>
        <p className="text-sm text-gray-600">
          Every photo shared about your {items.length === 1 ? 'child' : 'children'}, in one place.
        </p>
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
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No photos yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Photos shared in Messages will appear here.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-medium text-gray-800">{group.label}</h3>
              <p className="text-xs text-gray-500">
                {group.items.length} item{group.items.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item)}
                  className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100"
                >
                  {item.contentType?.startsWith('video/') ? (
                    <>
                      <video
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover bg-black"
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-white text-2xl drop-shadow">
                        ▶
                      </span>
                    </>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.caption || item.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.contentType?.startsWith('video/') ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] bg-black"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightbox.url}
                  alt={lightbox.caption || lightbox.fileName}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              </>
            )}
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {lightbox.caption && (
                  <p className="text-sm text-gray-800 break-words">{lightbox.caption}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Shared by {lightbox.uploadedByName} ·{' '}
                  {lightbox.createdAt.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={lightbox.url}
                  download={lightbox.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  Download
                </a>
                <button
                  onClick={() => setLightbox(null)}
                  className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
