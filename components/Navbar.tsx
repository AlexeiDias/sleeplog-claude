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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reportsDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target as Node)) {
        setIsReportsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
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
          {/* Left side - Logo and main nav */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/dashboard">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900 cursor-pointer">💤 SleepLog</h1>
            </Link>
            
            {/* Desktop Navigation - Always visible */}
            <div className="hidden sm:flex items-center ml-8 space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              
              {/* Reports Dropdown */}
              <div className="relative" ref={reportsDropdownRef}>
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
              
              {/* Kiosk - Admin Only */}
              {user.role === 'admin' && (
                <Link href="/kiosk-setup" className="text-gray-600 hover:text-gray-900">
                  🖥️ Kiosk
                </Link>
              )}
            </div>

            {/* Mobile Navigation - Primary links always visible */}
            <div className="flex sm:hidden items-center ml-4 space-x-3">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
                Home
              </Link>
              
              {/* Reports Dropdown - Mobile */}
              <div className="relative" ref={reportsDropdownRef}>
                <button
                  onClick={() => setIsReportsOpen(!isReportsOpen)}
                  className="text-gray-600 hover:text-gray-900 flex items-center focus:outline-none text-sm"
                >
                  Reports
                  <svg 
                    className={`w-3 h-3 ml-1 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isReportsOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    <div className="py-2">
                      <Link 
                        href="/reports" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsReportsOpen(false)}
                      >
                        📊 Sleep Reports
                      </Link>
                      <Link 
                        href="/reports/sign-in-out" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsReportsOpen(false)}
                      >
                        📋 Sign-In/Out
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Kiosk - Mobile Admin Only */}
              {user.role === 'admin' && (
                <Link href="/kiosk-setup" className="text-gray-600 hover:text-gray-900 text-sm">
                  🖥️
                </Link>
              )}
            </div>
          </div>
          
          {/* Right side - Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            {user.role === 'admin' && (
              <Link href="/staff" className="text-gray-600 hover:text-gray-900">
                Staff
              </Link>
            )}
            <Link href="/analytics" className="text-gray-600 hover:text-gray-900">
              Analytics
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
            
            <div className="flex items-center space-x-3 border-l pl-6">
              <span className="text-sm text-gray-600">
                {user.firstName}
                {user.initials && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {user.initials}
                  </span>
                )}
              </span>
              <Button variant="secondary" onClick={handleLogout} className="text-sm">
                Logout
              </Button>
            </div>
          </div>

          {/* Right side - Mobile hamburger menu */}
          <div className="md:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="absolute right-4 mt-2 w-56 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                <div className="py-2">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {user.role.toUpperCase()}
                      </span>
                      {user.initials && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          {user.initials}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-2">
                    {user.role === 'admin' && (
                      <Link 
                        href="/staff" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        👥 Staff
                      </Link>
                    )}
                    <Link 
                      href="/analytics" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      📈 Analytics
                    </Link>
                    <Link 
                      href="/settings" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ⚙️ Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
