//app/parent/layout.tsx
//
// Server component so it can export metadata. Its whole job is to point the
// parent section at its OWN web app manifest.
//
// The root manifest has start_url "/", which is right for staff but wrong for
// parents: a parent who adds the portal to their home screen would open the
// marketing landing page instead of their child's day. Worse, iOS home-screen
// web apps have storage isolated from Safari, so the app opens signed out —
// and tapping a magic link from Mail opens Safari, not the app, so the session
// can never get in. That combination produced a loop with no way out.
//
// A parent-scoped manifest fixes where the icon lands. Being able to sign in
// inside the app is handled separately, by letting parents set a password
// (see components/parent/SetPasswordCard.tsx).

import type { Metadata } from 'next';
import ParentShell from '@/components/parent/ParentShell';

export const metadata: Metadata = {
  title: 'LogginCare — Parent Portal',
  manifest: '/parent-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LogginCare',
  },
};

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ParentShell>{children}</ParentShell>;
}
