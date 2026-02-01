//components/ActivityLogTable.tsx
'use client';

import { ActivityLogEntry } from '@/types';
import Button from './Button';

interface ActivityLogTableProps {
  entries: ActivityLogEntry[];
  onEdit: (entry: ActivityLogEntry) => void;
}

export default function ActivityLogTable({ entries, onEdit }: ActivityLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">🎨</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No activities logged today</h3>
        <p className="text-gray-600 text-sm">
          Use the button above to log activities
        </p>
      </div>
    );
  }

  // Group entries by category
  const entriesByCategory: { [key: string]: ActivityLogEntry[] } = {};
  entries.forEach(entry => {
    if (!entriesByCategory[entry.category]) {
      entriesByCategory[entry.category] = [];
    }
    entriesByCategory[entry.category].push(entry);
  });

  // Calculate totals
  const totalActivities = entries.length;
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  // Get category color
  function getCategoryColor(category: string): string {
    if (category.includes('Games')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (category.includes('Learning')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (category.includes('Motor')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (category.includes('Arts')) return 'bg-pink-100 text-pink-800 border-pink-200';
    if (category.includes('STEM')) return 'bg-green-100 text-green-800 border-green-200';
    if (category.includes('Life')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (category.includes('Outdoor')) return 'bg-teal-100 text-teal-800 border-teal-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📊 Today's Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalActivities}</div>
            <div className="text-xs text-gray-600">Activities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">
              {totalDuration > 0 ? formatDuration(totalDuration) : '-'}
            </div>
            <div className="text-xs text-gray-600">Total Time</div>
          </div>
        </div>
      </div>

      {/* Activities by Category */}
      {Object.entries(entriesByCategory).map(([category, categoryEntries]) => (
        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className={`px-4 py-2 font-semibold text-sm ${getCategoryColor(category)}`}>
            {category} ({categoryEntries.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Activity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Staff</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      {entry.activityName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {entry.duration ? `${entry.duration}m` : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">
                      {entry.notes || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-semibold text-gray-700">{entry.staffInitials}</span>
                      {entry.lastEditedAt && (
                        <span className="block text-xs text-gray-400">
                          Edited by {entry.lastEditedByInitials}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Button
                        variant="secondary"
                        onClick={() => onEdit(entry)}
                        className="text-xs px-2 py-1"
                      >
                        ✏️ Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
