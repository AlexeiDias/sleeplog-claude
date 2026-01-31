//app/reports/sign-in-out/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';
import { SignInOutRecord } from '@/types';

// Helper function to get local date string (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SignInOutReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<SignInOutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.daycareId) {
      router.push('/register/daycare');
      return;
    }

    fetchRecords();
  }, [user, router, selectedDate]);

  async function fetchRecords() {
    if (!user?.daycareId) return;

    setLoading(true);

    try {
      // Create date range for selected date (start of day to end of day)
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'signInOut'),
        where('daycareId', '==', user.daycareId),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const recordsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as SignInOutRecord[];

      setRecords(recordsData);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handlePrint() {
    window.print();
  }

  function exportToCSV() {
    if (records.length === 0) {
      alert('No records to export');
      return;
    }

    const headers = ['Time', 'Child Name', 'Type', 'Parent/Guardian', 'Relationship', 'ID Number', 'Notes'];
    const rows = records.map(record => [
      formatTime(record.timestamp),
      record.childName,
      record.type === 'sign-in' ? 'Sign In' : 'Sign Out',
      record.parentFullName,
      record.relationship,
      record.idNumber || '-',
      record.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign-in-out-records-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const signIns = records.filter(r => r.type === 'sign-in');
  const signOuts = records.filter(r => r.type === 'sign-out');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Sign-In/Out Records</h2>
          
          {/* Date Picker & Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                label="View Records For"
              />
              
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handlePrint}>
                  🖨️ Print
                </Button>
                <Button variant="secondary" onClick={exportToCSV}>
                  📥 Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{records.length}</div>
            <div className="text-sm text-gray-600">Total Records</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600">{signIns.length}</div>
            <div className="text-sm text-gray-600">Sign-Ins</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-600">{signOuts.length}</div>
            <div className="text-sm text-gray-600">Sign-Outs</div>
          </div>
        </div>

        {/* Records Table */}
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Records Found
            </h3>
            <p className="text-gray-600">
              No sign-in/out records for this date
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Child
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent/Guardian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Relationship
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.childName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.type === 'sign-in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.type === 'sign-in' ? '✅ Sign In' : '👋 Sign Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.parentFullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.relationship}
                        {record.idNumber && (
                          <span className="block text-xs text-gray-400">
                            ID: {record.idNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.signature ? (
                          <img
                            src={record.signature}
                            alt="Signature"
                            className="h-10 w-auto border border-gray-200 rounded"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">No signature</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 About Sign-In/Out Records</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Records are created when parents sign in/out at the kiosk</li>
            <li>• Electronic signatures are captured and stored securely</li>
            <li>• Export to CSV for your records or compliance reports</li>
            <li>• Print feature creates a printable version of the records</li>
          </ul>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          nav, .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
