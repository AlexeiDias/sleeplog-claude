import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import ImageUpload from './ImageUpload';
import { Child } from '@/types';

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

  // This receives the URL from ImageUpload after it uploads
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
        photoUrl: photoUrl, // Can be empty string if photo was removed
      };

      await updateDoc(doc(db, 'children', child.id), updateData);

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

        {/* Photo Upload - ImageUpload handles the upload internally */}
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
          max={new Date().toISOString().split('T')[0]} // Can't be in the future
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
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
