//components/AttachmentPreview.tsx
'use client';

import { useMemo, useEffect } from 'react';

/**
 * Thumbnails for files selected but not yet uploaded.
 *
 * Replaces a filename chip, which was useless for a photo taken with the
 * camera: those often arrive with a generic or empty name, so the chip showed
 * as a blank grey box with only a remove button.
 *
 * Object URLs are revoked when the selection changes, or every photo picked
 * during a session stays in memory until the page is closed.
 */
export default function AttachmentPreview({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  // Derived during render rather than set from an effect, so a thumbnail is
  // never one frame behind the file it belongs to.
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  // Revoke on unmount and whenever the list changes, or every photo picked in
  // a session stays in memory until the page closes.
  useEffect(() => {
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [urls]);

  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${file.size}-${index}`}
          className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
        >
          {urls[index] &&
            (file.type.startsWith('video/') ? (
              // muted + preload metadata renders the first frame as a still,
              // which is all a pre-upload thumbnail needs to be.
              <video
                src={urls[index]}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[index]}
                alt={file.name || 'Selected photo'}
                className="w-full h-full object-cover"
              />
            ))}
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${file.name || 'attachment'}`}
            className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center hover:bg-black/80"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
