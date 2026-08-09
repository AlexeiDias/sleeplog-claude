//components/announcements/PhotoConsentNotice.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  fetchDaycareConsent, childrenToExclude, FamilyConsentStatus,
} from '@/lib/photoConsent';

/**
 * Shown in the announcement composer whenever photos are attached.
 *
 * The app cannot tell who is in a photograph, so this cannot block anything.
 * What it can do is put the names in front of the person posting, at the moment
 * they are posting. That is the whole intent — a prompt, not a gate.
 */
export default function PhotoConsentNotice({ daycareId }: { daycareId?: string }) {
  const [statuses, setStatuses] = useState<FamilyConsentStatus[] | null>(null);

  useEffect(() => {
    if (!daycareId) return;
    fetchDaycareConsent(daycareId)
      .then(setStatuses)
      .catch((err) => console.error('Could not load photo consent:', err));
  }, [daycareId]);

  if (!statuses) return null;

  const excluded = childrenToExclude(statuses);
  const unanswered = statuses.filter((s) => s.status === 'unanswered').length;

  if (excluded.length === 0) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
        All families have agreed to photos being shared with the group.
      </div>
    );
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
      <p className="font-medium mb-1">
        {excluded.length} {excluded.length === 1 ? 'child' : 'children'} should not
        appear in group photos
      </p>
      <p className="mb-1">{excluded.join(', ')}</p>
      <p className="text-xs">
        {unanswered > 0 && (
          <>
            {unanswered} {unanswered === 1 ? 'family has' : 'families have'} not
            answered yet, which counts as no.{' '}
          </>
        )}
        Please check the photo before posting — the app cannot tell who is in it.
      </p>
    </div>
  );
}
