//components/PrintRangeButtons.tsx
'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import { PRINT_RANGES } from '@/lib/inspectorPrint';

/**
 * One click per range, for the records an inspector asks to see on the day.
 *
 * The work happens in the caller so this component stays the same on every
 * page; all it owns is which button is spinning.
 */
export default function PrintRangeButtons({
  onPrint,
  ranges = PRINT_RANGES,
  label = '🖨️ Last',
}: {
  onPrint: (days: number) => Promise<void>;
  ranges?: number[];
  label?: string;
}) {
  const [printing, setPrinting] = useState<number | null>(null);

  async function handleClick(days: number) {
    setPrinting(days);
    try {
      await onPrint(days);
    } finally {
      setPrinting(null);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {ranges.map((days) => (
        <Button
          key={days}
          variant="secondary"
          onClick={() => handleClick(days)}
          isLoading={printing === days}
          disabled={printing !== null && printing !== days}
        >
          {label} {days} days
        </Button>
      ))}
    </div>
  );
}
