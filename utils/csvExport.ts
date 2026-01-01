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

  // Collect all rows from all children
  const allRows: string[][] = [];
  
  for (const { child, entries } of childrenData) {
    const rows = entries.map(entry => [
      child.name,
      new Date(child.dateOfBirth).toLocaleDateString(),
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
    allRows.push(...rows);
  }

  // Sort by date and time
  allRows.sort((a, b) => {
    const dateA = new Date(`${a[2]} ${a[3]}`).getTime();
    const dateB = new Date(`${b[2]} ${b[3]}`).getTime();
    return dateA - dateB;
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...allRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

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
