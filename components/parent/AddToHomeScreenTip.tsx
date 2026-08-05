//components/parent/AddToHomeScreenTip.tsx
'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'loggincare_a2hs_dismissed';

/**
 * Prompts iOS parents to add the portal to their home screen.
 *
 * This is not only convenience. Safari deletes script-writable storage —
 * including the Firebase auth session — after seven days in which the user
 * opens Safari without visiting the site. A home-screen web app is exempt from
 * that counter, so adding it is what keeps a parent signed in long-term.
 * Without it, a parent who does not visit for a week gets signed out and has to
 * request a fresh sign-in link.
 */
export default function AddToHomeScreenTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed — nothing to prompt.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) return;
    if (window.localStorage.getItem(DISMISSED_KEY)) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    // Only Safari can add to the home screen on iOS; Chrome and Firefox on iOS
    // cannot, so showing them these instructions would be misleading.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    // Has to run in an effect: the decision depends on userAgent, matchMedia
    // and localStorage, none of which exist during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIOS && isSafari) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-medium text-blue-900 mb-1">
            Add LogginCare to your Home Screen
          </p>
          <p className="text-blue-800">
            Tap the Share button{' '}
            <span aria-hidden="true">􀈂</span> at the bottom of Safari, then{' '}
            <strong>Add to Home Screen</strong>. It opens like an app, and keeps
            you signed in — otherwise Safari may sign you out after a week
            without visiting.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-blue-400 hover:text-blue-700 text-lg leading-none shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
