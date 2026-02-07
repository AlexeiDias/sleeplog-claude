//components/SleepActionModal.tsx
import React, { useState, FormEvent } from 'react';
import Modal from './Modal';
import Select from './Select';
import Button from './Button';
import { SleepPosition, BreathingCondition, Mood, SleepAction } from '@/types';

interface SleepActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SleepActionData) => void;
  action: SleepAction;
  childName: string;
}

export interface SleepActionData {
  position: SleepPosition;
  breathing: BreathingCondition;
  mood?: Mood;
  notes?: string;
}

const positionOptionsStart = [
  { value: 'Back', label: 'Back' },
  { value: 'Side', label: 'Side' },
  { value: 'Tummy', label: 'Tummy' },
];

const positionOptionsStop = [
  { value: 'Back', label: 'Back' },
  { value: 'Side', label: 'Side' },
  { value: 'Tummy', label: 'Tummy' },
  { value: 'Seating', label: 'Seating' },
  { value: 'Standing', label: 'Standing' },
];

const breathingOptions = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Labored', label: 'Labored' },
  { value: 'Congested', label: 'Congested' },
];

const moodOptions = [
  { value: 'Happy', label: 'Happy' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Fussy', label: 'Fussy' },
  { value: 'Upset', label: 'Upset' },
  { value: 'Crying', label: 'Crying' },
];

export default function SleepActionModal({
  isOpen,
  onClose,
  onSubmit,
  action,
  childName,
}: SleepActionModalProps) {
  const [position, setPosition] = useState<string>('');
  const [breathing, setBreathing] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState('');

  const titles = {
    start: `Start Sleep - ${childName}`,
    check: `Check Sleep - ${childName}`,
    stop: `Stop Sleep - ${childName}`,
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!position || !breathing) {
      setError('Please select position and breathing condition');
      return;
    }

    if (action === 'stop' && !mood) {
      setError('Please select mood');
      return;
    }

    const data: SleepActionData = {
      position: position as SleepPosition,
      breathing: breathing as BreathingCondition,
    };

    if (action === 'stop' && mood) {
      data.mood = mood as Mood;
    }

    // Add notes if provided
    if (notes.trim()) {
      data.notes = notes.trim();
    }

    onSubmit(data);
    
    // Reset form
    setPosition('');
    setBreathing('');
    setMood('');
    setNotes('');
    setError('');
  }

  function handleClose() {
    setPosition('');
    setBreathing('');
    setMood('');
    setNotes('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titles[action]}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Select
          label="Sleep Position"
          options={action === 'stop' ? positionOptionsStop : positionOptionsStart}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
        />

        <Select
          label="Breathing Condition"
          options={breathingOptions}
          value={breathing}
          onChange={(e) => setBreathing(e.target.value)}
          required
        />

        {action === 'stop' && (
          <Select
            label="Mood"
            options={moodOptions}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            required
          />
        )}

        {/* Notes Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any observations or comments..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">
            {notes.length}/500 characters
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}
