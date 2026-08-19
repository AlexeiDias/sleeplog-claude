//components/parent/SuppliesNote.tsx
'use client';

import { useState, useEffect } from 'react';
import { Balance, computeBalances, formatBalance, KIND_LABELS } from '@/lib/inventory';

/**
 * What your child has left at the daycare, so you can check before shopping.
 *
 * Read-only: the count has to match what is physically on the shelf there, so
 * only staff can change it. Shows nothing at all until staff have counted
 * something — an empty supplies box would just look broken.
 *
 * Kinds are inferred from which counts exist rather than from the child's care
 * settings, which live in a subcollection the parent portal does not load.
 */
export default function SuppliesNote({ childId }: { childId: string }) {
  const [balances, setBalances] = useState<Balance[]>([]);

  useEffect(() => {
    let cancelled = false;

    computeBalances(childId)
      .then((all) => {
        if (!cancelled) setBalances(all.filter((b) => !b.unset));
      })
      .catch((err) => console.error('Could not read supplies:', err));

    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (balances.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {balances.map((balance) => (
        <span
          key={balance.kind}
          className={`px-2.5 py-1 rounded-full text-xs ${
            balance.isLow
              ? 'bg-red-100 text-red-800 font-medium'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {KIND_LABELS[balance.kind].name}: {formatBalance(balance)}
          {balance.isLow && ' — please send more'}
        </span>
      ))}
    </div>
  );
}
