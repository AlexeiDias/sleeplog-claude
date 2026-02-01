//components/ActivityCategoryManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityCategory, DEFAULT_ACTIVITY_CATEGORIES } from '@/types';
import Button from './Button';

interface ActivityCategoryManagerProps {
  daycareId: string;
}

export default function ActivityCategoryManager({ daycareId }: ActivityCategoryManagerProps) {
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New category form
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📌');

  // New activity form
  const [addingActivityTo, setAddingActivityTo] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState('');

  // Edit category
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Common emojis for categories
  const emojiOptions = ['📌', '🎯', '⭐', '🌟', '💪', '🏃', '👶', '🧒', '📖', '✏️', '🎵', '🎭', '🌈', '🌻', '🦋', '🐣', '🧩', '🎪', '🏆', '❤️'];

  useEffect(() => {
    loadCategories();
  }, [daycareId]);

  async function loadCategories() {
    try {
      const settingsDoc = await getDoc(doc(db, 'daycares', daycareId, 'activitySettings', 'config'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        } else {
          setCategories(DEFAULT_ACTIVITY_CATEGORIES);
        }
      } else {
        // Initialize with defaults
        setCategories(DEFAULT_ACTIVITY_CATEGORIES);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories(DEFAULT_ACTIVITY_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }

  async function saveCategories(updatedCategories: ActivityCategory[]) {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setDoc(
        doc(db, 'daycares', daycareId, 'activitySettings', 'config'),
        { categories: updatedCategories, enabled: true }
      );
      setCategories(updatedCategories);
      setSuccess('Changes saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving categories:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newCategory: ActivityCategory = {
      id: categoryId,
      name: `${newCategoryEmoji} ${newCategoryName.trim()}`,
      activities: [],
    };

    const updatedCategories = [...categories, newCategory];
    saveCategories(updatedCategories);

    setNewCategoryName('');
    setNewCategoryEmoji('📌');
    setShowNewCategoryForm(false);
  }

  function handleDeleteCategory(categoryId: string) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?\n\nThis will NOT delete existing activity logs, but you won't be able to add new activities to this category.`
    );
    if (!confirmed) return;

    const updatedCategories = categories.filter(c => c.id !== categoryId);
    saveCategories(updatedCategories);
  }

  function handleUpdateCategoryName(categoryId: string) {
    if (!editCategoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, name: editCategoryName.trim() };
      }
      return cat;
    });

    saveCategories(updatedCategories);
    setEditingCategory(null);
    setEditCategoryName('');
  }

  function handleAddActivity(categoryId: string) {
    if (!newActivityName.trim()) {
      setError('Please enter an activity name');
      return;
    }

    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        if (cat.activities.includes(newActivityName.trim())) {
          setError('This activity already exists in this category');
          return cat;
        }
        return {
          ...cat,
          activities: [...cat.activities, newActivityName.trim()],
        };
      }
      return cat;
    });

    saveCategories(updatedCategories);
    setNewActivityName('');
    setAddingActivityTo(null);
  }

  function handleDeleteActivity(categoryId: string, activityName: string) {
    const confirmed = window.confirm(`Delete "${activityName}" from this category?`);
    if (!confirmed) return;

    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          activities: cat.activities.filter(a => a !== activityName),
        };
      }
      return cat;
    });

    saveCategories(updatedCategories);
  }

  function handleResetToDefaults() {
    const confirmed = window.confirm(
      'Reset all categories to defaults?\n\nThis will remove any custom categories and activities you have added.'
    );
    if (!confirmed) return;

    saveCategories(DEFAULT_ACTIVITY_CATEGORIES);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">🎨 Activity Categories</h3>
          <p className="text-sm text-gray-600">Manage categories and activities for your daycare</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleResetToDefaults}
          className="text-xs"
        >
          Reset to Defaults
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Add New Category Button */}
      {!showNewCategoryForm ? (
        <Button
          variant="primary"
          onClick={() => setShowNewCategoryForm(true)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          + Add New Category
        </Button>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-3">New Category</h4>
          
          {/* Emoji Selection */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Icon</label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCategoryEmoji(emoji)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    newCategoryEmoji === emoji
                      ? 'border-purple-600 bg-purple-100'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Category Name */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Physical Development"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              maxLength={50}
            />
          </div>

          {/* Preview */}
          {newCategoryName && (
            <div className="mb-3 p-2 bg-white rounded border border-gray-200">
              <span className="text-sm text-gray-500">Preview: </span>
              <span className="font-medium">{newCategoryEmoji} {newCategoryName}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleAddCategory}
              isLoading={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Add Category
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewCategoryForm(false);
                setNewCategoryName('');
                setNewCategoryEmoji('📌');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
              {editingCategory === category.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    maxLength={50}
                  />
                  <button
                    onClick={() => handleUpdateCategoryName(category.id)}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setEditCategoryName('');
                    }}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-gray-800">{category.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category.id);
                        setEditCategoryName(category.name);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Activities List */}
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {category.activities.map((activity) => (
                  <span
                    key={activity}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm group"
                  >
                    {activity}
                    <button
                      onClick={() => handleDeleteActivity(category.id, activity)}
                      className="text-gray-400 hover:text-red-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete activity"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {category.activities.length === 0 && (
                  <span className="text-gray-400 text-sm italic">No activities yet</span>
                )}
              </div>

              {/* Add Activity */}
              {addingActivityTo === category.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="Activity name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 text-gray-900"
                    maxLength={50}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddActivity(category.id);
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => handleAddActivity(category.id)}
                    isLoading={saving}
                    className="text-sm bg-purple-600 hover:bg-purple-700"
                  >
                    Add
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAddingActivityTo(null);
                      setNewActivityName('');
                    }}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingActivityTo(category.id)}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  + Add activity
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Categories and activities are shared across all children in your daycare</li>
          <li>• You can add custom activities directly when logging (they'll be saved here)</li>
          <li>• Deleting a category won't delete existing activity logs</li>
          <li>• Examples: "👶 Physical Development" with activities like "Tummy Time", "Walking Practice", "Crawling"</li>
        </ul>
      </div>
    </div>
  );
}
