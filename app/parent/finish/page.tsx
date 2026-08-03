//app/parent/finish/page.tsx
'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';
import {
  EMAIL_FOR_SIGNIN_KEY,
  inviteDocId,
  friendlyAuthError,
} from '@/lib/parentAuth';

type Phase = 'checking' | 'needs-email' | 'working' | 'error';

export default function ParentFinishPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [error, setError] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const completeSignIn = useCallback(
    async (email: string) => {
      setPhase('working');
      setError('');

      try {
        const credential = await signInWithEmailLink(
          auth,
          email,
          window.location.href
        );
        window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);

        const uid = credential.user.uid;
        // Prefer the address Firebase resolved for this account over whatever
        // was typed, so the invite lookup matches the auth token exactly.
        const authEmail = credential.user.email || email;

        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // Existing account — send them wherever their role belongs.
          const role = userSnap.data().role;
          router.replace(role === 'parent' ? '/parent' : '/dashboard');
          return;
        }

        // No user document yet. The invite — not the email link — is what
        // authorizes parent access, so it must exist and be usable.
        const inviteRef = doc(db, 'parentInvites', inviteDocId(authEmail));
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          await signOut(auth);
          setPhase('error');
          setError(
            'We could not find an invitation for this email address. Please ask your daycare to send you one.'
          );
          return;
        }

        const invite = inviteSnap.data();

        if (invite.status !== 'pending' && invite.acceptedBy !== uid) {
          await signOut(auth);
          setPhase('error');
          setError(
            'This invitation has already been used. Please ask your daycare to send a new one.'
          );
          return;
        }

        await setDoc(userRef, {
          email: authEmail,
          role: 'parent',
          familyId: invite.familyId,
          daycareId: invite.daycareId,
          createdAt: new Date(),
        });

        // Best-effort bookkeeping — if this fails the parent is still signed in
        // and their user document already grants access.
        try {
          await updateDoc(inviteRef, {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: uid,
          });
        } catch (markErr) {
          console.error('Could not mark invite as accepted:', markErr);
        }

        router.replace('/parent');
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        console.error('Parent sign-in completion error:', err);
        setPhase('error');
        setError(friendlyAuthError(code));
      }
    },
    [router]
  );

  useEffect(() => {
    // This has to run in an effect rather than during render: the decision
    // depends on window.location and localStorage, neither of which exists
    // during server rendering.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setPhase('error');
      setError(
        'This page can only be opened from a sign-in link sent to your email.'
      );
      return;
    }

    const storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);

    if (storedEmail) {
      completeSignIn(storedEmail);
    } else {
      // Link was opened in a different browser or device than it was requested
      // from, so localStorage has nothing. Firebase requires the email to be
      // re-entered here rather than read from the URL.
      setPhase('needs-email');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [completeSignIn]);

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    completeSignIn(emailInput.trim());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">LogginCare</h1>
          <p className="text-gray-600">Parent sign-in</p>
        </div>

        {(phase === 'checking' || phase === 'working') && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Signing you in…</p>
          </div>
        )}

        {phase === 'needs-email' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Please confirm the email address this link was sent to. We ask again
              because the link was opened in a different browser than it was
              requested from.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <Input
                label="Email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Button type="submit" variant="primary" className="w-full">
                Continue
              </Button>
            </form>
          </>
        )}

        {phase === 'error' && (
          <div className="text-center">
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
            <Link
              href="/parent/login"
              className="text-blue-600 hover:underline font-medium text-sm"
            >
              Request a new sign-in link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
