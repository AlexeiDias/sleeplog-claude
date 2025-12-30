//components/Select.tsx
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export default function Select({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="mb-4">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-gray-900 mb-1"
      >
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        <option value="" className="text-gray-500">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}