//lib/parentReports.ts
// Building and downloading care records for parents.
//
// Two formats, because they serve different needs:
//   - A printable report, for handing to a pediatrician or keeping
//   - A CSV file, which downloads reliably everywhere including inside the
//     installed Home Screen app, where there is no share or print button
//
// Deliberately uses only data a parent is allowed to read. In particular it
// does NOT look up staff names — the users collection is readable by staff and
// admins only — so entries are attributed by the initials stored on them.

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDateKey } from '@/lib/dateKeys';
import { Child } from '@/types';
import { formatAge, formatDOB } from '@/lib/childDisplay';

export interface LogRow {
  dateKey: string;
  time: Date;
  category: 'Sleep' | 'Care' | 'Activity' | 'Incident';
  what: string;
  detail: string;
  loggedBy: string;
}

const COLLECTIONS: { key: LogRow['category']; name: string }[] = [
  { key: 'Sleep', name: 'sleepLogs' },
  { key: 'Care', name: 'careLogs' },
  { key: 'Activity', name: 'activityLogs' },
  { key: 'Incident', name: 'incidentLogs' },
];

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** Inclusive list of local date keys between two dates, oldest first. */
export function dateKeysBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0); // midday avoids DST edges shifting the day
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);

  while (cursor <= last) {
    keys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function describe(
  category: LogRow['category'],
  data: Record<string, unknown>
): { what: string; detail: string } | null {
  const parts: string[] = [];
  const push = (v: unknown, prefix = '') => {
    if (v) parts.push(prefix ? `${prefix}${v}` : String(v));
  };

  if (category === 'Sleep') {
    const what =
      data.type === 'start' ? 'Nap started'
      : data.type === 'stop' ? 'Woke up'
      : 'Sleep check';
    push(data.position, 'Position: ');
    push(data.breathing, 'Breathing: ');
    push(data.mood, 'Mood: ');
    push(data.notes);
    return { what, detail: parts.join('; ') };
  }

  if (category === 'Care') {
    let what = 'Care';
    if (data.type === 'bathroom') {
      what = 'Bathroom';
      push(
        ({
          pee: 'Pee',
          poop: 'Poop',
          both: 'Pee and poop',
          accident: 'Accident',
          tried: 'Tried, nothing yet',
        } as Record<string, string>)[data.result as string] || data.result
      );
    } else if (data.type === 'diaper') {
      what = 'Diaper change';
      push(data.diaperType);
    } else if (data.type === 'bottle') {
      what = 'Bottle';
      if (data.amount) parts.push(`${data.amount} oz`);
    } else if (data.type === 'meal') {
      what = 'Meal';
      push(data.ingredients);
      if (data.amount) parts.push(`${data.amount} oz`);
      const nutrition = data.nutrition as { totalCalories?: number } | undefined;
      if (nutrition?.totalCalories) parts.push(`${Math.round(nutrition.totalCalories)} cal`);
    }
    push(data.comments);
    return { what, detail: parts.join('; ') };
  }

  if (category === 'Activity') {
    if (data.deleted) return null;
    push(data.category);
    if (data.duration) parts.push(`${data.duration} min`);
    push(data.notes);
    return { what: String(data.activityName || 'Activity'), detail: parts.join('; ') };
  }

  if (data.deleted) return null;
  push(data.description);
  push(data.location, 'Location: ');
  push(data.bodyPartAffected);
  push(data.firstAidGiven, 'First aid: ');
  if (data.parentNotified) parts.push('Parent notified');
  return { what: `Incident (${data.type || 'other'})`, detail: parts.join('; ') };
}

/** Every log entry for one child across the given date keys, oldest first. */
export async function fetchChildLogs(
  childId: string,
  dateKeys: string[]
): Promise<LogRow[]> {
  const rows: LogRow[] = [];

  for (const dateKey of dateKeys) {
    const snapshots = await Promise.all(
      COLLECTIONS.map(({ name }) =>
        getDocs(collection(db, 'children', childId, name, dateKey, 'entries'))
      )
    );

    snapshots.forEach((snapshot, index) => {
      const category = COLLECTIONS[index].key;
      snapshot.forEach((entryDoc) => {
        const data = entryDoc.data() as Record<string, unknown>;
        const described = describe(category, data);
        if (!described) return;
        rows.push({
          dateKey,
          time: toDate(data.timestamp),
          category,
          what: described.what,
          detail: described.detail,
          loggedBy: (data.staffInitials as string) || '',
        });
      });
    });
  }

  return rows.sort((a, b) => a.time.getTime() - b.time.getTime());
}

function csvCell(value: string): string {
  // Quote everything and double internal quotes — simplest correct escaping,
  // and notes routinely contain commas.
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsv(childName: string, rows: LogRow[]): string {
  const header = ['Date', 'Time', 'Category', 'Entry', 'Details', 'Logged by', 'Child'];
  const lines = [header.map(csvCell).join(',')];

  for (const row of rows) {
    lines.push([
      row.dateKey,
      row.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      row.category,
      row.what,
      row.detail,
      row.loggedBy,
      childName,
    ].map(csvCell).join(','));
  }

  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDayHeading(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Printable multi-day report. Styled for paper, not for a phone screen. */
export function buildRangeHtml(
  child: Child,
  rows: LogRow[],
  daycareName: string,
  rangeLabel: string
): string {
  const byDay = new Map<string, LogRow[]>();
  rows.forEach((row) => {
    const existing = byDay.get(row.dateKey);
    if (existing) existing.push(row);
    else byDay.set(row.dateKey, [row]);
  });

  const days = Array.from(byDay.entries())
    .map(([dateKey, dayRows]) => `
      <h2>${formatDayHeading(dateKey)}</h2>
      <table>
        <thead>
          <tr><th>Time</th><th>Category</th><th>Entry</th><th>Details</th><th>By</th></tr>
        </thead>
        <tbody>
          ${dayRows.map((row) => `
            <tr>
              <td class="nowrap">${row.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
              <td>${row.category}</td>
              <td>${escapeHtml(row.what)}</td>
              <td>${escapeHtml(row.detail)}</td>
              <td class="nowrap">${escapeHtml(row.loggedBy)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`)
    .join('');

  // Photo is embedded by URL. Firebase download URLs carry their own token and
  // resolve without a session, so the report still shows the photo when opened
  // from a saved file or sent to a doctor.
  const photo = child.photoUrl
    ? `<img class="avatar" src="${child.photoUrl}" alt="" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(child.name)} — Care Record</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
         color: #1f2937; max-width: 820px; margin: 0 auto; padding: 32px 24px; }
  h1 { color: #1e3a8a; margin: 0 0 4px; font-size: 24px; }
  h2 { font-size: 15px; margin: 28px 0 8px; padding-bottom: 4px;
       border-bottom: 2px solid #e5e7eb; page-break-after: avoid; }
  .meta { color: #6b7280; font-size: 13px; margin: 0; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
  table { width: 100%; border-collapse: collapse; font-size: 13px;
          page-break-inside: auto; }
  th { text-align: left; background: #f3f4f6; padding: 6px 8px; font-weight: 600; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .nowrap { white-space: nowrap; }
  .note { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb;
          color: #6b7280; font-size: 11px; }
  .empty { color: #6b7280; font-style: italic; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    ${photo}
    <div>
      <h1>${escapeHtml(child.name)}</h1>
      <p class="meta">
        ${escapeHtml(formatAge(child.dateOfBirth))} · born ${escapeHtml(formatDOB(child.dateOfBirth))}<br />
        ${escapeHtml(daycareName)}<br />
        Care record — ${escapeHtml(rangeLabel)}<br />
        Generated ${new Date().toLocaleString('en-US')}
      </p>
    </div>
  </div>
  ${days || '<p class="empty">No entries were recorded in this period.</p>'}
  <p class="note">
    This record reflects care logged by staff at the times shown. It is designed
    to support recordkeeping and is provided for your reference. Please contact
    the facility with any questions about its contents.
  </p>
</body>
</html>`;
}

/** Triggers a real file download — works inside the installed app, unlike print. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens printable HTML in a new tab and offers the print sheet. */
export function openPrintable(html: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false; // popup blocked, or standalone app with no tabs
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}

export async function fetchDaycareName(daycareId: string): Promise<string> {
  try {
    const snapshot = await getDoc(doc(db, 'daycares', daycareId));
    return (snapshot.data()?.name as string) || 'Daycare';
  } catch {
    return 'Daycare';
  }
}
