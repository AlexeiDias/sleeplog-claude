//app/register/daycare/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function DaycareRegistrationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    licenseNumber: '',
    phoneNumber: '',
    email: '',
    licenseHolderName: '',
  });

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user already has a daycare
    async function checkDaycare() {
      if (user && user.daycareId) {
        // User already has a daycare, redirect to dashboard
        router.push('/dashboard');
      }
    }
    checkDaycare();
  }, [user, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      // Generate unique daycare ID
      const daycareId = `daycare_${Date.now()}`;

      // Create daycare document
      await setDoc(doc(db, 'daycares', daycareId), {
        ...formData,
        adminFirstName: user.firstName,
        adminLastName: user.lastName,
        createdBy: user.uid,
        createdAt: new Date(),
      });

      // Update user document with daycareId
      await setDoc(
        doc(db, 'users', user.uid),
        { daycareId },
        { merge: true }
      );

      // Redirect to family registration
      router.push('/register/family');
    } catch (err: any) {
      console.error('Daycare registration error:', err);
      setError('Failed to register daycare. Please try again.');
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
        <div className="bg-black rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Register Your Daycare 🏢
            </h1>
            <p className="text-gray-600">
              Let's set up your daycare facility information
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Daycare Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Little Stars Daycare"
            />

            <Input
              label="Address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              required
              placeholder="123 Main St, City, CA 12345"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="License Number"
                name="licenseNumber"
                type="text"
                value={formData.licenseNumber}
                onChange={handleChange}
                required
                placeholder="123456789"
              />

              <Input
                label="Phone Number"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="(555) 123-4567"
              />
            </div>

            <Input
              label="Daycare Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="contact@daycare.com"
            />

            <Input
              label="License Holder Name"
              name="licenseHolderName"
              type="text"
              value={formData.licenseHolderName}
              onChange={handleChange}
              required
              placeholder="Jane Smith"
            />

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
              >
                Register Daycare
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Next step:</strong> After registering your daycare, you'll add families and children.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}