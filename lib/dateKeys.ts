//lib/dateKeys.ts
// Canonical date-key helper. Import this rather than rebuilding the format.
//
// Log subcollections are keyed by LOCAL date: children/{id}/sleepLogs/{YYYY-MM-DD}
// where the components that write them use getFullYear/getMonth/getDate.
//
// Using toISOString().split('T')[0] instead returns the UTC date, which in
// Pacific time is tomorrow's key from roughly 5pm onwards. Reads built that way
// query days that do not exist and silently under-report. This is the same
// class of bug as the DOB timezone issue, and it reached production twice.

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Date keys for the last `days` days, oldest first, including today. */
export function recentDateKeys(days: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    keys.push(getDateKey(d));
  }
  return keys;
}
