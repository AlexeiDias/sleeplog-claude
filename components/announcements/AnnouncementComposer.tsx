//components/announcements/AnnouncementComposer.tsx
'use client';

import { useState, useRef, FormEvent } from 'react';
import { User } from '@/types';
import { postAnnouncement } from '@/lib/announcements';
import { validateAttachment, MAX_ATTACHMENTS_PER_MESSAGE } from '@/lib/messaging';
import Button from '@/components/Button';

export default function AnnouncementComposer({ author }: { author: User }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [allowReplies, setAllowReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    for (const file of selected) {
      const problem = validateAttachment(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setFiles([...files, ...selected].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    setSending(true);
    setError('');
    setNotice('');

    try {
      await postAnnouncement({ author, text, files, allowReplies });
      setText('');
      setFiles([]);
      setAllowReplies(false);
      setNotice('Posted. Every family with portal access can see it now.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Could not post announcement:', err);
      setError(`Could not post.${code ? ` (${code})` : ''}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-800">New announcement</h3>
        <p className="text-xs text-gray-500">
          Goes to every family with portal access. Photos here are seen by all
          families — make sure you have consent for any child who appears.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {notice}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Field trip Friday, please pack a hat…"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 text-xs bg-gray-100 rounded-full pl-3 pr-2 py-1"
            >
              <span className="truncate max-w-[160px]">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="text-gray-500 hover:text-gray-800"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
            id="announcement-photos"
          />
          <label
            htmlFor="announcement-photos"
            className="cursor-pointer px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
          >
            📷 Add photos
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowReplies}
              onChange={(e) => setAllowReplies(e.target.checked)}
              className="w-4 h-4"
            />
            Allow replies
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={sending}
          disabled={!text.trim() && files.length === 0}
        >
          Post
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        With replies off, parents can still react with an emoji, and anything
        they want to say comes to you as a private message.
      </p>
    </form>
  );
}
