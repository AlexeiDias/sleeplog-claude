//components/IncidentLogModal.tsx
'use client';

import { useState, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { IncidentType, INCIDENT_LOCATIONS, BODY_PARTS } from '@/types';

interface IncidentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  childId: string;
  childName: string;
  staffInitials: string;
  staffId: string;
  staffName?: string;
}

export default function IncidentLogModal({
  isOpen,
  onClose,
  onSuccess,
  childId,
  childName,
  staffInitials,
  staffId,
  staffName,
}: IncidentLogModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [incidentType, setIncidentType] = useState<IncidentType>('injury');
  const [description, setDescription] = useState('');
  const [incidentTime, setIncidentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [location, setLocation] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [firstAid, setFirstAid] = useState('');
  const [parentNotified, setParentNotified] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'phone' | 'in-person'>('phone');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const incidentTypeOptions = [
    { value: 'injury', label: '🤕 Injury (fall, bump, cut, etc.)' },
    { value: 'illness', label: '🤒 Illness (fever, vomiting, rash)' },
    { value: 'behavioral', label: '😤 Behavioral (biting, hitting, tantrum)' },
    { value: 'other', label: '📝 Other' },
  ];

  const locationOptions = INCIDENT_LOCATIONS.map(loc => ({ value: loc, label: loc }));
  const bodyPartOptions = [{ value: '', label: 'Select body part (optional)' }, ...BODY_PARTS.map(part => ({ value: part, label: part }))];

  function resetForm() {
    setIncidentType('injury');
    setDescription('');
    const now = new Date();
    setIncidentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setLocation('');
    setBodyPart('');
    setFirstAid('');
    setParentNotified(false);
    setNotificationMethod('phone');
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!description.trim()) {
        setError('Please describe what happened');
        setLoading(false);
        return;
      }

      if (!location) {
        setError('Please select where the incident occurred');
        setLoading(false);
        return;
      }

      // Parse incident time
      const now = new Date();
      const [hours, minutes] = incidentTime.split(':').map(Number);
      const incidentTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const entryId = `incident_${now.getTime()}`;

      // Upload photo if exists
      let photoUrl: string | undefined;
      if (photo) {
        const photoRef = ref(storage, `incidents/${childId}/${dateKey}/${entryId}`);
        await uploadBytes(photoRef, photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      // Build entry data
      const entryData: any = {
        childId,
        type: incidentType,
        description: description.trim(),
        timestamp: incidentTimestamp,
        location,
        parentNotified,
        staffInitials,
        staffId,
        staffName: staffName || '',
        createdAt: now,
      };

      if (bodyPart) {
        entryData.bodyPartAffected = bodyPart;
      }

      if (firstAid.trim()) {
        entryData.firstAidGiven = firstAid.trim();
      }

      if (photoUrl) {
        entryData.photoUrl = photoUrl;
      }

      if (parentNotified) {
        entryData.parentNotifiedAt = now;
        entryData.parentNotifiedMethod = notificationMethod;
      }

      // Save to Firestore
      const entryRef = doc(db, 'children', childId, 'incidentLogs', dateKey, 'entries', entryId);
      await setDoc(entryRef, entryData);

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error saving incident:', err);
      setError(err.message || 'Failed to save incident report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`⚠️ Log Incident - ${childName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Incident Type */}
        <Select
          label="Type of Incident"
          options={incidentTypeOptions}
          value={incidentType}
          onChange={(e) => setIncidentType(e.target.value as IncidentType)}
          required
        />

        {/* Time of Incident */}
        <Input
          label="Time of Incident"
          type="time"
          value={incidentTime}
          onChange={(e) => setIncidentTime(e.target.value)}
          required
        />

        {/* Location */}
        <Select
          label="Where did it happen?"
          options={[{ value: '', label: 'Select location' }, ...locationOptions]}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        {/* Body Part (for injuries) */}
        {incidentType === 'injury' && (
          <Select
            label="Body Part Affected"
            options={bodyPartOptions}
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
          />
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What happened? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the incident in detail..."
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-gray-500">{description.length}/1000</p>
        </div>

        {/* First Aid Given */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Aid / Action Taken (Optional)
          </label>
          <textarea
            value={firstAid}
            onChange={(e) => setFirstAid(e.target.value)}
            placeholder="Ice pack applied, cleaned wound, comforted child..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Photo Attachment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo (Optional)
          </label>
          {photoPreview ? (
            <div className="relative inline-block">
              <img 
                src={photoPreview} 
                alt="Incident photo" 
                className="w-32 h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                📷 Add Photo
              </button>
              <p className="mt-1 text-xs text-gray-500">Max 5MB, JPG/PNG</p>
            </div>
          )}
        </div>

        {/* Parent Notification */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={parentNotified}
              onChange={(e) => setParentNotified(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-amber-800 font-medium">Parent has been notified</span>
          </label>
          
          {parentNotified && (
            <div className="mt-3 pl-8">
              <label className="block text-sm text-amber-700 mb-2">How were they notified?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationMethod"
                    value="phone"
                    checked={notificationMethod === 'phone'}
                    onChange={() => setNotificationMethod('phone')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800">📞 Phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationMethod"
                    value="in-person"
                    checked={notificationMethod === 'in-person'}
                    onChange={() => setNotificationMethod('in-person')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800">👤 In Person</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationMethod"
                    value="email"
                    checked={notificationMethod === 'email'}
                    onChange={() => setNotificationMethod('email')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800">📧 Email</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Staff Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
          <strong>Staff Witness:</strong> {staffName || staffInitials} ({staffInitials})
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Saving...' : '⚠️ Save Incident Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
