// components/DatePicker.tsx
import React from 'react';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  label?: string;
}

// Helper function to get local date string (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to parse date string and create local date
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function DatePicker({ selectedDate, onDateChange, label = 'Select Date' }: DatePickerProps) {
  // FIXED: Use local timezone instead of UTC
  const today = getLocalDateString();

  function handlePreviousDay() {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() - 1);
    onDateChange(getLocalDateString(date));
  }

  function handleNextDay() {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() + 1);
    const nextDay = getLocalDateString(date);
    
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
        {parseLocalDate(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </span>
    </div>
  );
}
