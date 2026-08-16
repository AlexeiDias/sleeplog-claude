//components/messaging/MessageThreadView.tsx
'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  collection, doc, query, orderBy, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Message, MessageAttachment, User } from '@/types';
import Button from '@/components/Button';
import AttachmentPreview from '@/components/AttachmentPreview';
import {
  attachmentPath, displayName, formatMessageTime, toDate,
  validateAttachment, MAX_ATTACHMENTS_PER_MESSAGE,
} from '@/lib/messaging';
import {
  notifyDaycareOfParentMessage,
  notifyParentsOfStaffMessage,
} from '@/lib/messageNotifications';

interface MessageThreadViewProps {
  familyId: string;
  daycareId: string;
  currentUser: User;
  /** 'parent' or 'staff' — determines how messages are aligned and labelled. */
  viewerRole: 'parent' | 'staff';
  emptyHint?: string;
}

export default function MessageThreadView({
  familyId,
  daycareId,
  currentUser,
  viewerRole,
  emptyHint,
}: MessageThreadViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Real-time so both sides see messages appear without refreshing. The
    // thread ID is the familyId, so this path alone is enough for the rules
    // to authorize the read.
    const q = query(
      collection(db, 'messageThreads', familyId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
        })) as Message[]);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('Message thread error:', err);
        setError(`Could not load messages. (${err.code})`);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [familyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark this side's thread as read whenever it is open and messages change.
  //
  // Safe against loops: this writes to the thread document, while the listener
  // above watches the messages subcollection, so the write cannot retrigger it.
  useEffect(() => {
    if (loading || messages.length === 0) return;

    const field = viewerRole === 'parent' ? 'lastReadByParentAt' : 'lastReadByStaffAt';

    setDoc(
      doc(db, 'messageThreads', familyId),
      { familyId, daycareId, [field]: serverTimestamp() },
      { merge: true }
    ).catch((err) => {
      // Read state is a convenience, not a record. Never surface this.
      console.error('Could not mark thread read:', err);
    });
  }, [familyId, daycareId, viewerRole, loading, messages.length]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    for (const file of selected) {
      const problem = validateAttachment(file);
      if (problem) {
        setError(problem);
        return;
      }
    }

    const combined = [...files, ...selected].slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
    setFiles(combined);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    setSending(true);
    setError('');

    try {
      // Reserve the ID first so attachment paths can include it.
      const messageRef = doc(collection(db, 'messageThreads', familyId, 'messages'));
      const messageId = messageRef.id;

      const attachments: MessageAttachment[] = [];
      for (const file of files) {
        const path = attachmentPath(familyId, messageId, file.name);
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        attachments.push({
          path,
          url,
          contentType: file.type,
          size: file.size,
          fileName: file.name,
        });
      }

      const senderName = displayName(currentUser);

      // Thread summary first: the message rules do not depend on the thread
      // document existing, but the thread list does.
      await setDoc(
        doc(db, 'messageThreads', familyId),
        {
          familyId,
          daycareId,
          lastMessageAt: serverTimestamp(),
          lastMessagePreview:
            text.trim().slice(0, 120) ||
            `${attachments.length} photo${attachments.length === 1 ? '' : 's'}`,
          lastMessageSenderRole: viewerRole,
          createdAt: serverTimestamp(),
          // Stamp the sender's own read marker, so your message never shows as
          // unread to you.
          [viewerRole === 'parent' ? 'lastReadByParentAt' : 'lastReadByStaffAt']:
            serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(messageRef, {
        familyId,
        senderId: currentUser.uid,
        senderRole: viewerRole,
        senderName,
        text: text.trim(),
        attachments,
        createdAt: serverTimestamp(),
      });

      // Index each photo so the media gallery is a single query.
      for (const attachment of attachments) {
        await setDoc(doc(collection(db, 'media')), {
          familyId,
          daycareId,
          path: attachment.path,
          url: attachment.url,
          contentType: attachment.contentType,
          size: attachment.size,
          fileName: attachment.fileName,
          source: 'message',
          sourceId: messageId,
          caption: text.trim().slice(0, 200),
          uploadedBy: currentUser.uid,
          uploadedByRole: viewerRole,
          uploadedByName: senderName,
          createdAt: serverTimestamp(),
        });
      }

      const sentText = text.trim();
      const photoCount = attachments.length;

      setText('');
      setFiles([]);

      // Fire-and-forget. The message is already saved; a failed email must not
      // surface as a failed send or the user will resend a message that went
      // through fine.
      if (viewerRole === 'parent') {
        void notifyDaycareOfParentMessage({
          daycareId,
          senderName,
          text: sentText,
          photoCount,
        });
      } else {
        void notifyParentsOfStaffMessage({
          familyId,
          daycareId,
          senderName,
          text: sentText,
          photoCount,
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error sending message:', err);
      setError(`Could not send.${code ? ` (${code})` : ''}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[280px]">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {emptyHint || 'No messages yet. Say hello.'}
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderRole === viewerRole;
            return (
              <div
                key={message.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    mine
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {!mine && (
                    <p className="text-xs font-medium mb-1 text-gray-500">
                      {message.senderName}
                    </p>
                  )}

                  {message.attachments && message.attachments.length > 0 && (
                    <div
                      className={`grid gap-2 mb-2 ${
                        message.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.path}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.url}
                            alt={attachment.fileName}
                            className="rounded w-full object-cover max-h-56"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {message.text && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.text}
                    </p>
                  )}

                  <p
                    className={`text-[11px] mt-1 ${
                      mine ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="px-4 pt-3 border-t">
          <AttachmentPreview
            files={files}
            onRemove={(index) => setFiles(files.filter((_, i) => i !== index))}
          />
        </div>
      )}

      <div className="px-3 pt-2 bg-white border-t">
        <p className="text-[11px] text-gray-400">
          Photos only. To send a document, please contact the daycare directly —
          secure document sharing is coming.
        </p>
      </div>

      <form onSubmit={handleSend} className="p-3 pt-2 bg-white flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          id={`attach-${familyId}`}
        />
        <label
          htmlFor={`attach-${familyId}`}
          className="cursor-pointer px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0"
          title="Attach photos"
        >
          📷
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          rows={1}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={sending}
          disabled={!text.trim() && files.length === 0}
          className="shrink-0"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
