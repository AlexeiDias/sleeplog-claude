//app/settings/daycare/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useRouter } from 'next/navigation';

export default function DaycareSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [daycareData, setDaycareData] = useState({
    name: '',
    address: '',
    licenseNumber: '',
    phoneNumber: '',
    email: '',
    licenseHolderName: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/settings');
      return;
    }

    fetchDaycareData();
  }, [user, router]);

  async function fetchDaycareData() {
    if (!user?.daycareId) return;

    try {
      const daycareDoc = await getDoc(doc(db, 'daycares', user.daycareId));
      if (daycareDoc.exists()) {
        setDaycareData(daycareDoc.data() as any);
      }
    } catch (err) {
      console.error('Error fetching daycare:', err);
      setError('Failed to load daycare information');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDaycareData({
      ...daycareData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!user?.daycareId) throw new Error('Daycare not found');

      await updateDoc(doc(db, 'daycares', user.daycareId), daycareData);

      setSuccess('Daycare information updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.error('Daycare update error:', err);
      setError('Failed to update daycare information');
    } finally {
      setSaving(false);
    }
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Daycare Information</h2>
        {!isEditing && (
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Daycare Name"
            name="name"
            value={daycareData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Address"
            name="address"
            value={daycareData.address}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="License Number"
              name="licenseNumber"
              value={daycareData.licenseNumber}
              onChange={handleChange}
              required
            />

            <Input
              label="Phone Number"
              name="phoneNumber"
              value={daycareData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Daycare Email"
            name="email"
            type="email"
            value={daycareData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="License Holder Name"
            name="licenseHolderName"
            value={daycareData.licenseHolderName}
            onChange={handleChange}
            required
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                fetchDaycareData();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Daycare Name</label>
            <p className="text-gray-900">{daycareData.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Address</label>
            <p className="text-gray-900">{daycareData.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">License Number</label>
              <p className="text-gray-900">{daycareData.licenseNumber}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <p className="text-gray-900">{daycareData.phoneNumber}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{daycareData.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">License Holder</label>
            <p className="text-gray-900">{daycareData.licenseHolderName}</p>
          </div>
        </div>
      )}
    </div>
  );
}