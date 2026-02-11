//components/IncidentLogTable.tsx
'use client';

import { IncidentLogEntry } from '@/types';

interface IncidentLogTableProps {
  entries: IncidentLogEntry[];
  onEdit: (entry: IncidentLogEntry) => void;
}

export default function IncidentLogTable({ entries, onEdit }: IncidentLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-4xl">✅</span>
        <p className="mt-2">No incidents today</p>
      </div>
    );
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'injury': return '🤕';
      case 'illness': return '🤒';
      case 'behavioral': return '😤';
      default: return '📝';
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'injury': return 'Injury';
      case 'illness': return 'Illness';
      case 'behavioral': return 'Behavioral';
      default: return 'Other';
    }
  }

  function getTypeBgColor(type: string) {
    switch (type) {
      case 'injury': return 'bg-red-100 text-red-800 border-red-200';
      case 'illness': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'behavioral': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Sort by timestamp descending (most recent first)
  const sortedEntries = [...entries].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">
            {entries.filter(e => e.type === 'injury').length}
          </div>
          <div className="text-xs text-red-600">Injuries</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-700">
            {entries.filter(e => e.type === 'illness').length}
          </div>
          <div className="text-xs text-orange-600">Illness</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {entries.filter(e => e.type === 'behavioral').length}
          </div>
          <div className="text-xs text-purple-600">Behavioral</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">
            {entries.filter(e => e.type === 'other').length}
          </div>
          <div className="text-xs text-gray-600">Other</div>
        </div>
      </div>

      {/* Incident Cards */}
      <div className="space-y-3">
        {sortedEntries.map((entry) => (
          <div 
            key={entry.id} 
            className={`border rounded-lg p-4 ${getTypeBgColor(entry.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getTypeIcon(entry.type)}</span>
                  <span className="font-semibold">{getTypeLabel(entry.type)}</span>
                  <span className="text-sm opacity-75">• {formatTime(entry.timestamp)}</span>
                </div>

                {/* Location & Body Part */}
                <div className="flex flex-wrap gap-2 mb-2 text-sm">
                  <span className="bg-white/50 px-2 py-1 rounded">
                    📍 {entry.location}
                  </span>
                  {entry.bodyPartAffected && (
                    <span className="bg-white/50 px-2 py-1 rounded">
                      🩹 {entry.bodyPartAffected}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm mb-2">{entry.description}</p>

                {/* First Aid */}
                {entry.firstAidGiven && (
                  <div className="text-sm bg-white/50 rounded p-2 mb-2">
                    <strong>First Aid:</strong> {entry.firstAidGiven}
                  </div>
                )}

                {/* Photo */}
                {entry.photoUrl && (
                  <div className="mb-2">
                    <img 
                      src={entry.photoUrl} 
                      alt="Incident photo" 
                      className="w-24 h-24 object-cover rounded border border-white/50 cursor-pointer hover:opacity-80"
                      onClick={() => window.open(entry.photoUrl, '_blank')}
                    />
                  </div>
                )}

                {/* Staff */}
                <div className="text-xs opacity-75">
                  Logged by: {entry.staffName || entry.staffInitials} ({entry.staffInitials})
                  {entry.lastEditedAt && (
                    <span> • Edited by {entry.lastEditedByInitials}</span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => onEdit(entry)}
                className="text-gray-600 hover:text-gray-800 p-1"
                title="Edit incident"
              >
                ✏️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
