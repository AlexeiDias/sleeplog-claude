// app/kiosk-setup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Daycare {
  id: string;
  name: string;
  address: string;
}

export default function KioskSetupPage() {
  const router = useRouter();
  const [daycares, setDaycares] = useState<Daycare[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDaycareId, setCurrentDaycareId] = useState<string | null>(null);

  useEffect(() => {
    // Check if daycare is already configured
    const savedDaycareId = localStorage.getItem('kioskDaycareId');
    if (savedDaycareId) {
      setCurrentDaycareId(savedDaycareId);
    }

    loadDaycares();
  }, []);

  async function loadDaycares() {
    try {
      const snapshot = await getDocs(collection(db, 'daycares'));
      const daycaresData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        address: doc.data().address,
      })) as Daycare[];

      setDaycares(daycaresData);
    } catch (error) {
      console.error('Error loading daycares:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDaycare(daycareId: string) {
    localStorage.setItem('kioskDaycareId', daycareId);
    setCurrentDaycareId(daycareId);
    
    // Redirect to sign-in page
    setTimeout(() => {
      router.push('/sign-in');
    }, 1000);
  }

  function handleClearConfiguration() {
    localStorage.removeItem('kioskDaycareId');
    setCurrentDaycareId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentDaycareId) {
    const currentDaycare = daycares.find(d => d.id === currentDaycareId);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Kiosk Configured
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              This tablet is set up for:
            </p>
            <div className="bg-green-50 rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                {currentDaycare?.name}
              </h2>
              <p className="text-gray-600">{currentDaycare?.address}</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => router.push('/sign-in')}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold shadow-lg transition-all"
              >
                Go to Sign-In Page
              </button>
              
              <button
                onClick={handleClearConfiguration}
                className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-lg font-semibold transition-all"
              >
                Change Daycare Configuration
              </button>

              <Link
                href="/dashboard"
                className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-semibold transition-all"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🔧 Kiosk Setup
          </h1>
          <p className="text-2xl text-gray-600">
            Select which daycare this tablet will be used for
          </p>
        </div>

        <div className="grid gap-6">
          {daycares.map((daycare) => (
            <button
              key={daycare.id}
              onClick={() => handleSelectDaycare(daycare.id)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 text-left transform hover:scale-102"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {daycare.name}
              </h3>
              <p className="text-lg text-gray-600">{daycare.address}</p>
              <div className="mt-4 text-blue-600 font-semibold flex items-center">
                <span>Select this daycare</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {daycares.length === 0 && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🏢</div>
            <h3 className="text-3xl font-semibold text-gray-700 mb-4">
              No Daycares Found
            </h3>
            <p className="text-xl text-gray-600 mb-6">
              Please register a daycare first before setting up the kiosk.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
