//lib/parentAuth.ts
// Shared helpers for the Parents Portal magic-link sign-in flow.

import { ActionCodeSettings } from 'firebase/auth';

// localStorage key used to carry the email address between requesting the
// sign-in link and completing sign-in on the same device.
export const EMAIL_FOR_SIGNIN_KEY = 'loggincare_parent_email';

// Parent invites are stored at parentInvites/{lowercased email} so that the
// Firestore security rules can look them up by request.auth.token.email.lower().
export function inviteDocId(email: string): string {
  return email.trim().toLowerCase();
}

// Where the magic link should land. Uses the current origin so the same code
// works on localhost, Vercel previews, and loggincare.com — but note that every
// origin used must be listed under Firebase Auth > Settings > Authorized domains.
export function parentActionCodeSettings(origin: string): ActionCodeSettings {
  return {
    url: `${origin}/parent/finish`,
    handleCodeInApp: true,
  };
}

// Local-time date key (YYYY-MM-DD), matching how logs are written elsewhere in
// the app. Deliberately NOT toISOString(), which is UTC and would land on the
// wrong day for evening entries in Pacific time.
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Turns a Firebase auth error code into something a parent can act on.
export function friendlyAuthError(code: string | undefined): string {
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Passwordless sign-in is not enabled for this app yet. Please contact your daycare.';
    case 'auth/invalid-email':
      return 'That does not look like a valid email address.';
    case 'auth/unauthorized-continue-uri':
      return 'This site is not authorized for sign-in links. Please contact your daycare.';
    case 'auth/invalid-action-code':
      return 'This sign-in link is no longer valid. It may have expired or already been used. Please request a new one.';
    case 'auth/expired-action-code':
      return 'This sign-in link has expired. Please request a new one.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
