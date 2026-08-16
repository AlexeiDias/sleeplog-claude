//components/parent/ChildStrip.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child } from '@/types';
import { formatAge, childInitial } from '@/lib/childDisplay';

/**
 * Photo, name and age of each child, shown under the parent portal header.
 *
 * Uses the same photoUrl the dashboard and the kiosk use, so a parent sees the
 * face they are used to seeing rather than a name in a list.
 */
export default function ChildStrip({ familyId }: { familyId?: string }) {
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!familyId) return;

    let cancelled = false;
    getDocs(query(collection(db, 'children'), where('familyId', '==', familyId)))
      .then((snapshot) => {
        if (cancelled) return;
        setChildren(
          snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
              dateOfBirth: d.data().dateOfBirth?.toDate() || new Date(),
              createdAt: d.data().createdAt?.toDate() || new Date(),
            }))
            .filter((c) => !(c as Child).archived) as Child[]
        );
      })
      .catch((err) => console.error('Could not load children for header:', err));

    return () => {
      cancelled = true;
    };
  }, [familyId]);

  if (children.length === 0) return null;

  return (
    <div className="bg-white border-b">
      <div className="max-w-3xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto">
        {children.map((child) => (
          <div key={child.id} className="flex items-center gap-2 shrink-0">
            {child.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={child.photoUrl}
                alt={child.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                {childInitial(child)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {child.name}
              </p>
              <p className="text-xs text-gray-500">{formatAge(child.dateOfBirth)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
