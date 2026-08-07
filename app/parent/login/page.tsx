//app/parent/login/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';
import {
  EMAIL_FOR_SIGNIN_KEY,
  parentActionCodeSettings,
  friendlyAuthError,
} from '@/lib/parentAuth';

export default function ParentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Inside an installed home-screen app, email links are useless: tapping one
    // in Mail opens Safari, which has separate storage, so the app itself stays
    // signed out. Default those users straight to password sign-in.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (standalone) setMode('password');
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'password') {
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // A revoked parent still has working Firebase credentials — revoking
        // deletes their user document, not their login. Without this check they
        // would sign in successfully and then be bounced back here with no
        // explanation, over and over.
        const profile = await getDoc(doc(db, 'users', credential.user.uid));

        if (!profile.exists()) {
          await signOut(auth);
          setError(
            'Your access to this portal has been removed. Please contact your daycare.'
          );
          return;
        }

        router.replace(profile.data().role === 'parent' ? '/parent' : '/dashboard');
        return;
      }

      await sendSignInLinkToEmail(
        auth,
        email.trim(),
        parentActionCodeSettings(window.location.origin)
      );

      // Remember the email so /parent/finish can complete sign-in without
      // asking again, as long as the link is opened on this same device.
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email.trim());
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('Parent sign-in error:', err);
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'That email and password do not match. If you have not set a password yet, use an email link instead.'
          : friendlyAuthError(code)
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">LogginCare</h1>
          <p className="text-gray-600">Parent sign-in</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <p className="font-medium mb-1">Check your email</p>
              <p>
                We sent a sign-in link to <strong>{email.trim()}</strong>. Tap the link
                on this device to sign in — no password needed.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setError('');
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                try a different email
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {mode === 'link'
                ? "Enter the email address your daycare has on file. We'll send you a secure sign-in link — there is no password to remember."
                : 'Enter your email and the password you set in the portal.'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />

              {mode === 'password' && (
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
              >
                {mode === 'link' ? 'Send sign-in link' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              {mode === 'link' ? (
                <>
                  Using the app icon on your Home Screen?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('password');
                      setError('');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Sign in with a password
                  </button>
                </>
              ) : (
                <>
                  No password yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('link');
                      setError('');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Email me a sign-in link
                  </button>
                </>
              )}
            </p>
          </>
        )}

        <p className="mt-6 text-center text-xs text-gray-500">
          Already have access? You do not need a new invitation — just sign in
          above with the same email address. If your daycare has not given you
          access yet, please contact them directly.
        </p>
      </div>
    </div>
  );
}
