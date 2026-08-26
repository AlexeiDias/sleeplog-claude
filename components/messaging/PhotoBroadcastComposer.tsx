//components/messaging/PhotoBroadcastComposer.tsx
'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Button from '@/components/Button';
import AttachmentPreview from '@/components/AttachmentPreview';
import {
  validateAttachmentAsync,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from '@/lib/messaging';
import {
  broadcastPhotosToFamilies,
  BroadcastResult,
  BroadcastProgress,
} from '@/lib/photoBroadcast';
import { notifyParentsOfStaffMessage } from '@/lib/messageNotifications';
import { fetchDaycareConsent, FamilyConsentStatus } from '@/lib/photoConsent';
import { Family, User } from '@/types';

/**
 * Send the same photos, or just a note, to several families at once, as
 * ordinary private messages rather than an announcement.
 *
 * Photos are optional: a note to the four families whose children need winter
 * boots is the same job, and Announcements is the wrong tool for it because
 * every parent would read the replies.
 *
 * Consent is surfaced here even though a private photo to one family never
 * needs it. Sending one picture to six families is group sharing in every way
 * that matters to a parent who asked for their child not to appear in one —
 * the thread it lands in does not change who sees the photograph.
 */
export default function PhotoBroadcastComposer({
  families,
  currentUser,
  daycareId,
  onSent,
}: {
  families: Family[];
  currentUser: User;
  daycareId: string;
  onSent?: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<BroadcastProgress | null>(null);
  const [results, setResults] = useState<BroadcastResult[] | null>(null);
  const [consent, setConsent] = useState<FamilyConsentStatus[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!daycareId) return;
    fetchDaycareConsent(daycareId)
      .then(setConsent)
      .catch((err) => console.error('Could not load photo consent:', err));
  }, [daycareId]);

  const consentByFamily = new Map(consent?.map((c) => [c.familyId, c]) ?? []);
  const sending = progress !== null;

  function familyLabel(family: Family): string {
    return family.motherName || family.fatherName || 'Family';
  }

  function toggle(familyId: string) {
    setSelectedIds((current) =>
      current.includes(familyId)
        ? current.filter((id) => id !== familyId)
        : [...current, familyId]
    );
  }

  async function handleFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files || []);
    const problems = (
      await Promise.all(picked.map((f) => validateAttachmentAsync(f, { allowVideo: true })))
    ).filter(Boolean);

    if (problems.length > 0) {
      setError(problems[0] as string);
    } else if (files.length + picked.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setError(`Up to ${MAX_ATTACHMENTS_PER_MESSAGE} photos at a time.`);
    } else {
      setError('');
      setFiles((current) => [...current, ...picked]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (selectedIds.length === 0) return;
    if (files.length === 0 && !text.trim()) return;

    setError('');
    setResults(null);

    const targets = families
      .filter((family) => selectedIds.includes(family.id))
      .map((family) => ({ familyId: family.id, familyName: familyLabel(family) }));

    const outcome = await broadcastPhotosToFamilies({
      targets,
      files,
      text,
      sender: currentUser,
      daycareId,
      onProgress: setProgress,
    });

    setProgress(null);
    setResults(outcome);

    // Fire-and-forget, one per family that actually received the photos. A
    // failed email must never look like a failed send.
    for (const result of outcome.filter((r) => r.ok)) {
      void notifyParentsOfStaffMessage({
        familyId: result.familyId,
        daycareId,
        senderName: currentUser.firstName || 'The daycare',
        text: text.trim(),
        photoCount: files.length,
      });
    }

    if (outcome.every((r) => r.ok)) {
      setFiles([]);
      setText('');
      setSelectedIds([]);
      onSent?.();
    } else {
      // Keep the photos and the caption loaded, and leave only the families
      // that failed selected, so Send retries exactly those.
      setSelectedIds(outcome.filter((r) => !r.ok).map((r) => r.familyId));
    }
  }

  const declining = selectedIds
    .map((id) => consentByFamily.get(id))
    .filter((status) => status && status.status !== 'allowed');

  return (
    <form onSubmit={handleSend} className="bg-white rounded-lg shadow p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Send to several families</h3>
        <p className="text-sm text-gray-600 mt-1">
          Photos, a note, or both. Each family gets this in their own
          conversation — they can reply to you privately, and they cannot see
          who else received it.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Families ({selectedIds.length} selected)
          </label>
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={() =>
              setSelectedIds(
                selectedIds.length === families.length ? [] : families.map((f) => f.id)
              )
            }
          >
            {selectedIds.length === families.length ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y">
          {families.map((family) => {
            const status = consentByFamily.get(family.id);
            return (
              <label
                key={family.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(family.id)}
                  onChange={() => toggle(family.id)}
                  disabled={sending}
                  className="w-4 h-4"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-gray-900 truncate">
                    {familyLabel(family)}
                  </span>
                  {status && status.childNames.length > 0 && (
                    <span className="block text-xs text-gray-500 truncate">
                      {status.childNames.join(', ')}
                    </span>
                  )}
                </span>
                {status && status.status !== 'allowed' && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                    {status.status === 'declined' ? 'no photos' : 'no answer'}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => void handleFilesPicked(e)}
          disabled={sending}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
        />
        <div className="mt-3">
          <AttachmentPreview
            files={files}
            onRemove={(index) =>
              setFiles((current) => current.filter((_, i) => i !== index))
            }
          />
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message — or attach photos above, or both"
        rows={2}
        disabled={sending}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
      />

      {declining.length > 0 && files.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
          <strong>Check before sending.</strong> These families have not agreed
          to photos of their children being shared:{' '}
          {declining.map((s) => s!.childNames.join(', ') || s!.familyName).join('; ')}.
          Sending them a photo of their own child is fine — the concern is a
          photo of their child going to everyone else.
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {progress && (
        <div className="text-sm text-gray-700">
          Sending to {progress.current || '…'} ({progress.done} of {progress.total} done)
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {results && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            results.every((r) => r.ok)
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {results.every((r) => r.ok) ? (
            <>Sent to {results.length} {results.length === 1 ? 'family' : 'families'}.</>
          ) : (
            <>
              Sent to {results.filter((r) => r.ok).length} of {results.length}.
              Failed: {results.filter((r) => !r.ok).map((r) => r.familyName).join(', ')}.
              Those families are still selected — press Send to try them again.
            </>
          )}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={sending}
        disabled={
          sending ||
          selectedIds.length === 0 ||
          (files.length === 0 && !text.trim())
        }
      >
        Send to {selectedIds.length} {selectedIds.length === 1 ? 'family' : 'families'}
      </Button>
    </form>
  );
}
