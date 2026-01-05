// app/sign-in/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child, Family, SignInOutRecord, SignInOutType, ParentRelationship } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import SignatureCanvas from '@/components/SignatureCanvas';

interface QuickSignInOption {
  name: string;
  relationship: ParentRelationship;
}

export default function SignInPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [actionType, setActionType] = useState<SignInOutType>('sign-in');
  
  // Quick sign-in options
  const [quickOptions, setQuickOptions] = useState<QuickSignInOption[]>([]);
  const [showQuickSelect, setShowQuickSelect] = useState(true);
  const [selectedQuickOption, setSelectedQuickOption] = useState<QuickSignInOption | null>(null);
  
  // Signature
  const [signature, setSignature] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  // Manual entry fields
  const [parentName, setParentName] = useState('');
  const [relationship, setRelationship] = useState<ParentRelationship>('Authorized Person');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSignInOut, setLastSignInOut] = useState<{ [childId: string]: SignInOutType }>({});
  const [daycareId, setDaycareId] = useState<string | null>(null);

  useEffect(() => {
    const savedDaycareId = localStorage.getItem('kioskDaycareId');
    if (!savedDaycareId) {
      window.location.href = '/kiosk-setup';
      return;
    }
    setDaycareId(savedDaycareId);
  }, []);

  useEffect(() => {
    if (daycareId) {
      loadChildren();
      loadLastSignInOutStatus();
    }
  }, [daycareId]);

  async function loadChildren() {
    if (!daycareId) return;
    
    try {
      const q = query(
        collection(db, 'children'),
        where('daycareId', '==', daycareId)
      );
      const snapshot = await getDocs(q);
      const childrenData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Child[];

      setChildren(childrenData);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLastSignInOutStatus() {
    if (!daycareId) return;
    
    try {
      const statusMap: { [childId: string]: SignInOutType } = {};
      
      const q = query(
        collection(db, 'signInOut'),
        where('daycareId', '==', daycareId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!statusMap[data.childId]) {
          statusMap[data.childId] = data.type as SignInOutType;
        }
      });
      
      setLastSignInOut(statusMap);
    } catch (error) {
      console.error('Error loading sign-in/out status:', error);
    }
  }

  async function handleChildSelect(child: Child) {
    setSelectedChild(child);
    
    // Auto-detect sign-in or sign-out
    const lastAction = lastSignInOut[child.id];
    if (lastAction === 'sign-in') {
      setActionType('sign-out');
    } else {
      setActionType('sign-in');
    }
    
    // Load family data to get parent names
    try {
      const familyDoc = await getDoc(doc(db, 'families', child.familyId));
      if (familyDoc.exists()) {
        const familyData = { id: familyDoc.id, ...familyDoc.data() } as Family;
        setSelectedFamily(familyData);
        
        // Build quick sign-in options
        const options: QuickSignInOption[] = [];
        
        if (familyData.motherName) {
          options.push({ name: familyData.motherName, relationship: 'Mother' });
        }
        if (familyData.fatherName) {
          options.push({ name: familyData.fatherName, relationship: 'Father' });
        }
        if (familyData.guardianName) {
          options.push({ name: familyData.guardianName, relationship: 'Guardian' });
        }
        
        setQuickOptions(options);
        setShowQuickSelect(true);
      }
    } catch (error) {
      console.error('Error loading family:', error);
    }
    
    // Reset form
    setParentName('');
    setIdNumber('');
    setRelationship('Authorized Person');
    setNotes('');
    setSignature('');
    setShowSignaturePad(false);
    setSelectedQuickOption(null);
  }

  function handleQuickSignIn(option: QuickSignInOption) {
    // Store the selected option and show signature pad
    setSelectedQuickOption(option);
    setParentName(option.name);
    setRelationship(option.relationship);
    setShowSignaturePad(true);
    setShowQuickSelect(false);
  }

  function handleOtherPerson() {
    setShowQuickSelect(false);
    setShowSignaturePad(false);
  }

  function handleBack() {
    if (showSignaturePad) {
      // Go back to quick select if we're on signature pad
      setShowSignaturePad(false);
      setShowQuickSelect(true);
      setSelectedQuickOption(null);
      setSignature('');
      setParentName('');
      setIdNumber('');
      setRelationship('Authorized Person');
      setNotes('');
    } else if (!showQuickSelect) {
      // Go back to quick select screen from manual entry
      setShowQuickSelect(true);
      setParentName('');
      setIdNumber('');
      setRelationship('Authorized Person');
      setNotes('');
      setSignature('');
    } else {
      // Go back to children list
      setSelectedChild(null);
      setSelectedFamily(null);
      setQuickOptions([]);
      setSelectedQuickOption(null);
      setParentName('');
      setIdNumber('');
      setRelationship('Authorized Person');
      setNotes('');
      setSignature('');
      setShowQuickSelect(true);
      setShowSignaturePad(false);
    }
  }

  async function handleSubmit(e: React.FormEvent | null) {
    if (e) e.preventDefault();
    if (!selectedChild || !parentName.trim() || !signature) {
      alert('Please provide your name and signature');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      
      const signInOutData: any = {
        childId: selectedChild.id,
        childName: selectedChild.name,
        daycareId: daycareId!,
        type: actionType,
        timestamp: now,
        parentFullName: parentName.trim(),
        relationship: relationship,
        signature: signature, // Base64 signature image
        createdAt: now,
      };

      // Add ID number if provided (for non-quick sign-ins)
      if (idNumber.trim()) {
        signInOutData.idNumber = idNumber.trim();
      }

      // Add notes if provided
      if (notes.trim()) {
        signInOutData.notes = notes.trim();
      }

      await addDoc(collection(db, 'signInOut'), signInOutData);

      setLastSignInOut(prev => ({
        ...prev,
        [selectedChild.id]: actionType
      }));

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedChild(null);
        setSelectedFamily(null);
        setShowQuickSelect(true);
        setShowSignaturePad(false);
        setSelectedQuickOption(null);
        setSignature('');
        setParentName('');
        setIdNumber('');
        setNotes('');
      }, 2000);
    } catch (error) {
      console.error('Error saving sign-in/out:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function getChildStatus(childId: string): string {
    const status = lastSignInOut[childId];
    if (!status) return 'Not signed in today';
    return status === 'sign-in' ? '✅ Signed In' : '🏠 Signed Out';
  }

  function getChildStatusColor(childId: string): string {
    const status = lastSignInOut[childId];
    if (!status) return 'bg-gray-100 text-gray-600';
    return status === 'sign-in' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  }

  if (loading || !daycareId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="text-8xl mb-6">✅</div>
          <h2 className="text-4xl font-bold text-green-800 mb-2">Success!</h2>
          <p className="text-2xl text-gray-700">
            {selectedChild?.name} has been {actionType === 'sign-in' ? 'signed in' : 'signed out'}
          </p>
        </div>
      </div>
    );
  }

  // Children Selection Screen
  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Back to Dashboard Button - Staff Only */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              👋 Welcome to Our Daycare
            </h1>
            <p className="text-2xl text-gray-600">
              Please select your child to sign in or out
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 text-center transform hover:scale-105"
              >
                <div className="mb-4">
                  {child.photoUrl ? (
                    <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-blue-500">
                      <Image
                        src={child.photoUrl}
                        alt={child.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-6xl border-4 border-blue-500">
                      👶
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {child.name}
                </h3>

                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getChildStatusColor(child.id)}`}>
                  {getChildStatus(child.id)}
                </div>
              </button>
            ))}
          </div>

          {children.length === 0 && (
            <div className="text-center py-20">
              <div className="text-8xl mb-6">👶</div>
              <h3 className="text-3xl font-semibold text-gray-700 mb-4">
                No Children Registered
              </h3>
              <p className="text-xl text-gray-600">
                Please contact the administrator to add children.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quick Select Screen (Parent Buttons)
  if (showQuickSelect && quickOptions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 text-lg font-medium"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Children
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Child Info */}
            <div className="text-center mb-8 pb-8 border-b">
              {selectedChild.photoUrl ? (
                <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-blue-500 mb-4">
                  <Image
                    src={selectedChild.photoUrl}
                    alt={selectedChild.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-5xl border-4 border-blue-500 mb-4">
                  👶
                </div>
              )}
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedChild.name}</h2>
              <p className="text-xl text-gray-600">
                Select who is {actionType === 'sign-in' ? 'dropping off' : 'picking up'}
              </p>
            </div>

            {/* Action Type Toggle */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-3 text-center">
                Action
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActionType('sign-in')}
                  className={`py-4 px-6 rounded-xl text-xl font-bold transition-all ${
                    actionType === 'sign-in'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📥 Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('sign-out')}
                  className={`py-4 px-6 rounded-xl text-xl font-bold transition-all ${
                    actionType === 'sign-out'
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📤 Sign Out
                </button>
              </div>
            </div>

            {/* Quick Sign-In Buttons */}
            <div className="space-y-4">
              {quickOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSignIn(option)}
                  disabled={submitting}
                  className="w-full py-5 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {option.name} ({option.relationship})
                </button>
              ))}

              {/* Other Person Button */}
              <button
                onClick={handleOtherPerson}
                className="w-full py-5 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-lg font-semibold transition-all border-2 border-gray-300"
              >
                🔑 Other Guardian / Authorized Person
              </button>
            </div>

            {/* Current Time */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Current Time</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signature Pad Screen (After Quick Selection)
  if (showSignaturePad && selectedQuickOption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 text-lg font-medium"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Child Info */}
            <div className="text-center mb-6 pb-6 border-b">
              {selectedChild?.photoUrl ? (
                <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-blue-500 mb-3">
                  <Image
                    src={selectedChild.photoUrl}
                    alt={selectedChild.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-4xl border-4 border-blue-500 mb-3">
                  👶
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-800">{selectedChild?.name}</h2>
              <div className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-bold ${
                actionType === 'sign-in' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {actionType === 'sign-in' ? '📥 SIGN IN' : '📤 SIGN OUT'}
              </div>
            </div>

            {/* Parent Info */}
            <div className="mb-6 text-center bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Signing as:</p>
              <p className="text-xl font-bold text-gray-800">{selectedQuickOption.name}</p>
              <p className="text-sm text-gray-600">({selectedQuickOption.relationship})</p>
            </div>

            {/* Signature Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">
                📝 Please Sign to Confirm
              </h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                California law requires your signature for {actionType === 'sign-in' ? 'drop-off' : 'pick-up'}
              </p>
              
              <SignatureCanvas
                onSignatureComplete={setSignature}
                width={600}
                height={200}
              />
            </div>

            {/* Current Time */}
            <div className="mb-6 bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Time</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSubmit(null)}
              disabled={submitting || !signature}
              className={`w-full py-5 rounded-xl text-2xl font-bold transition-all ${
                submitting || !signature
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : actionType === 'sign-in'
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {submitting ? 'Processing...' : `Complete ${actionType === 'sign-in' ? 'Sign In' : 'Sign Out'}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Manual Entry Form (For Other Guardians)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 text-lg font-medium"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Child Info */}
          <div className="text-center mb-8 pb-8 border-b">
            {selectedChild.photoUrl ? (
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-blue-500 mb-4">
                <Image
                  src={selectedChild.photoUrl}
                  alt={selectedChild.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-5xl border-4 border-blue-500 mb-4">
                👶
              </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800">{selectedChild.name}</h2>
            <p className="text-lg text-gray-600 mt-2">Guardian / Authorized Person</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Type Toggle */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Action
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActionType('sign-in')}
                  className={`py-4 px-6 rounded-xl text-xl font-bold transition-all ${
                    actionType === 'sign-in'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📥 Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('sign-out')}
                  className={`py-4 px-6 rounded-xl text-xl font-bold transition-all ${
                    actionType === 'sign-out'
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📤 Sign Out
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Your Full Legal Name *
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full px-4 py-4 text-xl text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                ID Number *
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Driver's License or State ID"
                required
                className="w-full px-4 py-4 text-xl text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">For security verification</p>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Relationship to Child *
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as ParentRelationship)}
                className="w-full px-4 py-4 text-xl text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Guardian">Guardian</option>
                <option value="Authorized Person">Authorized Person</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
                className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <p className="mt-1 text-sm text-gray-500">{notes.length}/200 characters</p>
            </div>

            {/* Signature Section */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Signature * (Required by California Law)
              </label>
              <SignatureCanvas
                onSignatureComplete={setSignature}
                width={600}
                height={200}
              />
            </div>

            {/* Time Display */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Current Time</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !parentName.trim() || !idNumber.trim() || !signature}
              className={`w-full py-5 rounded-xl text-2xl font-bold transition-all ${
                submitting || !parentName.trim() || !idNumber.trim() || !signature
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : actionType === 'sign-in'
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {submitting ? 'Processing...' : `Complete ${actionType === 'sign-in' ? 'Sign In' : 'Sign Out'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
