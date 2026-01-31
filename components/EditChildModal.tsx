//components/EditChildModal.tsx
import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import ImageUpload from './ImageUpload';
import { Child, CareLogSettings } from '@/types';

interface EditChildModalProps {
  child: Child;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditChildModal({ child, isOpen, onClose, onSuccess }: EditChildModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle both Date objects and Firestore Timestamps
  const getDateString = (date: any): string => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    } else if (date?.toDate) {
      return date.toDate().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    name: child.name,
    dateOfBirth: getDateString(child.dateOfBirth),
  });
  const [photoUrl, setPhotoUrl] = useState(child.photoUrl || '');

  // Care log settings state
  const [careLogSettings, setCareLogSettings] = useState<CareLogSettings>({
    enabled: false,
    trackDiapers: true,
    trackMeals: true,
    trackBottles: true,
    pottyTrained: false,
    noBottles: false,
  });

  // Load care log settings from Firestore
  useEffect(() => {
    if (isOpen) {
      loadCareLogSettings();
    }
  }, [isOpen, child.id]);

  async function loadCareLogSettings() {
    try {
      const settingsDoc = await getDoc(doc(db, 'children', child.id, 'settings', 'careLogs'));
      if (settingsDoc.exists()) {
        setCareLogSettings(settingsDoc.data() as CareLogSettings);
      } else {
        // Set smart defaults based on age
        const birthDate = new Date(child.dateOfBirth);
        const now = new Date();
        const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + 
                           (now.getMonth() - birthDate.getMonth());
        
        const defaults: CareLogSettings = {
          enabled: ageInMonths < 36, // Enable for kids under 3 years
          trackDiapers: ageInMonths < 36,
          trackMeals: true,
          trackBottles: ageInMonths < 18, // Bottles typically until 18 months
          pottyTrained: ageInMonths >= 30, // Usually potty trained around 2.5 years
          noBottles: ageInMonths >= 18,
        };
        
        setCareLogSettings(defaults);
      }
    } catch (err) {
      console.error('Error loading care log settings:', err);
    }
  }

  // Handle photo upload
  const handlePhotoUpload = (url: string) => {
    setPhotoUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Update child document in Firestore
      const updateData: any = {
        name: formData.name,
        dateOfBirth: new Date(formData.dateOfBirth),
        photoUrl: photoUrl,
      };

      await updateDoc(doc(db, 'children', child.id), updateData);

      // Save care log settings in separate document
      const settingsRef = doc(db, 'children', child.id, 'settings', 'careLogs');
      await setDoc(settingsRef, careLogSettings);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating child:', err);
      setError(err.message || 'Failed to update child information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Child Information">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Photo Upload */}
        <ImageUpload
          currentImageUrl={photoUrl}
          onImageUpload={handlePhotoUpload}
          childId={child.id}
          disabled={loading}
        />

        {/* Child Name */}
        <Input
          label="Child's Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter child's name"
          required
          disabled={loading}
        />

        {/* Date of Birth */}
        <Input
          label="Date of Birth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          required
          disabled={loading}
          max={new Date().toISOString().split('T')[0]}
        />

        {/* Care Log Settings Section */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🍼 Care Log Settings</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure which care activities to track for this child
          </p>

          {/* Enable Care Logs */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
              <input
                type="checkbox"
                checked={careLogSettings.enabled}
                onChange={(e) => setCareLogSettings({ ...careLogSettings, enabled: e.target.checked })}
                disabled={loading}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Enable Care Logs</div>
                <div className="text-xs text-gray-600">Track diaper changes, meals, and bottles</div>
              </div>
            </label>

            {/* Tracking Options (only show if enabled) */}
            {careLogSettings.enabled && (
              <div className="ml-8 space-y-2 pl-4 border-l-2 border-blue-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={careLogSettings.trackDiapers}
                    onChange={(e) => setCareLogSettings({ ...careLogSettings, trackDiapers: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Track Diapers</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={careLogSettings.trackMeals}
                    onChange={(e) => setCareLogSettings({ ...careLogSettings, trackMeals: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Track Meals</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={careLogSettings.trackBottles}
                    onChange={(e) => setCareLogSettings({ ...careLogSettings, trackBottles: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Track Bottles</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
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
      </form>
    </Modal>
  );
}
