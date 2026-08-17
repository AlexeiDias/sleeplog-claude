//lib/inspectorPrint.ts
// Printable, multi-day versions of the two records a licensing inspector asks
// for: sleep logs and sign-in/out records. Care, activity and incident logs are
// deliberately not included — they are not part of what gets handed over.

import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDateKey } from '@/lib/dateKeys';
import { dateKeysBetween } from '@/lib/parentReports';
import { formatAge, formatDOB } from '@/lib/childDisplay';
import { Child, SleepLogEntry, SignInOutRecord } from '@/types';

/** A built report: everything between <body> and </body>, plus its title. */
export interface Printable {
  title: string;
  inner: string;
}

const TOOLBAR = `
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <span>If no print box opened, use this button. To keep a copy instead of printing, choose &ldquo;Save as PDF&rdquo; as the destination.</span>
  </div>`;

/**
 * Shows the report and asks the browser to print it.
 *
 * On a desktop browser it opens in a new tab. Inside the iPad/iPhone
 * home-screen app there are no tabs, so window.open returns null — no pop-up
 * setting changes that, it is how a standalone web app works. In that case the
 * report is drawn over the current screen instead, and the print stylesheet
 * hides the app behind it so only the report reaches the paper.
 *
 * Returns which route was taken, so a caller can say something useful.
 */
export function openPrintDocument(doc: Printable): 'window' | 'inline' {
  const win = window.open('', '_blank');

  if (win) {
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(doc.title)}</title>
<style>${PRINT_CSS}</style></head>
<body>${TOOLBAR}${doc.inner}${AUTO_PRINT_SCRIPT}</body></html>`);
    win.document.close();
    win.focus();
    return 'window';
  }

  printInline(doc);
  return 'inline';
}

const OVERLAY_ID = 'lc-print-overlay';
const OVERLAY_STYLE_ID = 'lc-print-overlay-style';

/** Draw the report over the app and print it, for browsers with no tabs. */
function printInline(doc: Printable): void {
  close();

  const style = document.createElement('style');
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 9999; background: #fff;
                     overflow: auto; -webkit-overflow-scrolling: touch; }
    #${OVERLAY_ID} .sheet { max-width: 900px; margin: 0 auto; padding: 16px;
                            font-family: Arial, Helvetica, sans-serif; }
    ${PRINT_CSS}
    @media print {
      body > *:not(#${OVERLAY_ID}) { display: none !important; }
      #${OVERLAY_ID} { position: static; overflow: visible; }
      #${OVERLAY_ID} .sheet { max-width: none; padding: 0; }
    }
  `;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `<div class="sheet">
    <div class="toolbar no-print">
      <button type="button" data-lc-print>Print / Save as PDF</button>
      <button type="button" data-lc-close>Close</button>
      <span>If no print box opens, this device cannot print from the home-screen app. Open loggincare.com in Safari, or print from a computer.</span>
    </div>
    ${doc.inner}
  </div>`;

  overlay.querySelector('[data-lc-print]')?.addEventListener('click', () => window.print());
  overlay.querySelector('[data-lc-close]')?.addEventListener('click', close);

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Let the images arrive before the print sheet opens, same reason as the
  // new-tab route.
  whenImagesSettle(overlay, () => window.print());

  function close(): void {
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(OVERLAY_STYLE_ID)?.remove();
  }
}

/** Run `then` once every image inside `root` has loaded or failed, capped at 8s. */
function whenImagesSettle(root: HTMLElement, then: () => void): void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    setTimeout(then, 150);
  };

  const pending = Array.from(root.querySelectorAll('img')).filter((img) => !img.complete);
  if (pending.length === 0) {
    go();
    return;
  }

  let left = pending.length;
  const tick = () => {
    if (--left <= 0) go();
  };
  pending.forEach((img) => {
    img.addEventListener('load', tick);
    img.addEventListener('error', tick);
  });
  setTimeout(go, 8000);
}

/** The three ranges offered as one-click buttons. */
export const PRINT_RANGES = [15, 30, 90];

export interface DayOfSleep {
  dateKey: string;
  entries: SleepLogEntry[];
  totalMinutes: number;
}

export interface ChildSleepRange {
  child: Child;
  days: DayOfSleep[];
  totalMinutes: number;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** Local date keys for the last `days` days, oldest first, ending today. */
export function lastNDateKeys(days: number): string[] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return dateKeysBetween(start, end);
}

export function rangeLabel(days: number): string {
  const keys = lastNDateKeys(days);
  return `${prettyDate(keys[0])} – ${prettyDate(keys[keys.length - 1])}`;
}

function prettyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Total sleep for a day, using the same start→stop pairing the dashboard and
 * the historical cards use. A session left open (no stop) contributes nothing,
 * which matches what staff see on screen.
 */
function totalSleepMinutes(entries: SleepLogEntry[]): number {
  let total = 0;
  let sessionStart: Date | null = null;

  for (const entry of entries) {
    if (entry.type === 'start') {
      sessionStart = entry.timestamp;
    } else if (entry.type === 'stop' && sessionStart) {
      total += Math.floor((entry.timestamp.getTime() - sessionStart.getTime()) / 60000);
      sessionStart = null;
    }
  }

  return total;
}

// ============================================
// SLEEP LOGS
// ============================================

/** Every sleep entry for every child across the given date keys. */
export async function fetchSleepRange(
  children: Child[],
  dateKeys: string[]
): Promise<ChildSleepRange[]> {
  const results: ChildSleepRange[] = [];

  for (const child of children) {
    const days: DayOfSleep[] = [];

    for (const dateKey of dateKeys) {
      const snapshot = await getDocs(
        collection(db, 'children', child.id, 'sleepLogs', dateKey, 'entries')
      );
      if (snapshot.empty) continue;

      const entries = snapshot.docs
        .map((entryDoc) => ({
          id: entryDoc.id,
          ...entryDoc.data(),
          timestamp: toDate(entryDoc.data().timestamp),
        }))
        .sort(
          (a, b) =>
            (a as SleepLogEntry).timestamp.getTime() - (b as SleepLogEntry).timestamp.getTime()
        ) as SleepLogEntry[];

      days.push({ dateKey, entries, totalMinutes: totalSleepMinutes(entries) });
    }

    results.push({
      child,
      days,
      totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
    });
  }

  return results;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_CSS = `
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 12px;
         max-width: 900px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  h2 { font-size: 16px; margin: 0; }
  .doc-header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
  .doc-header .meta { color: #555; font-size: 12px; margin-top: 4px; }
  .child { page-break-before: always; break-before: page; padding-top: 8px; }
  .child:first-of-type { page-break-before: auto; break-before: auto; }
  .child-header { display: flex; align-items: center; gap: 12px;
                  border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 12px; }
  .child-header img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
                      border: 1px solid #ccc; }
  .child-header .initial { width: 56px; height: 56px; border-radius: 50%; background: #e0e7ff;
                           color: #3730a3; font-size: 24px; font-weight: bold;
                           display: flex; align-items: center; justify-content: center; }
  .child-header .sub { color: #555; font-size: 12px; margin-top: 2px; }
  .child-header .total { margin-left: auto; text-align: right; font-size: 12px; color: #555; }
  .child-header .total strong { display: block; font-size: 16px; color: #222; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px;
       border-bottom: 2px solid #d1d5db; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .day-row td { background: #fafafa; font-weight: bold; }
  .empty { color: #777; font-style: italic; padding: 10px 0; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px;
           font-weight: bold; }
  .badge-in { background: #dcfce7; color: #166534; }
  .badge-out { background: #fee2e2; color: #991b1b; }
  .sig { max-height: 34px; max-width: 110px; border: 1px solid #ddd; border-radius: 3px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd;
            color: #666; font-size: 10px; text-align: center; }
  .toolbar { position: sticky; top: 0; background: #eef2ff; border: 1px solid #c7d2fe;
             border-radius: 6px; padding: 10px 12px; margin-bottom: 16px;
             display: flex; align-items: center; gap: 12px; }
  .toolbar button { font: inherit; font-weight: bold; padding: 6px 14px; border-radius: 5px;
                    border: 0; background: #4f46e5; color: #fff; cursor: pointer; }
  .toolbar span { color: #3730a3; font-size: 11px; }
  @media print { body { padding: 12px; } .no-print { display: none !important; } }
`;

// Print once the images have actually arrived. A child photo or a signature
// still loading when print() fires prints as a blank box, or hangs the dialog.
// The 8s cap means one unreachable image cannot block the whole document.
const AUTO_PRINT_SCRIPT = `
<script>
(function () {
  var started = false;
  function go() {
    if (started) return;
    started = true;
    setTimeout(function () { window.print(); }, 150);
  }
  function whenImagesSettle() {
    var pending = [].slice.call(document.images).filter(function (img) { return !img.complete; });
    if (!pending.length) return go();
    var left = pending.length;
    function done() { if (--left <= 0) go(); }
    pending.forEach(function (img) {
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    });
    setTimeout(go, 8000);
  }
  if (document.readyState === 'complete') whenImagesSettle();
  else window.addEventListener('load', whenImagesSettle);
})();
<\/script>`;

function docShell(title: string, subtitle: string, body: string, footNote: string): Printable {
  return {
    title,
    inner: `
  <div class="doc-header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(subtitle)}</div>
  </div>
  ${body}
  <div class="footer">
    <p>Printed ${escapeHtml(new Date().toLocaleString())}</p>
    <p>${escapeHtml(footNote)}</p>
  </div>`,
  };
}

/** One child per page: photo, name, age, then a day-by-day nap table. */
export function buildSleepPrintHtml(
  ranges: ChildSleepRange[],
  daycareName: string,
  days: number
): Printable {
  const sections = ranges
    .map((range) => {
      const { child } = range;
      const avatar = child.photoUrl
        ? `<img src="${escapeHtml(child.photoUrl)}" alt="" />`
        : `<div class="initial">${escapeHtml(child.name.trim().charAt(0).toUpperCase() || '?')}</div>`;

      const rows = range.days
        .map((day) => {
          const naps = day.entries
            .map((entry) => {
              const label =
                entry.type === 'start' ? 'Placed down' : entry.type === 'stop' ? 'Woke / up' : 'Check';
              const detail = [
                entry.position ? `Position: ${entry.position}` : '',
                entry.breathing ? `Breathing: ${entry.breathing}` : '',
                entry.mood ? `Mood: ${entry.mood}` : '',
                entry.notes || '',
              ]
                .filter(Boolean)
                .join(' · ');
              return `<tr>
                <td>${escapeHtml(formatTime(entry.timestamp))}</td>
                <td>${escapeHtml(label)}</td>
                <td>${escapeHtml(detail)}</td>
                <td>${escapeHtml(entry.staffInitials || '')}</td>
              </tr>`;
            })
            .join('');

          return `<tr class="day-row">
              <td colspan="3">${escapeHtml(prettyDate(day.dateKey))}</td>
              <td>${escapeHtml(formatMinutes(day.totalMinutes))}</td>
            </tr>${naps}`;
        })
        .join('');

      const table = range.days.length
        ? `<table>
             <thead><tr><th>Time</th><th>Entry</th><th>Details</th><th>Staff</th></tr></thead>
             <tbody>${rows}</tbody>
           </table>`
        : `<p class="empty">No sleep logs recorded in this period.</p>`;

      return `<div class="child">
        <div class="child-header">
          ${avatar}
          <div>
            <h2>${escapeHtml(child.name)}</h2>
            <div class="sub">${escapeHtml(formatAge(child.dateOfBirth))} · DOB ${escapeHtml(
              formatDOB(child.dateOfBirth)
            )}</div>
          </div>
          <div class="total">Total sleep recorded<strong>${escapeHtml(
            formatMinutes(range.totalMinutes)
          )}</strong></div>
        </div>
        ${table}
      </div>`;
    })
    .join('');

  return docShell(
    'Sleep Logs',
    `${daycareName} · Last ${days} days · ${rangeLabel(days)}`,
    sections || '<p class="empty">No children on file.</p>',
    'Times are recorded by staff at the moment of each check.'
  );
}

// ============================================
// SIGN-IN / OUT RECORDS
// ============================================

/** Sign-in/out records for a daycare across the last `days` days, oldest first. */
export async function fetchSignInOutRange(
  daycareId: string,
  days: number
): Promise<SignInOutRecord[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(
      collection(db, 'signInOut'),
      where('daycareId', '==', daycareId),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end)),
      orderBy('timestamp', 'asc')
    )
  );

  return snapshot.docs.map((recordDoc) => ({
    id: recordDoc.id,
    ...recordDoc.data(),
    timestamp: toDate(recordDoc.data().timestamp),
    createdAt: toDate(recordDoc.data().createdAt),
  })) as SignInOutRecord[];
}

/**
 * Grouped by day, oldest first — an inspector reads these as "show me that
 * Tuesday", not as one long list.
 *
 * Signature images are included: the signature is the evidence that a named
 * guardian collected the child, which is the point of the record.
 */
export function buildSignInOutPrintHtml(
  records: SignInOutRecord[],
  daycareName: string,
  days: number
): Printable {
  const byDay = new Map<string, SignInOutRecord[]>();
  for (const record of records) {
    const key = getDateKey(record.timestamp);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(record);
    else byDay.set(key, [record]);
  }

  const sections = Array.from(byDay.entries())
    .map(([dateKey, dayRecords]) => {
      const rows = dayRecords
        .map(
          (record) => `<tr>
            <td>${escapeHtml(formatTime(record.timestamp))}</td>
            <td><strong>${escapeHtml(record.childName)}</strong></td>
            <td><span class="badge ${record.type === 'sign-in' ? 'badge-in' : 'badge-out'}">${
              record.type === 'sign-in' ? 'Sign in' : 'Sign out'
            }</span></td>
            <td>${escapeHtml(record.parentFullName)}</td>
            <td>${escapeHtml(record.relationship)}</td>
            <td>${escapeHtml(record.idNumber || '-')}</td>
            <td>${
              record.signature
                ? `<img src="${escapeHtml(record.signature)}" alt="Signature" class="sig" />`
                : '<span class="empty">No signature</span>'
            }</td>
          </tr>`
        )
        .join('');

      return `<table>
        <thead>
          <tr class="day-row"><td colspan="7">${escapeHtml(prettyDate(dateKey))} — ${
            dayRecords.length
          } record${dayRecords.length === 1 ? '' : 's'}</td></tr>
          <tr>
            <th>Time</th><th>Child</th><th>Type</th><th>Parent / Guardian</th>
            <th>Relationship</th><th>ID number</th><th>Signature</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join('');

  return docShell(
    'Sign-In / Out Records',
    `${daycareName} · Last ${days} days · ${rangeLabel(days)} · ${records.length} record${
      records.length === 1 ? '' : 's'
    }`,
    sections || '<p class="empty">No sign-in/out records in this period.</p>',
    'Signatures were captured electronically at the kiosk at the time of sign-in or sign-out.'
  );
}
