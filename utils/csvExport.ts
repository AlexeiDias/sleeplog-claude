//utils/csvExport.ts
import { SleepLogEntry, Child } from '@/types';

export function exportToCSV(child: Child, entries: SleepLogEntry[], dateRange: string) {
  // CSV Headers
  const headers = [
    'Child Name',
    'Date',
    'Time',
    'Action',
    'Position',
    'Breathing',
    'Mood',
    'Notes',
    'Interval (min)',
    'Staff Initials',
    'Session ID',
  ];

  // CSV Rows
  const rows = entries.map(entry => [
    child.name,
    new Date(entry.timestamp).toLocaleDateString(),
    new Date(entry.timestamp).toLocaleTimeString(),
    entry.type,
    entry.position,
    entry.breathing,
    entry.mood || '',
    entry.notes || '',
    entry.intervalSinceLast?.toString() || '',
    entry.staffInitials,
    entry.sessionId,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sleeplog_${child.name.replace(/\s+/g, '_')}_${dateRange}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Quote every cell and double any internal quotes. Notes routinely contain
// commas and quotation marks, which otherwise split a row into extra columns.
function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// YYYY-MM-DD, in local time. Sorts correctly as text and is read as a date by
// Excel and Google Sheets, unlike the locale format this used to write.
function isoDate(value: Date): string {
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Dates of birth are stored at noon UTC and must be read in UTC, or a Pacific
// browser shows the day before.
function isoDobUTC(value: Date): string {
  const d = new Date(value);
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

export async function exportAllChildrenToCSV(childrenData: Array<{ child: Child; entries: SleepLogEntry[] }>, dateRange: string) {
  // CSV Headers
  const headers = [
    'Child Name',
    'Child DOB',
    'Date',
    'Time',
    'Action',
    'Position',
    'Breathing',
    'Mood',
    'Notes',
    'Interval (min)',
    'Staff Initials',
    'Session ID',
  ];

  // One block per child, oldest entry first inside each block — the same order
  // as the printed report. The previous version interleaved every child into a
  // single date-sorted list, which is unreadable once there is more than one
  // child, and it sorted on formatted date strings rather than the timestamp.
  const blocks: string[][][] = [];

  const orderedChildren = [...childrenData].sort((a, b) =>
    a.child.name.localeCompare(b.child.name)
  );

  for (const { child, entries } of orderedChildren) {
    const orderedEntries = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    blocks.push(
      orderedEntries.map(entry => [
        child.name,
        isoDobUTC(new Date(child.dateOfBirth)),
        isoDate(new Date(entry.timestamp)),
        new Date(entry.timestamp).toLocaleTimeString(),
        entry.type,
        entry.position,
        entry.breathing,
        entry.mood || '',
        entry.notes || '',
        entry.intervalSinceLast?.toString() || '',
        entry.staffInitials,
        entry.sessionId,
      ])
    );
  }

  // A blank line between children, so the blocks are visible at a glance when
  // the file is opened in a spreadsheet.
  const body = blocks
    .map(rows => rows.map(row => row.map(csvCell).join(',')).join('\n'))
    .join('\n\n');

  const csvContent = [headers.join(','), body].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sleeplog_all_children_${dateRange}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
