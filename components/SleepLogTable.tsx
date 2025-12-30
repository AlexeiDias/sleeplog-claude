//components/SleepLogTable.tsx
import React from 'react';
import { SleepLogEntry } from '@/types';

interface SleepLogTableProps {
  entries: SleepLogEntry[];
  sessionNumber?: number;
}

export default function SleepLogTable({ entries, sessionNumber }: SleepLogTableProps) {
  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function formatInterval(minutes?: number): string {
    if (!minutes) return '-';
    return `${minutes} min`;
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      {sessionNumber && (
        <h4 className="font-semibold text-gray-700 mb-2">
          Session {sessionNumber}
        </h4>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Time</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Action</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Position</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Breathing</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Mood</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Interval</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Staff</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 border-b text-gray-800">
                  {formatTime(entry.timestamp)}
                </td>
                <td className="px-3 py-2 border-b">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      entry.type === 'start'
                        ? 'bg-green-100 text-green-800'
                        : entry.type === 'check'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {entry.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 border-b text-gray-800">{entry.position}</td>
                <td className="px-3 py-2 border-b text-gray-800">{entry.breathing}</td>
                <td className="px-3 py-2 border-b text-gray-800">{entry.mood || '-'}</td>
                <td className="px-3 py-2 border-b text-gray-800">
                  {formatInterval(entry.intervalSinceLast)}
                </td>
                <td className="px-3 py-2 border-b text-gray-800 font-medium">
                  {entry.staffInitials}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}