//components/EditCareLogModal.tsx
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { CareLogEntry, DiaperEntry, MealEntry, BottleEntry, DiaperType } from '@/types';

interface EditCareLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: CareLogEntry;
  childId: string;
  childName: string;
  staffInitials: string;
  staffId: string;
}

export default function EditCareLogModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
  childId,
  childName,
  staffInitials,
  staffId,
}: EditCareLogModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Diaper fields
  const [diaperType, setDiaperType] = useState<DiaperType>('wet');
  const [diaperComments, setDiaperComments] = useState('');

  // Meal fields
  const [mealAmount, setMealAmount] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [mealComments, setMealComments] = useState('');

  // Bottle fields
  const [bottleAmount, setBottleAmount] = useState('');
  const [bottleComments, setBottleComments] = useState('');

  // Load entry data when modal opens
  useEffect(() => {
    if (isOpen && entry) {
      if (entry.type === 'diaper') {
        const dEntry = entry as DiaperEntry;
        setDiaperType(dEntry.diaperType);
        setDiaperComments(dEntry.comments || '');
      } else if (entry.type === 'meal') {
        const mEntry = entry as MealEntry;
        setMealAmount(mEntry.amount ? String(mEntry.amount) : '');
        setIngredients(mEntry.ingredients);
        setMealComments(mEntry.comments || '');
      } else if (entry.type === 'bottle') {
        const bEntry = entry as BottleEntry;
        setBottleAmount(String(bEntry.amount));
        setBottleComments(bEntry.comments || '');
      }
    }
  }, [isOpen, entry]);

  const titles = {
    diaper: `✏️ Edit Diaper Change - ${childName}`,
    meal: `✏️ Edit Meal - ${childName}`,
    bottle: `✏️ Edit Bottle - ${childName}`,
  };

  const diaperOptions = [
    { value: 'wet', label: 'Wet' },
    { value: 'solid', label: 'Solid' },
    { value: 'both', label: 'Both' },
  ];

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleClose() {
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (entry.type === 'meal' && !ingredients.trim()) {
        setError('Ingredients are required for meals');
        setLoading(false);
        return;
      }

      if (entry.type === 'bottle' && (!bottleAmount || parseFloat(bottleAmount) <= 0)) {
        setError('Bottle amount is required and must be greater than 0');
        setLoading(false);
        return;
      }

      const now = new Date();
      const timestamp = new Date(entry.timestamp);
      const dateKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;

      // Build update data
      const updateData: any = {
        lastEditedAt: now,
        lastEditedBy: staffId,
        lastEditedByInitials: staffInitials,
      };

      if (entry.type === 'diaper') {
        updateData.diaperType = diaperType;
        updateData.comments = diaperComments.trim() || null;
      } else if (entry.type === 'meal') {
        updateData.ingredients = ingredients.trim();
        updateData.amount = mealAmount && parseFloat(mealAmount) > 0 ? parseFloat(mealAmount) : null;
        updateData.comments = mealComments.trim() || null;
      } else if (entry.type === 'bottle') {
        updateData.amount = parseFloat(bottleAmount);
        updateData.comments = bottleComments.trim() || null;
      }

      // Update in Firestore
      const entryRef = doc(db, 'children', childId, 'careLogs', dateKey, 'entries', entry.id);
      await updateDoc(entryRef, updateData);

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error updating care log:', err);
      setError(err.message || 'Failed to update care log');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const timestamp = new Date(entry.timestamp);
      const dateKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;

      const entryRef = doc(db, 'children', childId, 'careLogs', dateKey, 'entries', entry.id);
      
      // We'll use updateDoc to mark as deleted rather than actually deleting
      // This keeps audit trail
      await updateDoc(entryRef, {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: staffId,
        deletedByInitials: staffInitials,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error deleting care log:', err);
      setError(err.message || 'Failed to delete care log');
    } finally {
      setLoading(false);
    }
  }

  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titles[entry.type]}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Original entry info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-700 mb-1">Original Entry:</div>
          <div className="text-gray-600">
            <strong>Time:</strong> {formatTime(entry.timestamp)}
            <br />
            <strong>Logged by:</strong> {entry.staffInitials}
            {entry.lastEditedAt && entry.lastEditedByInitials && (
              <>
                <br />
                <strong>Last edited:</strong> {formatTime(entry.lastEditedAt)} by {entry.lastEditedByInitials}
              </>
            )}
          </div>
        </div>

        {/* DIAPER FORM */}
        {entry.type === 'diaper' && (
          <>
            <Select
              label="Type"
              options={diaperOptions}
              value={diaperType}
              onChange={(e) => setDiaperType(e.target.value as DiaperType)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={diaperComments}
                onChange={(e) => setDiaperComments(e.target.value)}
                placeholder="Any observations..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">{diaperComments.length}/200</p>
            </div>
          </>
        )}

        {/* MEAL FORM */}
        {entry.type === 'meal' && (
          <>
            <Input
              label="Amount (Optional)"
              type="number"
              value={mealAmount}
              onChange={(e) => setMealAmount(e.target.value)}
              placeholder="4"
              step="0.1"
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 -mt-2">Weight in ounces (oz)</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredients <span className="text-red-500">*</span>
              </label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Oatmeal, banana, milk..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={300}
              />
              <p className="mt-1 text-xs text-gray-500">{ingredients.length}/300</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={mealComments}
                onChange={(e) => setMealComments(e.target.value)}
                placeholder="Ate everything, loved the bananas..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">{mealComments.length}/200</p>
            </div>
          </>
        )}

        {/* BOTTLE FORM */}
        {entry.type === 'bottle' && (
          <>
            <Input
              label="Amount (oz)"
              type="number"
              value={bottleAmount}
              onChange={(e) => setBottleAmount(e.target.value)}
              placeholder="6"
              step="0.5"
              min="0.5"
              required
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={bottleComments}
                onChange={(e) => setBottleComments(e.target.value)}
                placeholder="Finished entire bottle..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">{bottleComments.length}/200</p>
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
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
