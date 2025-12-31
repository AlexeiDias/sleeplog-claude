//app/staff/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import { User } from '@/types';
import Link from 'next/link';

export default function StaffManagementPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [editInitials, setEditInitials] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (!user.daycareId) {
      router.push('/register/daycare');
      return;
    }

    fetchStaff();
  }, [user, router]);

  async function fetchStaff() {
    if (!user?.daycareId) return;

    try {
      const q = query(
        collection(db, 'users'),
        where('daycareId', '==', user.daycareId)
      );
      const snapshot = await getDocs(q);
      const staffData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as User[];

      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateInitials(staffId: string) {
    if (!editInitials.trim()) {
      alert('Please enter initials');
      return;
    }

    if (editInitials.length > 5) {
      alert('Initials should be 5 characters or less');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', staffId), {
        initials: editInitials.trim().toUpperCase(),
      });

      // Refresh staff list
      await fetchStaff();
      setEditingStaff(null);
      setEditInitials('');
      alert('Initials updated successfully!');
    } catch (error) {
      console.error('Error updating initials:', error);
      alert('Failed to update initials');
    }
  }

  async function handleDeactivateStaff(staffId: string, staffName: string) {
    const confirmed = confirm(
      `Are you sure you want to remove ${staffName} from your daycare? They will lose access to the system.`
    );

    if (!confirmed) return;

    try {
      // Remove daycareId from user (keeps account but removes access)
      await updateDoc(doc(db, 'users', staffId), {
        daycareId: null,
      });

      await fetchStaff();
      alert('Staff member removed successfully');
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold text-blue-900 cursor-pointer">💤 SleepLog</h1>
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/staff" className="text-blue-600 font-medium">
                Staff
              </Link>
              <Link href="/reports" className="text-gray-600 hover:text-gray-900">
                Reports
              </Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">
                Analytics
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {user.role.toUpperCase()}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-600 mt-1">Manage staff members and their access</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/staff/invite')}>
            + Invite Staff
          </Button>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initials
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.uid}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingStaff === member.uid ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editInitials}
                          onChange={(e) => setEditInitials(e.target.value.toUpperCase())}
                          maxLength={5}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm uppercase"
                          placeholder="JD"
                        />
                        <button
                          onClick={() => handleUpdateInitials(member.uid)}
                          className="text-green-600 hover:text-green-800 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingStaff(null);
                            setEditInitials('');
                          }}
                          className="text-gray-600 hover:text-gray-800 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {member.initials || (
                            <span className="text-red-500 italic">Not set</span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setEditingStaff(member.uid);
                            setEditInitials(member.initials || '');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {member.uid !== user.uid && (
                      <button
                        onClick={() => handleDeactivateStaff(member.uid, `${member.firstName} ${member.lastName}`)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                    {member.uid === user.uid && (
                      <span className="text-gray-400 italic">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {staff.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No staff members found</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Staff Management Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Admins can register daycares, families, and manage all features</li>
            <li>• Staff members can only log sleep sessions</li>
            <li>• All staff must set their initials for compliance documentation</li>
            <li>• Removing a staff member revokes their access to your daycare</li>
          </ul>
        </div>
      </main>
    </div>
  );
}