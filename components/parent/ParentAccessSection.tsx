//components/parent/ParentAccessSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, deleteDoc, updateDoc, setDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Button from '@/components/Button';
import { Family, User } from '@/types';
import {
  inviteDocId,
  parentActionCodeSettings,
  friendlyAuthError,
} from '@/lib/parentAuth';

interface ParentAccessSectionProps {
  family: Family;
  admin: User;
}

interface ParentAccount {
  uid: string;
  email: string;
}

interface InviteRow {
  id: string; // lowercased email — the document ID
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
}

export default function ParentAccessSection({
  family,
  admin,
}: ParentAccessSectionProps) {
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Single-field equality filters only. A compound query here
      // (familyId + role) can require a composite index that does not exist in
      // this project, and the resulting failure looks identical to a rules
      // denial. Role is filtered client-side instead.
      const [userSnap, inviteSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'users'),
          where('familyId', '==', family.id)
        )),
        getDocs(query(
          collection(db, 'parentInvites'),
          where('familyId', '==', family.id)
        )),
      ]);

      setParents(userSnap.docs
        .filter((d) => d.data().role === 'parent')
        .map((d) => ({
          uid: d.id,
          email: d.data().email || '(no email on record)',
        })));

      setInvites(inviteSnap.docs.map((d) => ({
        id: d.id,
        email: d.data().email || d.id,
        status: d.data().status || 'pending',
      })));
    } catch (err) {
      console.error('Error loading parent access:', err);
      // Surface the real Firestore code — "permission-denied" and
      // "failed-precondition" (missing index) need completely different fixes,
      // and a generic message hides which one happened.
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;
      setError(
        `Could not load parent access for this family.${code ? ` (${code})` : ''}` +
        `${message ? ` — ${message}` : ''}`
      );
    } finally {
      setLoading(false);
    }
  }, [family.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Revoking deletes the parent's user document — that document is what grants
  // access — AND marks the invite revoked. Without the second step the parent
  // could sign in again with a new magic link and the invite would rebuild
  // their access.
  async function handleRevoke(parent: ParentAccount) {
    const confirmed = confirm(
      `Remove portal access for ${parent.email}?\n\n` +
      `They will be signed out and will not be able to sign in again unless you invite them once more. ` +
      `No care records are deleted.`
    );
    if (!confirmed) return;

    setBusy(parent.uid);
    setError('');
    setNotice('');

    try {
      await deleteDoc(doc(db, 'users', parent.uid));

      const inviteRef = doc(db, 'parentInvites', inviteDocId(parent.email));
      const matching = invites.find((i) => i.id === inviteDocId(parent.email));
      if (matching) {
        await updateDoc(inviteRef, { status: 'revoked' });
      }

      setNotice(`Access removed for ${parent.email}.`);
      await load();
    } catch (err) {
      console.error('Error revoking parent access:', err);
      setError('Could not remove access. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleCancelInvite(invite: InviteRow) {
    const confirmed = confirm(`Cancel the invitation for ${invite.email}?`);
    if (!confirmed) return;

    setBusy(invite.id);
    setError('');
    setNotice('');

    try {
      await deleteDoc(doc(db, 'parentInvites', invite.id));
      setNotice(`Invitation cancelled for ${invite.email}.`);
      await load();
    } catch (err) {
      console.error('Error cancelling invite:', err);
      setError('Could not cancel the invitation. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleResend(invite: InviteRow) {
    setBusy(invite.id);
    setError('');
    setNotice('');

    try {
      // Reset to pending so a previously revoked or completed invite can be
      // redeemed again by whoever receives the new link.
      await setDoc(doc(db, 'parentInvites', invite.id), {
        email: invite.email,
        familyId: family.id,
        daycareId: family.daycareId,
        invitedBy: admin.uid,
        invitedByName:
          [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email,
        status: 'pending',
        createdAt: new Date(),
      });

      await sendSignInLinkToEmail(
        auth,
        invite.email,
        parentActionCodeSettings(window.location.origin)
      );

      setNotice(`New sign-in link sent to ${invite.email}.`);
      await load();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error resending invite:', err);
      setError(
        code?.startsWith('auth/')
          ? friendlyAuthError(code)
          : 'Could not resend the invitation. Please try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  const statusChip = (status: InviteRow['status']) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      revoked: 'bg-gray-200 text-gray-600',
    }[status];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles}`}>
        {status}
      </span>
    );
  };

  // Invites that have no corresponding active parent account.
  const parentEmails = new Set(parents.map((p) => inviteDocId(p.email)));
  const looseInvites = invites.filter((i) => !parentEmails.has(i.id));

  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="font-medium text-gray-700 mb-2">Parent portal access</h4>

      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? null : parents.length === 0 && looseInvites.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No parent has portal access to this family yet.
        </p>
      ) : (
        <div className="space-y-2">
          {parents.map((parent) => (
            <div
              key={parent.uid}
              className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{parent.email}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  active
                </span>
              </div>
              <Button
                variant="danger"
                className="text-sm shrink-0"
                isLoading={busy === parent.uid}
                onClick={() => handleRevoke(parent)}
              >
                Revoke
              </Button>
            </div>
          ))}

          {looseInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{invite.email}</p>
                {statusChip(invite.status)}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="secondary"
                  className="text-sm"
                  isLoading={busy === invite.id}
                  onClick={() => handleResend(invite)}
                >
                  Resend
                </Button>
                <Button
                  variant="danger"
                  className="text-sm"
                  isLoading={busy === invite.id}
                  onClick={() => handleCancelInvite(invite)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
