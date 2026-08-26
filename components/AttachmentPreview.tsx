//components/AttachmentPreview.tsx
'use client';

import { useState, useEffect } from 'react';

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
  // Created inside the effect that revokes them, so the two always agree.
  //
  // These used to be derived with useMemo and revoked from a separate effect,
  // which breaks under React's development double-invoke: the effect mounts,
  // cleans up and revokes, then mounts again — but the memo does not recompute
  // for unchanged deps, so the component kept rendering URLs that had already
  // been revoked. Photos survived it because they had usually decoded by then;
  // a video loads later and failed with ERR_FILE_NOT_FOUND.
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = files.map((file) => URL.createObjectURL(file));
    // Creating and revoking must happen in the same effect, or the two get out
    // of step under development double-invoke — which is the bug this fixes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

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
