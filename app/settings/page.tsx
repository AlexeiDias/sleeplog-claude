//app/settings/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingInitials, setIsEditingInitials] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  const [initials, setInitials] = useState(user?.initials || '');

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user) throw new Error('User not found');

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
      });

      await refreshUser();
      setSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateInitials(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!initials.trim()) {
      setError('Initials cannot be empty');
      return;
    }

    if (initials.length > 5) {
      setError('Initials should be 5 characters or less');
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error('User not found');

      await updateDoc(doc(db, 'users', user.uid), {
        initials: initials.trim().toUpperCase(),
      });

      await refreshUser();
      setSuccess('Initials updated successfully!');
      setIsEditingInitials(false);
    } catch (err: any) {
      console.error('Initials update error:', err);
      setError('Failed to update initials');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (!auth.currentUser) throw new Error('User not found');

      await updatePassword(auth.currentUser, passwordData.newPassword);

      setSuccess('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setIsEditingPassword(false);
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log back in before changing your password');
      } else {
        setError('Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h2>

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

          {/* Profile Information */}
          <div className="border-b pb-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Personal Information</h3>
              {!isEditingProfile && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingProfile(true)}
                  className="text-sm"
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" isLoading={loading}>
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileData({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-gray-900 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Initials */}
          <div className="border-b pb-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Staff Initials</h3>
              {!isEditingInitials && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingInitials(true)}
                  className="text-sm"
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditingInitials ? (
              <form onSubmit={handleUpdateInitials} className="space-y-4">
                <Input
                  label="Initials"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  maxLength={5}
                  required
                  className="uppercase"
                />
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" isLoading={loading}>
                    Save Initials
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingInitials(false);
                      setInitials(user.initials || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-500">Current Initials</label>
                <p className="text-gray-900 font-medium text-lg">
                  {user.initials || <span className="text-red-500 italic">Not set</span>}
                </p>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Password</h3>
              {!isEditingPassword && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingPassword(true)}
                  className="text-sm"
                >
                  Change Password
                </Button>
              )}
            </div>

            {isEditingPassword ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                />
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" isLoading={loading}>
                    Update Password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-gray-600 text-sm">••••••••</p>
            )}
          </div>
        </div>
    </>
  );
}
