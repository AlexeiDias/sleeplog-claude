// components/DatePicker.tsx
import React from 'react';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  label?: string;
}

export default function DatePicker({ selectedDate, onDateChange, label = 'Select Date' }: DatePickerProps) {
  const today = new Date().toISOString().split('T')[0];

  function handlePreviousDay() {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    onDateChange(date.toISOString().split('T')[0]);
  }

  function handleNextDay() {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const nextDay = date.toISOString().split('T')[0];
    
    // Don't allow future dates
    if (nextDay <= today) {
      onDateChange(nextDay);
    }
  }

  function handleToday() {
    onDateChange(today);
  }

  const isToday = selectedDate === today;
  const canGoNext = selectedDate < today;

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">{label}:</label>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handlePreviousDay}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
        >
          ← Previous
        </button>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          max={today}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <button
          onClick={handleNextDay}
          disabled={!canGoNext}
          className={`px-3 py-2 rounded transition ${
            canGoNext
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next →
        </button>

        {!isToday && (
          <button
            onClick={handleToday}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Today
          </button>
        )}
      </div>

      <span className="text-sm text-gray-600">
        {new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </span>
    </div>
  );
}