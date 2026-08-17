//app/parent/help/page.tsx
'use client';

import Link from 'next/link';

/**
 * Setup guide for parents.
 *
 * Public on purpose: a parent who cannot get in is exactly the parent who
 * needs this page, so it must not sit behind the sign-in it explains. Listed
 * in PUBLIC_PARENT_ROUTES in ParentShell.
 *
 * The printed handout points here, so the wording is kept in step with it.
 */

const STEPS = [
  {
    n: 1,
    title: 'Open the invitation on your phone',
    body: 'Your daycare sends an email with a sign-in link. Open that email on the phone you will use every day, and tap the link there. On an iPhone, make sure it opens in Safari.',
    note: 'If you are asked to type your email address again to confirm it, that is normal and expected.',
  },
  {
    n: 2,
    title: 'Set a password',
    body: 'Once you are in, go to Account and choose a password. It only takes a moment.',
    note: 'Do this before step 3. It is the step people skip, and it is the one that matters.',
  },
  {
    n: 3,
    title: 'Add the portal to your Home Screen',
    body: 'On an iPhone, tap the Share button at the bottom of Safari, scroll down, and tap "Add to Home Screen". On Android, open the browser menu and choose "Install app" or "Add to Home screen".',
    note: 'You now have an icon that opens straight to your child’s day.',
  },
  {
    n: 4,
    title: 'Open the icon and sign in with your password',
    body: 'The first time you open the icon it will ask you to sign in. Use your email address and the password you just set.',
    note: 'After that it stays signed in.',
  },
];

const STUCK = [
  {
    q: 'The app icon asks me to sign in and my email link does not work',
    a: 'Email links open in Safari, and the Home Screen app is separate from Safari, so a link cannot sign the icon in. Use your password instead. If you never set one, open loggincare.com in Safari, sign in with a link there, and set a password under Account.',
  },
  {
    q: 'It asked me to confirm my email address',
    a: 'Expected. It happens whenever a sign-in link is opened somewhere other than where it was requested, which is always the case for an invitation your daycare sent you.',
  },
  {
    q: 'I was signed out after not opening it for a while',
    a: 'That happens in Safari, not in the Home Screen app. Adding the icon to your Home Screen is what keeps you signed in.',
  },
  {
    q: 'Both parents want access',
    a: 'Ask your daycare to send a second invitation to the other parent’s email address. You each get your own sign-in.',
  },
  {
    q: 'I already had access and lost it',
    a: 'You do not need a new invitation. Sign in with the same email address you used before. If it says your access was removed, contact your daycare.',
  },
];

export default function ParentHelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">
          Setting up on your phone
        </h1>
        <p className="mt-2 text-gray-600">
          Four steps, about five minutes, once. After this the portal opens from
          an icon on your Home Screen and stays signed in.
        </p>

        <ol className="mt-8 space-y-4">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
            >
              <div className="flex gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                  {step.n}
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900">{step.title}</h2>
                  <p className="mt-1 text-gray-700">{step.body}</p>
                  <p className="mt-2 text-sm text-gray-500">{step.note}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>The order matters.</strong> If you add the icon to your Home
            Screen before setting a password, the icon cannot sign you in and
            email links will not help, because they open in Safari instead. Set
            the password first and you will not run into it.
          </p>
        </div>

        <h2 className="mt-10 text-xl font-bold text-gray-900">If you get stuck</h2>
        <div className="mt-4 space-y-3">
          {STUCK.map((item) => (
            <details
              key={item.q}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <summary className="font-medium text-gray-900 cursor-pointer">
                {item.q}
              </summary>
              <p className="mt-2 text-gray-700">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/parent/login"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Go to sign in
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Still stuck? Contact your daycare directly — they can resend your
          invitation or check your access.
        </p>
      </div>
    </div>
  );
}
