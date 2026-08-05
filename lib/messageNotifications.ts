//lib/messageNotifications.ts
// Email notifications for new messages.
//
// Sent client-side through the existing /api/send-email route, the same way
// daily reports are sent. Deliberately fire-and-forget: a failed notification
// must never block or undo a message that was already written to Firestore.
// The message is the record; the email is a courtesy.

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const APP_URL = 'https://loggincare.com';

interface SendArgs {
  to: string;
  subject: string;
  htmlContent: string;
}

async function send({ to, subject, htmlContent }: SendArgs): Promise<void> {
  // Note the field name: this API expects `htmlContent`, not `html`.
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, htmlContent }),
  });

  if (!response.ok) {
    throw new Error(`send-email responded ${response.status}`);
  }
}

function wrap(title: string, body: string, cta: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
      <h2 style="color:#1e3a8a;margin:0 0 16px;">${title}</h2>
      ${body}
      <p style="margin:24px 0;">
        <a href="${APP_URL}${cta}"
           style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Open LogginCare
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;margin-top:24px;">
        You are receiving this because a message was sent through the LogginCare parent portal.
        Please do not reply to this email — replies are not monitored.
      </p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function previewBlock(senderName: string, text: string, photoCount: number): string {
  const parts: string[] = [];
  if (text.trim()) {
    parts.push(
      `<blockquote style="margin:0 0 12px;padding:12px 16px;background:#f3f4f6;border-left:3px solid #2563eb;border-radius:4px;">${escapeHtml(
        text.trim().slice(0, 300)
      )}</blockquote>`
    );
  }
  if (photoCount > 0) {
    parts.push(
      `<p style="margin:0 0 12px;color:#4b5563;">${photoCount} photo${
        photoCount === 1 ? '' : 's'
      } attached.</p>`
    );
  }
  return `<p style="margin:0 0 12px;"><strong>${escapeHtml(
    senderName
  )}</strong> sent a message:</p>${parts.join('')}`;
}

/**
 * A parent messaged the daycare — notify the daycare's contact address.
 * Without this, a parent message sits unseen unless staff happen to have the
 * Messages page open.
 */
export async function notifyDaycareOfParentMessage(opts: {
  daycareId: string;
  senderName: string;
  text: string;
  photoCount: number;
}): Promise<void> {
  try {
    const daycareSnap = await getDoc(doc(db, 'daycares', opts.daycareId));
    const email = daycareSnap.data()?.email;
    if (!email) return;

    await send({
      to: email,
      subject: `New message from ${opts.senderName}`,
      htmlContent: wrap(
        'New parent message',
        previewBlock(opts.senderName, opts.text, opts.photoCount),
        '/messages'
      ),
    });
  } catch (err) {
    console.error('Could not notify daycare of parent message:', err);
  }
}

/**
 * Staff messaged a family — notify every parent with portal access to it.
 */
export async function notifyParentsOfStaffMessage(opts: {
  familyId: string;
  daycareId: string;
  senderName: string;
  text: string;
  photoCount: number;
}): Promise<void> {
  try {
    // Constrained by daycareId so the list rule is provable; familyId and role
    // are filtered client-side. Querying by familyId alone would be rejected.
    const snapshot = await getDocs(query(
      collection(db, 'users'),
      where('daycareId', '==', opts.daycareId)
    ));

    const recipients = snapshot.docs
      .filter((d) => d.data().role === 'parent' && d.data().familyId === opts.familyId)
      .map((d) => d.data().email)
      .filter((email): email is string => Boolean(email));

    if (recipients.length === 0) return;

    await send({
      to: recipients.join(','),
      subject: `New message from ${opts.senderName}`,
      htmlContent: wrap(
        'New message from your daycare',
        previewBlock(opts.senderName, opts.text, opts.photoCount),
        '/parent/messages'
      ),
    });
  } catch (err) {
    console.error('Could not notify parents of staff message:', err);
  }
}
