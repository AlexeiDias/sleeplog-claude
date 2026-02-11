//components/EditIncidentLogModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { IncidentLogEntry, IncidentType, INCIDENT_LOCATIONS, BODY_PARTS } from '@/types';

interface EditIncidentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: IncidentLogEntry | null;
  childId: string;
  childName: string;
  staffInitials: string;
  staffId: string;
}

export default function EditIncidentLogModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
  childId,
  childName,
  staffInitials,
  staffId,
}: EditIncidentLogModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [incidentType, setIncidentType] = useState<IncidentType>('injury');
  const [description, setDescription] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [location, setLocation] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [firstAid, setFirstAid] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when entry changes
  useEffect(() => {
    if (entry) {
      setIncidentType(entry.type);
      setDescription(entry.description);
      const time = entry.timestamp;
      setIncidentTime(`${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`);
      setLocation(entry.location);
      setBodyPart(entry.bodyPartAffected || '');
      setFirstAid(entry.firstAidGiven || '');
      setExistingPhotoUrl(entry.photoUrl || null);
      setPhotoPreview(entry.photoUrl || null);
    }
  }, [entry]);

  const incidentTypeOptions = [
    { value: 'injury', label: '🤕 Injury (fall, bump, cut, etc.)' },
    { value: 'illness', label: '🤒 Illness (fever, vomiting, rash)' },
    { value: 'behavioral', label: '😤 Behavioral (biting, hitting, tantrum)' },
    { value: 'other', label: '📝 Other' },
  ];

  const locationOptions = INCIDENT_LOCATIONS.map(loc => ({ value: loc, label: loc }));
  const bodyPartOptions = [{ value: '', label: 'Select body part (optional)' }, ...BODY_PARTS.map(part => ({ value: part, label: part }))];

  function handleClose() {
    setError('');
    setPhoto(null);
    onClose();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
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
    setExistingPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    
    setLoading(true);
    setError('');

    try {
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

      const now = new Date();
      const timestamp = entry.timestamp;
      const [hours, minutes] = incidentTime.split(':').map(Number);
      const newTimestamp = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), hours, minutes);

      const dateKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;

      // Upload new photo if exists
      let photoUrl = existingPhotoUrl;
      if (photo) {
        const photoRef = ref(storage, `incidents/${childId}/${dateKey}/${entry.id}_edited`);
        await uploadBytes(photoRef, photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      // Build update data
      const updateData: any = {
        type: incidentType,
        description: description.trim(),
        timestamp: newTimestamp,
        location,
        lastEditedAt: now,
        lastEditedBy: staffId,
        lastEditedByInitials: staffInitials,
      };

      if (bodyPart) {
        updateData.bodyPartAffected = bodyPart;
      }

      if (firstAid.trim()) {
        updateData.firstAidGiven = firstAid.trim();
      }

      if (photoUrl) {
        updateData.photoUrl = photoUrl;
      }

      const entryRef = doc(db, 'children', childId, 'incidentLogs', dateKey, 'entries', entry.id);
      await updateDoc(entryRef, updateData);

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error updating incident:', err);
      setError(err.message || 'Failed to update incident report');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this incident report? This cannot be undone.');
    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      const timestamp = entry.timestamp;
      const dateKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;

      const entryRef = doc(db, 'children', childId, 'incidentLogs', dateKey, 'entries', entry.id);
      await deleteDoc(entryRef);

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error deleting incident:', err);
      setError(err.message || 'Failed to delete incident report');
    } finally {
      setLoading(false);
    }
  }

  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`✏️ Edit Incident - ${childName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Original Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
          <p><strong>Originally logged by:</strong> {entry.staffName || entry.staffInitials}</p>
          {entry.lastEditedAt && (
            <p><strong>Last edited by:</strong> {entry.lastEditedByInitials}</p>
          )}
        </div>

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

        {/* Photo */}
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
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            🗑️ Delete
          </Button>
          <div className="flex gap-3">
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
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
