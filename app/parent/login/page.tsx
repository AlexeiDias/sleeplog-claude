//app/parent/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/Button';
import Input from '@/components/Input';
import {
  EMAIL_FOR_SIGNIN_KEY,
  parentActionCodeSettings,
  friendlyAuthError,
} from '@/lib/parentAuth';

export default function ParentLoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
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
      console.error('Parent sign-in link error:', err);
      setError(friendlyAuthError(code));
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
              Enter the email address your daycare has on file. We&apos;ll send you a
              secure sign-in link — there is no password to remember.
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

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
              >
                Send sign-in link
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs text-gray-500">
          Access is granted by your daycare. If you have not been invited yet,
          please contact them directly.
        </p>
      </div>
    </div>
  );
}
