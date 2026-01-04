import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { Family } from '@/types';

interface EditFamilyModalProps {
  family: Family;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFamilyModal({ family, isOpen, onClose, onSuccess }: EditFamilyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    motherName: family.motherName || '',
    motherEmail: family.motherEmail || '',
    fatherName: family.fatherName || '',
    fatherEmail: family.fatherEmail || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate: at least one parent must have a name
    if (!formData.motherName && !formData.fatherName) {
      setError('At least one parent name is required');
      setLoading(false);
      return;
    }

    // Validate: if email is provided, name must be provided
    if (formData.motherEmail && !formData.motherName) {
      setError("Mother's name is required when email is provided");
      setLoading(false);
      return;
    }
    if (formData.fatherEmail && !formData.fatherName) {
      setError("Father's name is required when email is provided");
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.motherEmail && !emailRegex.test(formData.motherEmail)) {
      setError("Invalid mother's email format");
      setLoading(false);
      return;
    }
    if (formData.fatherEmail && !emailRegex.test(formData.fatherEmail)) {
      setError("Invalid father's email format");
      setLoading(false);
      return;
    }

    try {
      // Update family document in Firestore
      await updateDoc(doc(db, 'families', family.id), {
        motherName: formData.motherName || null,
        motherEmail: formData.motherEmail || null,
        fatherName: formData.fatherName || null,
        fatherEmail: formData.fatherEmail || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating family:', err);
      setError(err.message || 'Failed to update family information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Family Information">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Mother Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Mother's Information</h3>
          
          <Input
            label="Mother's Name"
            type="text"
            value={formData.motherName}
            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
            placeholder="Enter mother's name"
            disabled={loading}
          />

          <Input
            label="Mother's Email"
            type="email"
            value={formData.motherEmail}
            onChange={(e) => setFormData({ ...formData, motherEmail: e.target.value })}
            placeholder="mother@example.com"
            disabled={loading}
          />
        </div>

        {/* Father Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Father's Information</h3>
          
          <Input
            label="Father's Name"
            type="text"
            value={formData.fatherName}
            onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
            placeholder="Enter father's name"
            disabled={loading}
          />

          <Input
            label="Father's Email"
            type="email"
            value={formData.fatherEmail}
            onChange={(e) => setFormData({ ...formData, fatherEmail: e.target.value })}
            placeholder="father@example.com"
            disabled={loading}
          />
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
          <p className="font-medium">Note:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>At least one parent name is required</li>
            <li>Email reports will be sent to provided email addresses</li>
            <li>You can leave email fields blank if not needed</li>
          </ul>
        </div>

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
