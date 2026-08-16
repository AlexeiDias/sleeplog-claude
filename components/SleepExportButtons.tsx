//components/SleepExportButtons.tsx
'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDateKey } from '@/lib/dateKeys';
import Button from '@/components/Button';
import { Child, SleepLogEntry } from '@/types';
import { exportAllChildrenToCSV } from '@/utils/csvExport';

const RANGES = [7, 30, 90];

/**
 * One-click CSV download for the last 7, 30 or 90 days — the same three
 * presets parents get on their own download screen, so staff never have to
 * fill in a date range for the common cases.
 *
 * Lives in its own component because both the Analytics page and the Daily
 * Sleep Reports page offer it, and staff go looking on whichever page they
 * happen to be on.
 */
export default function SleepExportButtons({ childrenList }: { childrenList: Child[] }) {
  // Holds the range currently exporting, so only that button spins.
  const [exporting, setExporting] = useState<number | null>(null);

  async function handleExportCSV(days: number) {
    if (childrenList.length === 0) {
      alert('No children data to export');
      return;
    }

    setExporting(days);

    try {
      const allData: Array<{ child: Child; entries: SleepLogEntry[] }> = [];
      const today = new Date();

      for (const child of childrenList) {
        const childEntries: SleepLogEntry[] = [];

        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          // Local date key, matching how the logs are written.
          const dateStr = getDateKey(date);

          const logsRef = collection(db, 'children', child.id, 'sleepLogs', dateStr, 'entries');
          const snapshot = await getDocs(logsRef);

          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          })) as SleepLogEntry[];

          childEntries.push(...entries);
        }

        if (childEntries.length > 0) {
          allData.push({ child, entries: childEntries });
        }
      }

      if (allData.length === 0) {
        alert(`No sleep data found in the last ${days} days`);
        return;
      }

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (days - 1));
      const dateRange = `${getDateKey(startDate)}_to_${getDateKey(today)}`;

      await exportAllChildrenToCSV(allData, dateRange);
      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {RANGES.map((days) => (
        <Button
          key={days}
          variant="secondary"
          onClick={() => handleExportCSV(days)}
          isLoading={exporting === days}
          disabled={exporting !== null && exporting !== days}
        >
          📥 Last {days} days
        </Button>
      ))}
    </div>
  );
}
