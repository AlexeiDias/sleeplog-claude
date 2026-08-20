//components/InventoryPanel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Balance,
  InventoryKind,
  KIND_LABELS,
  addStock,
  setStock,
  computeBalances,
  kindsForChild,
  formatBalance,
  formulaAside,
  gramsToScoops,
  DEFAULT_FORMULA_RATIO,
} from '@/lib/inventory';
import { Child } from '@/types';

/**
 * Diaper and formula stock for one child, on the Care tab — where staff already
 * are when they notice a pack is running out.
 *
 * Which rows appear comes from the care settings staff already set on the
 * child: a potty-trained child has no diaper row, a child on solids has no
 * formula row. No second set of switches to keep in step with the first.
 */
export default function InventoryPanel({
  child,
  refreshKey,
}: {
  child: Child;
  /** Change this to recount after a care log is added or edited. */
  refreshKey?: number;
}) {
  const { user } = useAuth();
  const kinds = kindsForChild(child);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [busy, setBusy] = useState<InventoryKind | null>(null);
  const [editing, setEditing] = useState<InventoryKind | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'add' | 'set'>('add');
  // Formula only: type what the tin says in grams and let the app divide,
  // rather than doing it on a phone at the counter.
  const [entryUnit, setEntryUnit] = useState<'scoops' | 'grams'>('scoops');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (kinds.length === 0) {
      setBalances([]);
      return;
    }
    try {
      setBalances(await computeBalances(child.id, kinds));
    } catch (err) {
      console.error('Could not read stock:', err);
      setError('Could not read stock levels.');
    }
    // kinds is derived from child settings; child.id and the settings drive it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, JSON.stringify(kinds), refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(kind: InventoryKind) {
    const typed = Number(amount);
    if (!user || !Number.isFinite(typed) || typed < 0) {
      setError('Enter a number.');
      return;
    }

    const current = balances?.find((b) => b.kind === kind);
    const ratio = current?.ratio || DEFAULT_FORMULA_RATIO;

    // Grams entry is a convenience on the way in; stock is always kept in
    // scoops so it matches what a bottle actually consumes.
    const value =
      kind === 'formula' && entryUnit === 'grams'
        ? gramsToScoops(typed, ratio)
        : typed;

    setBusy(kind);
    setError('');

    try {
      if (mode === 'add') {
        await addStock({ child, kind, amount: value, ratio, user });
      } else {
        await setStock({ child, kind, amount: value, ratio, user });
      }
      setEditing(null);
      setAmount('');
      await load();
    } catch (err) {
      console.error('Could not update stock:', err);
      setError('Could not save. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  if (kinds.length === 0) return null;
  if (!balances) {
    return <p className="text-sm text-gray-500">Checking stock…</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Supplies</h4>

      <div className="space-y-3">
        {balances.map((balance) => {
          const labels = KIND_LABELS[balance.kind];
          const isEditing = editing === balance.kind;

          return (
            <div key={balance.kind} className="border-b last:border-b-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{labels.name}</p>
                  {balance.unset ? (
                    <p className="text-sm text-gray-500">Not counted yet</p>
                  ) : balance.needsRecount ? (
                    <p className="text-sm text-amber-700">Needs recounting</p>
                  ) : (
                    <p
                      className={`text-sm ${
                        balance.isLow ? 'text-red-700 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      {formatBalance(balance)} left
                      {balance.used > 0 && (
                        <span className="text-gray-400">
                          {' '}
                          · {Math.round(balance.used * 10) / 10} used
                        </span>
                      )}
                    </p>
                  )}

                  {formulaAside(balance) && (
                    <p className="text-xs text-gray-400">{formulaAside(balance)}</p>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(isEditing ? null : balance.kind);
                    setMode(balance.unset || balance.needsRecount ? 'set' : 'add');
                    setEntryUnit('scoops');
                    setAmount('');
                    setError('');
                  }}
                  className="text-sm shrink-0"
                >
                  {isEditing
                    ? 'Cancel'
                    : balance.unset || balance.needsRecount
                    ? 'Count'
                    : '+ Add'}
                </Button>
              </div>

              {balance.isLow && !balance.unset && (
                <p className="mt-1 text-xs text-red-700">
                  Running low — ask the family to send more.
                </p>
              )}

              {balance.needsRecount && (
                <p className="mt-1 text-xs text-amber-700">
                  Formula used to be counted in ounces of made bottle, which
                  counted the water as if it were powder. It is now counted in
                  scoops. Count what is in the tin once and this goes away.
                </p>
              )}

              {balance.stale && (
                <p className="mt-1 text-xs text-amber-700">
                  Last counted a long time ago, so this may be high. Use Count to
                  set what is actually there.
                </p>
              )}

              {isEditing && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    {(['add', 'set'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMode(option)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          mode === option
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {option === 'add' ? 'Add to stock' : 'Set exact count'}
                      </button>
                    ))}
                  </div>

                  {balance.kind === 'formula' && (
                    <div className="flex gap-2">
                      {(['scoops', 'grams'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setEntryUnit(option)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            entryUnit === option
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {option === 'scoops' ? 'In scoops' : 'In grams'}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={
                        balance.kind !== 'formula'
                          ? 'Number of diapers'
                          : entryUnit === 'grams'
                          ? 'Grams on the tin'
                          : 'Number of scoops'
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base"
                    />
                    <Button
                      variant="primary"
                      onClick={() => handleSubmit(balance.kind)}
                      isLoading={busy === balance.kind}
                      disabled={busy !== null || amount === ''}
                      className="text-sm"
                    >
                      Save
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                    {balance.kind === 'formula' ? (
                      <>
                        {entryUnit === 'grams'
                          ? `Whatever the tin says. ${balance.ratio.gramsPerScoop} g per scoop, so it converts to about ${
                              amount && Number(amount) > 0
                                ? Math.round((Number(amount) / balance.ratio.gramsPerScoop) * 10) / 10
                                : '…'
                            } scoops.`
                          : 'Level scoops of powder.'}{' '}
                        A {balance.ratio.ozPerScoop * 3} oz bottle uses 3 scoops.
                      </>
                    ) : (
                      'Each diaper change logged takes one off this.'
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
