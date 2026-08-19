//lib/photoBroadcast.ts
// Sending the same photos into several families' private threads at once.
//
// Deliberately NOT an announcement: each family receives an ordinary message in
// their own thread, so a parent replies privately and sees nothing to suggest
// anyone else got the same picture.
//
// Each family gets its own upload. Storage paths are family-scoped
// (messages/{familyId}/...), and reusing one family's path in another family's
// message would put a file outside the rules that are supposed to cover it. The
// cost is one upload per family per photo, which is why this reports progress
// and can be retried per family rather than all-or-nothing.

import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { attachmentPath, displayName } from '@/lib/messaging';
import { MessageAttachment, User } from '@/types';

export interface BroadcastTarget {
  familyId: string;
  familyName: string;
}

export interface BroadcastResult {
  familyId: string;
  familyName: string;
  ok: boolean;
  error?: string;
}

export interface BroadcastProgress {
  /** Families finished so far, successful or not. */
  done: number;
  total: number;
  /** Family currently being sent to. */
  current: string;
}

/**
 * Send `files` and `text` to each target family's own thread.
 *
 * Never throws for a single family's failure: one bad upload must not lose the
 * sends that already succeeded, and the caller needs to know exactly which
 * families to retry.
 */
export async function broadcastPhotosToFamilies({
  targets,
  files,
  text,
  sender,
  daycareId,
  onProgress,
}: {
  targets: BroadcastTarget[];
  files: File[];
  text: string;
  sender: User;
  daycareId: string;
  onProgress?: (progress: BroadcastProgress) => void;
}): Promise<BroadcastResult[]> {
  const results: BroadcastResult[] = [];
  const senderName = displayName(sender);
  const caption = text.trim();

  for (const [index, target] of targets.entries()) {
    onProgress?.({ done: index, total: targets.length, current: target.familyName });

    try {
      await sendToOneFamily({ target, files, caption, sender, senderName, daycareId });
      results.push({ familyId: target.familyId, familyName: target.familyName, ok: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error(`Broadcast to ${target.familyName} failed:`, err);
      results.push({
        familyId: target.familyId,
        familyName: target.familyName,
        ok: false,
        error: code || 'unknown error',
      });
    }
  }

  onProgress?.({ done: targets.length, total: targets.length, current: '' });
  return results;
}

async function sendToOneFamily({
  target,
  files,
  caption,
  sender,
  senderName,
  daycareId,
}: {
  target: BroadcastTarget;
  files: File[];
  caption: string;
  sender: User;
  senderName: string;
  daycareId: string;
}): Promise<void> {
  const { familyId } = target;

  // Reserve the ID first so attachment paths can include it — same shape as a
  // single-thread send, so these messages are indistinguishable from ordinary
  // ones once they land.
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

  await setDoc(
    doc(db, 'messageThreads', familyId),
    {
      familyId,
      daycareId,
      lastMessageAt: serverTimestamp(),
      lastMessagePreview:
        caption.slice(0, 120) ||
        `${attachments.length} photo${attachments.length === 1 ? '' : 's'}`,
      lastMessageSenderRole: 'staff',
      createdAt: serverTimestamp(),
      // Stamp our own read marker so these do not come back as unread to staff.
      lastReadByStaffAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(messageRef, {
    familyId,
    senderId: sender.uid,
    senderRole: 'staff',
    senderName,
    text: caption,
    attachments,
    createdAt: serverTimestamp(),
  });

  // Index each photo so the family's media gallery is still a single query.
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
      caption: caption.slice(0, 200),
      uploadedBy: sender.uid,
      uploadedByRole: 'staff',
      uploadedByName: senderName,
      createdAt: serverTimestamp(),
    });
  }
}
