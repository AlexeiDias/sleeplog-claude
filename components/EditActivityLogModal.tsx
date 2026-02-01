//components/EditActivityLogModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityLogEntry, ActivityCategory, DEFAULT_ACTIVITY_CATEGORIES } from '@/types';
import Button from './Button';

interface EditActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: ActivityLogEntry;
  childId: string;
  childName: string;
  daycareId: string;
  staffInitials: string;
  staffId: string;
}

export default function EditActivityLogModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
  childId,
  childName,
  daycareId,
  staffInitials,
  staffId,
}: EditActivityLogModalProps) {
  const [categories, setCategories] = useState<ActivityCategory[]>(DEFAULT_ACTIVITY_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(entry.category);
  const [selectedActivity, setSelectedActivity] = useState<string>(entry.activityName);
  const [customActivity, setCustomActivity] = useState<string>('');
  const [duration, setDuration] = useState<string>(entry.duration?.toString() || '');
  const [notes, setNotes] = useState<string>(entry.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomActivity, setShowCustomActivity] = useState(false);

  // Load daycare's custom categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const settingsDoc = await getDoc(doc(db, 'daycares', daycareId, 'activitySettings', 'config'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error loading activity categories:', error);
      }
    }

    if (isOpen && daycareId) {
      loadCategories();
    }
  }, [isOpen, daycareId]);

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setSelectedCategory(entry.category);
      setSelectedActivity(entry.activityName);
      setDuration(entry.duration?.toString() || '');
      setNotes(entry.notes || '');
      setShowCustomActivity(false);
      setCustomActivity('');
    }
  }, [entry]);

  // Get activities for selected category
  const currentCategory = categories.find(c => c.name === selectedCategory);
  const availableActivities = currentCategory?.activities || [];

  // Check if current activity is in the list
  const isCustomActivity = selectedActivity && !availableActivities.includes(selectedActivity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    const activityName = showCustomActivity ? customActivity.trim() : selectedActivity;
    if (!activityName) {
      setError('Please select or enter an activity name');
      return;
    }

    setLoading(true);

    try {
      // Get the date from the entry timestamp
      const entryDate = new Date(entry.timestamp);
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const updateData = {
        category: selectedCategory,
        activityName,
        duration: duration ? parseInt(duration) : null,
        notes: notes.trim() || null,
        lastEditedAt: new Date(),
        lastEditedBy: staffId,
        lastEditedByInitials: staffInitials,
      };

      await updateDoc(
        doc(db, 'children', childId, 'activityLogs', dateKey, 'entries', entry.id),
        updateData
      );

      // If custom activity was added, save it to the category
      if (showCustomActivity && customActivity.trim() && currentCategory) {
        const updatedCategories = categories.map(cat => {
          if (cat.name === selectedCategory && !cat.activities.includes(customActivity.trim())) {
            return {
              ...cat,
              activities: [...cat.activities, customActivity.trim()],
            };
          }
          return cat;
        });

        await updateDoc(
          doc(db, 'daycares', daycareId, 'activitySettings', 'config'),
          { categories: updatedCategories }
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating activity:', err);
      setError('Failed to update activity');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm('Are you sure you want to delete this activity?');
    if (!confirmed) return;

    setLoading(true);

    try {
      const entryDate = new Date(entry.timestamp);
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Soft delete
      await updateDoc(
        doc(db, 'children', childId, 'activityLogs', dateKey, 'entries', entry.id),
        {
          deleted: true,
          lastEditedAt: new Date(),
          lastEditedBy: staffId,
          lastEditedByInitials: staffInitials,
        }
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              ✏️ Edit Activity - {childName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Original Entry Info */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
            <p className="text-gray-600">
              <strong>Logged:</strong> {new Date(entry.timestamp).toLocaleTimeString()} by {entry.staffInitials}
            </p>
            {entry.lastEditedAt && (
              <p className="text-gray-500 text-xs mt-1">
                Last edited by {entry.lastEditedByInitials} at {new Date(entry.lastEditedAt).toLocaleString()}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedActivity('');
                  setShowCustomActivity(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Selection */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity <span className="text-red-500">*</span>
                </label>
                
                {!showCustomActivity ? (
                  <>
                    <select
                      value={selectedActivity}
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="">Select an activity...</option>
                      {availableActivities.map((activity) => (
                        <option key={activity} value={activity}>
                          {activity}
                        </option>
                      ))}
                      {isCustomActivity && (
                        <option value={selectedActivity}>{selectedActivity} (custom)</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomActivity(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add custom activity
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customActivity}
                      onChange={(e) => setCustomActivity(e.target.value)}
                      placeholder="Enter custom activity name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomActivity(false);
                        setCustomActivity('');
                      }}
                      className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to predefined activities
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) <span className="text-gray-400 text-xs">optional</span>
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 30"
                min="1"
                max="480"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 text-xs">optional</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations or details..."
                rows={3}
                maxLength={300}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/300</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {/* Delete Button */}
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                className="w-full text-red-600 hover:bg-red-50"
              >
                🗑️ Delete Activity
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
