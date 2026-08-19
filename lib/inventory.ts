//lib/inventory.ts
// Diaper and formula stock, per child.
//
// The balance is NOT a running counter. It is a baseline — the stock as of the
// moment someone last topped up — minus everything the care logs say has been
// used since. Correct a bottle from 4oz to 6oz an hour later, or delete a
// mis-tapped diaper change, and the balance follows, because it is derived from
// the logs rather than decremented alongside them. A counter would have been
// cheaper to read and permanently wrong the first time anyone edited anything.
//
// Formula is counted in ounces of prepared formula, which every bottle log
// already records, so nothing extra has to be typed at logging time.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDateKey } from '@/lib/dateKeys';
import { Child, User } from '@/types';
import { displayName } from '@/lib/messaging';

export type InventoryKind = 'diapers' | 'formula';

export const INVENTORY_KINDS: InventoryKind[] = ['diapers', 'formula'];

/** How stock of each kind is spoken about. */
export const KIND_LABELS: Record<InventoryKind, { name: string; unit: string; unitOne: string }> = {
  diapers: { name: 'Diapers', unit: 'diapers', unitOne: 'diaper' },
  formula: { name: 'Formula', unit: 'oz', unitOne: 'oz' },
};

/** Defaults chosen to give roughly a day's warning at typical usage. */
export const DEFAULT_LOW_AT: Record<InventoryKind, number> = {
  diapers: 6,
  formula: 24,
};

/**
 * How far back a balance will scan for usage. A child whose stock was last
 * topped up beyond this is reported as `stale` rather than silently wrong —
 * the fix is to count what is physically there and record it as a new top-up.
 */
export const MAX_SCAN_DAYS = 60;

export interface InventoryDoc {
  kind: InventoryKind;
  baseline: number;
  baselineAt: Date;
  baselineDateKey: string;
  lowAt: number;
}

export interface Balance {
  kind: InventoryKind;
  /** Stock now: baseline minus usage since the baseline. May be negative. */
  remaining: number;
  used: number;
  baseline: number;
  lowAt: number;
  isLow: boolean;
  /** No stock has ever been recorded for this child and kind. */
  unset: boolean;
  /** The baseline is older than MAX_SCAN_DAYS, so usage is under-counted. */
  stale: boolean;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function inventoryRef(childId: string, kind: InventoryKind) {
  return doc(db, 'children', childId, 'inventory', kind);
}

export async function fetchInventoryDoc(
  childId: string,
  kind: InventoryKind
): Promise<InventoryDoc | null> {
  const snapshot = await getDoc(inventoryRef(childId, kind));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    kind,
    baseline: Number(data.baseline) || 0,
    baselineAt: toDate(data.baselineAt),
    baselineDateKey: (data.baselineDateKey as string) || getDateKey(toDate(data.baselineAt)),
    lowAt: data.lowAt === undefined ? DEFAULT_LOW_AT[kind] : Number(data.lowAt),
  };
}

/** Inclusive local date keys from `from` up to today, oldest first. */
function dateKeysFrom(fromKey: string): { keys: string[]; truncated: boolean } {
  const [y, m, d] = fromKey.split('-').map(Number);
  const cursor = new Date(y, (m || 1) - 1, d || 1, 12);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const keys: string[] = [];
  let truncated = false;

  while (cursor <= today) {
    if (keys.length >= MAX_SCAN_DAYS) {
      truncated = true;
      break;
    }
    keys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { keys, truncated };
}

/**
 * Usage since `since`, read straight from the care logs.
 *
 * Entries are compared against the baseline timestamp, not just the date, so a
 * bottle given at 9am is not counted against a tin opened at noon the same day.
 * Soft-deleted entries are skipped — care logs are marked `deleted`, never
 * removed.
 */
async function usageSince(
  childId: string,
  kind: InventoryKind,
  since: Date,
  dateKeys: string[]
): Promise<number> {
  let used = 0;

  const snapshots = await Promise.all(
    dateKeys.map((dateKey) =>
      getDocs(collection(db, 'children', childId, 'careLogs', dateKey, 'entries'))
    )
  );

  for (const snapshot of snapshots) {
    snapshot.forEach((entryDoc) => {
      const data = entryDoc.data();
      if (data.deleted) return;
      if (toDate(data.timestamp) < since) return;

      if (kind === 'diapers' && data.type === 'diaper') {
        used += 1;
      } else if (kind === 'formula' && data.type === 'bottle') {
        used += Number(data.amount) || 0;
      }
    });
  }

  return used;
}

export async function computeBalance(
  childId: string,
  kind: InventoryKind
): Promise<Balance> {
  const record = await fetchInventoryDoc(childId, kind);

  if (!record) {
    return {
      kind,
      remaining: 0,
      used: 0,
      baseline: 0,
      lowAt: DEFAULT_LOW_AT[kind],
      isLow: false,
      unset: true,
      stale: false,
    };
  }

  const { keys, truncated } = dateKeysFrom(record.baselineDateKey);
  const used = await usageSince(childId, kind, record.baselineAt, keys);
  const remaining = record.baseline - used;

  return {
    kind,
    remaining,
    used,
    baseline: record.baseline,
    lowAt: record.lowAt,
    isLow: remaining <= record.lowAt,
    unset: false,
    stale: truncated,
  };
}

export async function computeBalances(
  childId: string,
  kinds: InventoryKind[] = INVENTORY_KINDS
): Promise<Balance[]> {
  return Promise.all(kinds.map((kind) => computeBalance(childId, kind)));
}

/**
 * Record stock arriving. Adds to what is there rather than replacing it, so a
 * half-used pack is not wiped out by a new one — the balance is recomputed
 * first, then the new stock added on top and the clock reset to now.
 */
export async function addStock({
  child,
  kind,
  amount,
  lowAt,
  user,
}: {
  child: Child;
  kind: InventoryKind;
  amount: number;
  lowAt?: number;
  user: User;
}): Promise<Balance> {
  const current = await computeBalance(child.id, kind);
  const baseline = (current.unset ? 0 : current.remaining) + amount;
  const now = new Date();
  const threshold = lowAt === undefined ? current.lowAt : lowAt;

  await setDoc(
    inventoryRef(child.id, kind),
    {
      childId: child.id,
      daycareId: child.daycareId,
      familyId: child.familyId,
      kind,
      baseline,
      baselineAt: serverTimestamp(),
      baselineDateKey: getDateKey(now),
      lowAt: threshold,
      updatedBy: user.uid,
      updatedByName: displayName(user),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    kind,
    remaining: baseline,
    used: 0,
    baseline,
    lowAt: threshold,
    isLow: baseline <= threshold,
    unset: false,
    stale: false,
  };
}

/**
 * Correct the count to what is physically on the shelf, discarding the previous
 * baseline. Used when the number has drifted, or after a stale scan.
 */
export async function setStock({
  child,
  kind,
  amount,
  lowAt,
  user,
}: {
  child: Child;
  kind: InventoryKind;
  amount: number;
  lowAt?: number;
  user: User;
}): Promise<void> {
  const now = new Date();

  await setDoc(
    inventoryRef(child.id, kind),
    {
      childId: child.id,
      daycareId: child.daycareId,
      familyId: child.familyId,
      kind,
      baseline: amount,
      baselineAt: serverTimestamp(),
      baselineDateKey: getDateKey(now),
      ...(lowAt === undefined ? {} : { lowAt }),
      updatedBy: user.uid,
      updatedByName: displayName(user),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Which kinds apply to a child, from the care settings staff already set. */
export function kindsForChild(child: Child): InventoryKind[] {
  const settings = child.careLogSettings;
  if (!settings || !settings.enabled) return [];

  const kinds: InventoryKind[] = [];
  if (settings.trackDiapers && !settings.pottyTrained) kinds.push('diapers');
  if (settings.trackBottles && !settings.noBottles) kinds.push('formula');
  return kinds;
}

export function formatBalance(balance: Balance): string {
  const { kind, remaining } = balance;
  const labels = KIND_LABELS[kind];
  const rounded = Math.round(remaining * 10) / 10;
  return `${rounded} ${Math.abs(rounded) === 1 ? labels.unitOne : labels.unit}`;
}
