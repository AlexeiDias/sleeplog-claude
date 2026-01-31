//components/CareLogTable.tsx
import { CareLogEntry, DiaperEntry, MealEntry, BottleEntry } from '@/types';
import Button from './Button';

interface CareLogTableProps {
  entries: CareLogEntry[];
  onEdit: (entry: CareLogEntry) => void;
}

export default function CareLogTable({ entries, onEdit }: CareLogTableProps) {
  // Group entries by type
  const diaperEntries = entries.filter(e => e.type === 'diaper') as DiaperEntry[];
  const mealEntries = entries.filter(e => e.type === 'meal') as MealEntry[];
  const bottleEntries = entries.filter(e => e.type === 'bottle') as BottleEntry[];

  // Calculate totals
  const totalBottleOz = bottleEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalMealOz = mealEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatEditInfo(entry: CareLogEntry): string {
    if (entry.lastEditedAt && entry.lastEditedByInitials) {
      const editTime = new Date(entry.lastEditedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Edited by ${entry.lastEditedByInitials} at ${editTime}`;
    }
    return '';
  }

  if (entries.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-gray-600 text-sm">No care logs for this date</p>
        <p className="text-gray-500 text-xs mt-1">Use the buttons above to log diapers, meals, or bottles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📊 Today's Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{diaperEntries.length}</div>
            <div className="text-xs text-gray-600">Diaper Changes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{mealEntries.length}</div>
            <div className="text-xs text-gray-600">Meals</div>
            {totalMealOz > 0 && (
              <div className="text-xs text-gray-500 mt-1">({totalMealOz}oz)</div>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{bottleEntries.length}</div>
            <div className="text-xs text-gray-600">Bottles</div>
            {totalBottleOz > 0 && (
              <div className="text-xs text-gray-500 mt-1">({totalBottleOz}oz)</div>
            )}
          </div>
        </div>
      </div>

      {/* Diaper Changes */}
      {diaperEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-yellow-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">🧷 Diaper Changes ({diaperEntries.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Staff</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {diaperEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        entry.diaperType === 'wet' ? 'bg-blue-100 text-blue-800' :
                        entry.diaperType === 'solid' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {entry.diaperType === 'wet' && '💧'} 
                        {entry.diaperType === 'solid' && '💩'} 
                        {entry.diaperType === 'both' && '💧💩'}
                        {' '}
                        {entry.diaperType.charAt(0).toUpperCase() + entry.diaperType.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={entry.comments || '-'}>
                        {entry.comments || '-'}
                      </div>
                      {entry.lastEditedAt && (
                        <div className="text-xs text-gray-400 italic mt-1">
                          {formatEditInfo(entry)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {entry.staffInitials}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Edit entry"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Meals */}
      {mealEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">
              🍽️ Meals ({mealEntries.length})
              {totalMealOz > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  • Total: {totalMealOz}oz consumed
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Ingredients</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Staff</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mealEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {entry.amount ? `${entry.amount}oz` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={entry.ingredients}>
                        {entry.ingredients}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={entry.comments || '-'}>
                        {entry.comments || '-'}
                      </div>
                      {entry.lastEditedAt && (
                        <div className="text-xs text-gray-400 italic mt-1">
                          {formatEditInfo(entry)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {entry.staffInitials}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Edit entry"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottles */}
      {bottleEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">
              🍼 Bottles ({bottleEntries.length})
              {totalBottleOz > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  • Total: {totalBottleOz}oz consumed
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Staff</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bottleEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-purple-700 whitespace-nowrap">
                      {entry.amount}oz
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={entry.comments || '-'}>
                        {entry.comments || '-'}
                      </div>
                      {entry.lastEditedAt && (
                        <div className="text-xs text-gray-400 italic mt-1">
                          {formatEditInfo(entry)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {entry.staffInitials}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        title="Edit entry"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
