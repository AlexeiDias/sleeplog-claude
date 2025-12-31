//app/staff/invite/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Link from 'next/link';

export default function InviteStaffPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    initials: '',
  });

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
  }, [user, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'initials' ? value.toUpperCase() : value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please enter first and last name');
      return;
    }

    if (!formData.initials.trim()) {
      setError('Please enter staff initials (required for compliance)');
      return;
    }

    if (formData.initials.length > 5) {
      setError('Initials should be 5 characters or less');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (!user?.daycareId) throw new Error('Daycare not found');

      // Get current user's auth token to restore later
      const currentUser = auth.currentUser;

      // Create a secondary Firebase app instance for staff creation
      let secondaryApp;
      try {
        secondaryApp = getApp('secondary');
      } catch {
        secondaryApp = initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }, 'secondary');
      }

      const secondaryAuth = getAuth(secondaryApp);

      // Create the staff user in the secondary auth instance
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        initials: formData.initials.trim().toUpperCase(),
        role: 'staff',
        daycareId: user.daycareId,
        createdAt: new Date(),
      });

      // Sign out from secondary auth (doesn't affect main auth)
      await secondaryAuth.signOut();

      setSuccess(true);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        initials: '',
      });

      setTimeout(() => {
        router.push('/staff');
      }, 2000);

    } catch (err: any) {
      console.error('Staff invitation error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create staff account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <Link href="/staff" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
              ← Back to Staff Management
            </Link>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Invite Staff Member 🧑‍💼
            </h1>
            <p className="text-gray-600">
              Create a new staff account for your daycare
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              Staff member created successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="John"
              />

              <Input
                label="Last Name"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Doe"
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="staff@example.com"
            />

            <Input
              label="Temporary Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />

            <Input
              label="Staff Initials (Required)"
              name="initials"
              type="text"
              value={formData.initials}
              onChange={handleChange}
              required
              maxLength={5}
              placeholder="JD"
              className="uppercase"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>Note:</strong>
              <ul className="mt-2 space-y-1">
                <li>• The staff member will use this email and password to log in</li>
                <li>• They can change their password after first login</li>
                <li>• Initials are required for compliance documentation</li>
                <li>• Staff role only allows sleep logging (no admin access)</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/staff')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                Create Staff Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}