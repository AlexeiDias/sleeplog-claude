//app/parent/reports/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import { Child } from '@/types';
import { getDateKey } from '@/lib/dateKeys';
import {
  dateKeysBetween, fetchChildLogs, buildCsv, buildRangeHtml,
  downloadFile, openPrintable, fetchDaycareName,
} from '@/lib/parentReports';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function ParentReportsPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [start, setStart] = useState(() => getDateKey(daysAgo(6)));
  const [end, setEnd] = useState(() => getDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'csv' | 'print' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }
    try {
      const snapshot = await getDocs(query(
        collection(db, 'children'),
        where('familyId', '==', user.familyId)
      ));
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => !(c as Child).archived) as Child[];
      setChildren(list);
      if (list.length > 0) setChildId((current) => current || list[0].id);
    } catch (err) {
      console.error('Error loading children:', err);
      setError('Could not load your children. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => {
    load();
  }, [load]);

  const child = children.find((c) => c.id === childId);

  function applyPreset(days: number) {
    setStart(getDateKey(daysAgo(days - 1)));
    setEnd(getDateKey(new Date()));
  }

  async function gather() {
    if (!child) throw new Error('No child selected');
    const keys = dateKeysBetween(new Date(`${start}T12:00:00`), new Date(`${end}T12:00:00`));
    if (keys.length > 92) {
      throw new Error('Please choose a range of three months or less.');
    }
    const rows = await fetchChildLogs(child.id, keys);
    return { rows, keys };
  }

  const rangeLabel = `${new Date(`${start}T12:00:00`).toLocaleDateString('en-US')} – ${new Date(`${end}T12:00:00`).toLocaleDateString('en-US')}`;

  async function handleCsv() {
    setBusy('csv');
    setError('');
    setNotice('');
    try {
      const { rows } = await gather();
      if (rows.length === 0) {
        setNotice('There are no entries in that period.');
        return;
      }
      downloadFile(
        `${child!.name.replace(/\s+/g, '-')}-records-${start}-to-${end}.csv`,
        buildCsv(child!.name, rows),
        'text/csv'
      );
      setNotice(`Downloaded ${rows.length} entries.`);
    } catch (err) {
      console.error('CSV export failed:', err);
      setError(err instanceof Error ? err.message : 'Could not build the file.');
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    setBusy('print');
    setError('');
    setNotice('');
    try {
      const { rows } = await gather();
      const daycareName = user?.daycareId
        ? await fetchDaycareName(user.daycareId)
        : 'Daycare';
      const html = buildRangeHtml(child!, rows, daycareName, rangeLabel);

      // In the installed app there are no tabs and no print sheet, so fall back
      // to downloading the report rather than failing silently.
      const opened = openPrintable(html);
      if (!opened) {
        downloadFile(
          `${child!.name.replace(/\s+/g, '-')}-records-${start}-to-${end}.html`,
          html,
          'text/html'
        );
        setNotice(
          'Your browser blocked the print window, so the report was downloaded instead. Open it to print or save as PDF.'
        );
      }
    } catch (err) {
      console.error('Report failed:', err);
      setError(err instanceof Error ? err.message : 'Could not build the report.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading…</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">
          No children are linked to your account yet. Please contact your daycare.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-800">Download records</h2>
        <p className="text-sm text-gray-600 mt-1">
          A copy of everything logged for your child — useful for a doctor&apos;s
          visit, or just to keep.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {children.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Last 7 days', days: 7 },
            { label: 'Last 30 days', days: 30 },
            { label: 'Last 90 days', days: 90 },
          ].map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => applyPreset(preset.days)}
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={end}
              min={start}
              max={getDateKey(new Date())}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {notice}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="primary"
            className="flex-1"
            isLoading={busy === 'print'}
            onClick={handlePrint}
          >
            View / print report
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            isLoading={busy === 'csv'}
            onClick={handleCsv}
          >
            Download spreadsheet
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          The report opens in a new tab where you can print it or save it as a
          PDF. The spreadsheet downloads as a file and opens in Numbers, Excel or
          Google Sheets.
        </p>
      </div>
    </div>
  );
}
