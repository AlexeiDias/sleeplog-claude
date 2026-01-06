//app/settings/families/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import EditChildModal from '@/components/EditChildModal';
import EditFamilyModal from '@/components/EditFamilyModal';
import { Family, Child } from '@/types';

interface FamilyWithChildren {
  family: Family;
  children: Child[];
}

export default function FamiliesSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/settings');
      return;
    }

    fetchFamilies();
  }, [user, router]);

  async function fetchFamilies() {
    if (!user?.daycareId) return;

    try {
      // Fetch families
      const familiesQuery = query(
        collection(db, 'families'),
        where('daycareId', '==', user.daycareId)
      );
      const familiesSnapshot = await getDocs(familiesQuery);
      const familiesData = familiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Family[];

      // Fetch children for each family
      const familiesWithChildren = await Promise.all(
        familiesData.map(async (family) => {
          const childrenQuery = query(
            collection(db, 'children'),
            where('familyId', '==', family.id)
          );
          const childrenSnapshot = await getDocs(childrenQuery);
          const children = childrenSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Child[];

          return { family, children };
        })
      );

      setFamilies(familiesWithChildren);
    } catch (err) {
      console.error('Error fetching families:', err);
      setError('Failed to load families');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteChild(childId: string, childName: string) {
    const confirmed = confirm(
      `Are you sure you want to delete ${childName}? This will also delete all sleep logs for this child. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'children', childId));
      await fetchFamilies();
      alert(`${childName} has been deleted successfully`);
    } catch (err) {
      console.error('Error deleting child:', err);
      alert('Failed to delete child');
    }
  }

  async function handleDeleteFamily(familyId: string, familyName: string, childrenCount: number) {
    if (childrenCount > 0) {
      alert('Cannot delete family with children. Please delete all children first.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the ${familyName} family? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'families', familyId));
      await fetchFamilies();
      alert('Family deleted successfully');
    } catch (err) {
      console.error('Error deleting family:', err);
      alert('Failed to delete family');
    }
  }

  // Calculate child's age in months
  function getAgeInMonths(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    return months;
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
            <h2 className="text-2xl font-bold text-gray-800">Families & Children</h2>
            <p className="text-gray-600 text-sm mt-1">Manage your registered families and children</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/register/family')}>
            + Add Family
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {families.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No families registered yet</p>
            <Button variant="primary" onClick={() => router.push('/register/family')}>
              Add First Family
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {families.map(({ family, children }) => {
              const familyName = family.motherName || family.fatherName || 'Unknown Family';
              
              return (
                <div key={family.id} className="border rounded-lg p-4">
                  {/* Family Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{familyName}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {family.motherName && (
                          <div>Mother: {family.motherName} {family.motherEmail && `(${family.motherEmail})`}</div>
                        )}
                        {family.fatherName && (
                          <div>Father: {family.fatherName} {family.fatherEmail && `(${family.fatherEmail})`}</div>
                        )}
                        {family.guardianName && (
                          <div>Guardian: {family.guardianName} {family.guardianPhone && `(${family.guardianPhone})`}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setEditingFamily(family)}
                        className="text-sm"
                      >
                        Edit Family
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteFamily(family.id, familyName, children.length)}
                        className="text-sm"
                      >
                        Delete Family
                      </Button>
                    </div>
                  </div>

                  {/* Children List */}
                  <div className="ml-4 space-y-3">
                    <h4 className="font-medium text-gray-700">Children ({children.length})</h4>
                    {children.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No children in this family</p>
                    ) : (
                      <div className="space-y-2">
                        {children.map((child) => {
                          const ageInMonths = getAgeInMonths(child.dateOfBirth);
                          const isUnderTwo = ageInMonths < 24;
                          
                          return (
                            <div
                              key={child.id}
                              className="flex justify-between items-center bg-gray-50 p-3 rounded"
                            >
                              <div className="flex items-center gap-3">
                                {child.photoUrl && (
                                  <img 
                                    src={child.photoUrl} 
                                    alt={child.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-800">{child.name}</p>
                                  <p className="text-sm text-gray-600">
                                    DOB: {new Date(child.dateOfBirth).toLocaleDateString()}
                                    <span className="ml-2 text-xs">
                                      ({ageInMonths} months old)
                                      {!isUnderTwo && (
                                        <span className="ml-1 text-blue-600 font-medium">
                                          • Over 2 years
                                        </span>
                                      )}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => setEditingChild(child)}
                                  className="text-sm"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => handleDeleteChild(child.id, child.name)}
                                  className="text-sm"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <strong className="text-yellow-900">⚠️ Warning:</strong>
        <p className="text-yellow-800 mt-1">
          Deleting children will permanently remove all their sleep logs and sign-in/out records. 
          This action cannot be undone. Families can only be deleted after all their children have been removed.
        </p>
      </div>

      {/* Edit Child Modal */}
      {editingChild && (
        <EditChildModal
          child={editingChild}
          isOpen={!!editingChild}
          onClose={() => setEditingChild(null)}
          onSuccess={() => {
            setEditingChild(null);
            fetchFamilies(); // Refresh the list
          }}
        />
      )}

      {/* Edit Family Modal */}
      {editingFamily && (
        <EditFamilyModal
          family={editingFamily}
          isOpen={!!editingFamily}
          onClose={() => setEditingFamily(null)}
          onSuccess={() => {
            setEditingFamily(null);
            fetchFamilies(); // Refresh the list
          }}
        />
      )}
    </div>
  );
}
