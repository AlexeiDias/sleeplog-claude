//components/CareLogModal.tsx
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { CareLogType, DiaperType } from '@/types';

interface CareLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  logType: CareLogType;
  childId: string;
  childName: string;
  staffInitials: string;
  staffId: string;
}

export default function CareLogModal({
  isOpen,
  onClose,
  onSuccess,
  logType,
  childId,
  childName,
  staffInitials,
  staffId,
}: CareLogModalProps) {
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

  const titles = {
    diaper: `🧷 Log Diaper Change - ${childName}`,
    meal: `🍽️ Log Meal - ${childName}`,
    bottle: `🍼 Log Bottle - ${childName}`,
  };

  const diaperOptions = [
    { value: 'wet', label: 'Wet' },
    { value: 'solid', label: 'Solid' },
    { value: 'both', label: 'Both' },
  ];

  function resetForm() {
    setDiaperType('wet');
    setDiaperComments('');
    setMealAmount('');
    setIngredients('');
    setMealComments('');
    setBottleAmount('');
    setBottleComments('');
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (logType === 'meal' && !ingredients.trim()) {
        setError('Ingredients are required for meals');
        setLoading(false);
        return;
      }

      if (logType === 'bottle' && (!bottleAmount || parseFloat(bottleAmount) <= 0)) {
        setError('Bottle amount is required and must be greater than 0');
        setLoading(false);
        return;
      }

      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const entryId = `care_${now.getTime()}`;

      // Base entry data
      const baseEntry = {
        childId,
        type: logType,
        timestamp: now,
        staffInitials,
        staffId,
        createdAt: now,
      };

      // Type-specific data
      let entryData: any = { ...baseEntry };

      if (logType === 'diaper') {
        entryData.diaperType = diaperType;
        if (diaperComments.trim()) {
          entryData.comments = diaperComments.trim();
        }
      } else if (logType === 'meal') {
        entryData.ingredients = ingredients.trim();
        if (mealAmount && parseFloat(mealAmount) > 0) {
          entryData.amount = parseFloat(mealAmount);
        }
        if (mealComments.trim()) {
          entryData.comments = mealComments.trim();
        }
      } else if (logType === 'bottle') {
        entryData.amount = parseFloat(bottleAmount);
        if (bottleComments.trim()) {
          entryData.comments = bottleComments.trim();
        }
      }

      // Save to Firestore
      const entryRef = doc(db, 'children', childId, 'careLogs', dateKey, 'entries', entryId);
      await setDoc(entryRef, entryData);

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error saving care log:', err);
      setError(err.message || 'Failed to save care log');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titles[logType]}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* DIAPER FORM */}
        {logType === 'diaper' && (
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
        {logType === 'meal' && (
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
        {logType === 'bottle' && (
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

        {/* Info about time */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded text-sm">
          <strong>📅 Time:</strong> Will be logged as {new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
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
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
