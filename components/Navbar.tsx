//components/Navbar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsReportsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard">
              <h1 className="text-2xl font-bold text-blue-900 cursor-pointer">💤 SleepLog</h1>
            </Link>
            
            {user.role === 'admin' && (
              <Link href="/staff" className="text-gray-600 hover:text-gray-900">
                Staff
              </Link>
            )}
            
            {/* Reports Dropdown - Click to toggle */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="text-gray-600 hover:text-gray-900 flex items-center focus:outline-none"
              >
                Reports
                <svg 
                  className={`w-4 h-4 ml-1 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isReportsOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <div className="py-2">
                    <Link 
                      href="/reports" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsReportsOpen(false)}
                    >
                      📊 Daily Sleep Reports
                    </Link>
                    <Link 
                      href="/reports/sign-in-out" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsReportsOpen(false)}
                    >
                      📋 Sign-In/Out Records
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <Link href="/analytics" className="text-gray-600 hover:text-gray-900">
              Analytics
            </Link>
            
            {/* Kiosk Setup - Admin Only */}
            {user.role === 'admin' && (
              <Link href="/kiosk-setup" className="text-gray-600 hover:text-gray-900">
                🖥️ Kiosk
              </Link>
            )}
            
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
              {user.initials && (
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  {user.initials}
                </span>
              )}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
              {user.role.toUpperCase()}
            </span>
            {!user.initials && (
              <Link href="/profile">
                <Button variant="primary" className="text-xs">
                  Set Initials
                </Button>
              </Link>
            )}
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
