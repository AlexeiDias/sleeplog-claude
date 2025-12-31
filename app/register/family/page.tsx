//app/register/family/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
}

export default function FamilyRegistrationPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [familyData, setFamilyData] = useState({
    motherName: '',
    motherEmail: '',
    fatherName: '',
    fatherEmail: '',
  });

  const [children, setChildren] = useState<Child[]>([
    { id: '1', name: '', dateOfBirth: '' }
  ]);

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect if not admin
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Refresh user data to get daycareId if just registered
    refreshUser();

    // Check if user has a daycare
    if (user && !user.daycareId) {
      router.push('/register/daycare');
    }
  }, [user, router, refreshUser]);

  function handleFamilyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFamilyData({
      ...familyData,
      [e.target.name]: e.target.value,
    });
  }

  function handleChildChange(id: string, field: string, value: string) {
    setChildren(children.map(child => 
      child.id === id ? { ...child, [field]: value } : child
    ));
  }

  function addChild() {
    const newId = (children.length + 1).toString();
    setChildren([...children, { id: newId, name: '', dateOfBirth: '' }]);
  }

  function removeChild(id: string) {
    if (children.length > 1) {
      setChildren(children.filter(child => child.id !== id));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validation: At least one child must have name and DOB
    const validChildren = children.filter(c => c.name.trim() && c.dateOfBirth);
    if (validChildren.length === 0) {
      setError('Please add at least one child with name and date of birth');
      return;
    }

    setIsLoading(true);

    try {
      if (!user?.daycareId) throw new Error('Daycare not registered');

      // Generate unique family ID
      const familyId = `family_${Date.now()}`;

      // Create family document
      await setDoc(doc(db, 'families', familyId), {
        ...familyData,
        daycareId: user.daycareId,
        createdAt: new Date(),
      });

      // Create child documents
      for (const child of validChildren) {
        const childId = `child_${Date.now()}_${child.id}`;
        await setDoc(doc(db, 'children', childId), {
          name: child.name.trim(),
          dateOfBirth: new Date(child.dateOfBirth),
          familyId,
          daycareId: user.daycareId,
          createdAt: new Date(),
        });
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Family registration error:', err);
      setError('Failed to register family. Please try again.');
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
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Register Family & Children 👪
            </h1>
            <p className="text-gray-600">
              Add family information and at least one child
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Parent Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Parent Information (Optional)
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mother's Name"
                    name="motherName"
                    type="text"
                    value={familyData.motherName}
                    onChange={handleFamilyChange}
                    placeholder="Jane Doe"
                  />
                  <Input
                    label="Mother's Email"
                    name="motherEmail"
                    type="email"
                    value={familyData.motherEmail}
                    onChange={handleFamilyChange}
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Father's Name"
                    name="fatherName"
                    type="text"
                    value={familyData.fatherName}
                    onChange={handleFamilyChange}
                    placeholder="John Doe"
                  />
                  <Input
                    label="Father's Email"
                    name="fatherEmail"
                    type="email"
                    value={familyData.fatherEmail}
                    onChange={handleFamilyChange}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Children Information */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Children <span className="text-red-500">*</span>
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addChild}
                >
                  + Add Another Child
                </Button>
              </div>

              <div className="space-y-6">
                {children.map((child, index) => (
                  <div key={child.id} className="p-4 border-2 border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-700">
                        Child #{index + 1}
                      </h3>
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChild(child.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Child's Name"
                        type="text"
                        value={child.name}
                        onChange={(e) => handleChildChange(child.id, 'name', e.target.value)}
                        placeholder="Emma Smith"
                        required
                      />
                      <Input
                        label="Date of Birth"
                        type="date"
                        value={child.dateOfBirth}
                        onChange={(e) => handleChildChange(child.id, 'dateOfBirth', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/register/daycare')}
                className="flex-1"
              >
                ← Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                Complete Registration
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> At least one child with name and date of birth is required. You can add more families and children later from the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}