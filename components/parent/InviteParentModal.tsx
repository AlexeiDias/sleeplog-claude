//components/parent/InviteParentModal.tsx
'use client';

import { useState, FormEvent } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Family, User } from '@/types';
import {
  inviteDocId,
  parentActionCodeSettings,
  friendlyAuthError,
} from '@/lib/parentAuth';

interface InviteParentModalProps {
  family: Family;
  admin: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteParentModal({
  family,
  admin,
  isOpen,
  onClose,
}: InviteParentModalProps) {
  const [email, setEmail] = useState(
    family.motherEmail || family.fatherEmail || ''
  );
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = [family.motherEmail, family.fatherEmail].filter(
    (value): value is string => Boolean(value)
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = email.trim();

    try {
      // Write the invite BEFORE sending the link. The invite is what actually
      // grants parent access — the emailed link only proves the address works.
      await setDoc(doc(db, 'parentInvites', inviteDocId(cleanEmail)), {
        email: cleanEmail,
        familyId: family.id,
        daycareId: family.daycareId,
        invitedBy: admin.uid,
        invitedByName:
          [admin.firstName, admin.lastName].filter(Boolean).join(' ') ||
          admin.email,
        status: 'pending',
        createdAt: new Date(),
      });

      await sendSignInLinkToEmail(
        auth,
        cleanEmail,
        parentActionCodeSettings(window.location.origin)
      );

      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Error inviting parent:', err);
      setError(
        code?.startsWith('auth/')
          ? friendlyAuthError(code)
          : 'Could not save the invitation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setSent(false);
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite parent">
      {sent ? (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            <p className="font-medium mb-1">Invitation sent</p>
            <p>
              {email.trim()} will receive a sign-in link. They tap it once and
              they&apos;re in — no password to set up.
            </p>
          </div>
          <p className="text-xs text-gray-500">
            The link must be opened on a device where they can read that inbox.
            If it expires before they use it, send a new invitation.
          </p>
          <Button variant="secondary" onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-600 mb-4">
            The parent will get a sign-in link by email. They&apos;ll be able to
            view daily records for children in the{' '}
            <strong>{family.motherName || family.fatherName || 'this'}</strong>{' '}
            family only.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Parent email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="parent@example.com"
          />

          {suggestions.length > 0 && (
            <div className="-mt-2 mb-4 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setEmail(suggestion)}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="flex-1"
            >
              Send invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
