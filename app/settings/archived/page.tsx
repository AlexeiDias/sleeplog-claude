//app/settings/archived/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { Child, Family } from '@/types';

interface ArchivedChildWithFamily {
  child: Child;
  familyName: string;
}

export default function ArchivedChildrenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [archivedChildren, setArchivedChildren] = useState<ArchivedChildWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/settings');
      return;
    }

    fetchArchivedChildren();
  }, [user, router]);

  async function fetchArchivedChildren() {
    if (!user?.daycareId) return;

    try {
      const q = query(
        collection(db, 'children'),
        where('daycareId', '==', user.daycareId),
        where('archived', '==', true)
      );
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        archivedAt: doc.data().archivedAt?.toDate() || null,
      })) as Child[];

      // Fetch family names
      const childrenWithFamilies = await Promise.all(
        children.map(async (child) => {
          let familyName = 'Unknown Family';
          try {
            const familyDoc = await getDoc(doc(db, 'families', child.familyId));
            if (familyDoc.exists()) {
              const data = familyDoc.data();
              familyName = data.motherName || data.fatherName || data.guardianName || 'Unknown Family';
            }
          } catch (err) {
            console.error('Error fetching family:', err);
          }
          return { child, familyName };
        })
      );

      // Sort by archived date (most recent first)
      childrenWithFamilies.sort((a, b) => {
        const dateA = (a.child as any).archivedAt?.getTime() || 0;
        const dateB = (b.child as any).archivedAt?.getTime() || 0;
        return dateB - dateA;
      });

      setArchivedChildren(childrenWithFamilies);
    } catch (err) {
      console.error('Error fetching archived children:', err);
      setError('Failed to load archived children');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(childId: string, childName: string) {
    const confirmed = confirm(
      `Restore ${childName} to the active children list? They will appear on the dashboard and kiosk again.`
    );
    if (!confirmed) return;

    setRestoringId(childId);

    try {
      await updateDoc(doc(db, 'children', childId), {
        archived: false,
        archivedAt: null,
      });
      await fetchArchivedChildren();
    } catch (err) {
      console.error('Error restoring child:', err);
      alert('Failed to restore child. Please try again.');
    } finally {
      setRestoringId(null);
    }
  }

  function formatDOB(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { timeZone: 'UTC' });
  }

  function formatArchivedDate(date: any): string {
    if (!date) return 'Unknown date';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getAgeInMonths(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return (today.getFullYear() - birthDate.getFullYear()) * 12 +
           (today.getMonth() - birthDate.getMonth());
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📦 Archived Children</h2>
            <p className="text-gray-600 text-sm mt-1">
              Children who are no longer attending. Their historical records are preserved.
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push('/settings/families')}>
            ← Back to Families
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {archivedChildren.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Archived Children</h3>
            <p className="text-gray-500">
              When a child leaves the daycare, you can archive them from the Edit Child modal.
              They&apos;ll appear here for easy restoration if they return.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedChildren.map(({ child, familyName }) => {
              const ageInMonths = getAgeInMonths(child.dateOfBirth);
              const isRestoring = restoringId === child.id;

              return (
                <div
                  key={child.id}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    {child.photoUrl ? (
                      <img
                        src={child.photoUrl}
                        alt={child.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-300 opacity-75"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl border-2 border-gray-300">
                        👶
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">{child.name}</p>
                      <p className="text-sm text-gray-600">
                        Family: {familyName}
                      </p>
                      <p className="text-sm text-gray-500">
                        DOB: {formatDOB(child.dateOfBirth)} ({ageInMonths} months old)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        📦 Archived {formatArchivedDate((child as any).archivedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(child.id, child.name)}
                    disabled={isRestoring}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition flex-shrink-0"
                  >
                    {isRestoring ? '⏳ Restoring...' : '♻️ Restore'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <strong className="text-blue-900">ℹ️ About Archived Children:</strong>
        <p className="text-blue-800 mt-1">
          Archived children are hidden from the dashboard, kiosk sign-in, and daily reports.
          All historical data (sleep logs, care logs, incident reports) is preserved.
          You can restore a child at any time by clicking the Restore button.
        </p>
      </div>
    </div>
  );
}
