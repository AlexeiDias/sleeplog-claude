// Firestore security rules tests for LogginCare.
//
// Run with:   cd rules-tests && npm install && npm test
// Requires Java (the Firestore emulator is a .jar) and network access on the
// first run so the emulator can download.
//
// These tests run entirely against the local emulator. They never touch the
// real sleeplog-claude project and cannot affect production data.

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

const DAYCARE = 'daycare_lsd';
const FAMILY_A = 'family_a';
const FAMILY_B = 'family_b';
const CHILD_A = 'child_a';
const CHILD_B = 'child_b';
const DATE = '2026-08-03';

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-loggincare',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync('../firestore.rules', 'utf8'),
  },
});

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'daycares', DAYCARE), {
    name: 'Little Start Daycare',
    createdBy: 'admin_uid',
  });
  await setDoc(doc(db, 'users', 'admin_uid'), {
    email: 'admin@lsd.com', role: 'admin', daycareId: DAYCARE,
  });
  await setDoc(doc(db, 'users', 'staff_uid'), {
    email: 'staff@lsd.com', role: 'staff', daycareId: DAYCARE, initials: 'ST',
  });
  await setDoc(doc(db, 'users', 'parentA_uid'), {
    email: 'parenta@x.com', role: 'parent', daycareId: DAYCARE, familyId: FAMILY_A,
  });
  // An admin account that has signed up but not yet registered a daycare.
  await setDoc(doc(db, 'users', 'fresh_admin_uid'), {
    email: 'fresh@lsd.com', role: 'admin',
  });
  await setDoc(doc(db, 'children', CHILD_A), {
    name: 'Child A', familyId: FAMILY_A, daycareId: DAYCARE,
  });
  await setDoc(doc(db, 'children', CHILD_B), {
    name: 'Child B', familyId: FAMILY_B, daycareId: DAYCARE,
  });
  for (const child of [CHILD_A, CHILD_B]) {
    await setDoc(doc(db, 'children', child, 'sleepLogs', DATE, 'entries', 'e1'), {
      type: 'start', staffInitials: 'TD',
    });
  }
  await setDoc(doc(db, 'parentInvites', 'invited@x.com'), {
    email: 'invited@x.com', familyId: FAMILY_A, daycareId: DAYCARE,
    invitedBy: 'admin_uid', status: 'pending',
  });
  // A daycare owned by someone else, used to prove you cannot attach to it.
  await setDoc(doc(db, 'daycares', 'daycare_someone_else'), {
    name: 'Other Daycare', createdBy: 'someone_else_uid',
  });
});

const results = [];

async function check(group, name, expect, fn) {
  try {
    await (expect === 'allow' ? assertSucceeds(fn()) : assertFails(fn()));
    results.push({ status: 'PASS', group, name, expect });
  } catch (err) {
    results.push({ status: 'FAIL', group, name, expect, err: String(err).slice(0, 120) });
  }
}

const as = (uid, email) =>
  testEnv
    .authenticatedContext(uid, email ? { email, email_verified: true } : {})
    .firestore();

// ─────────────────────────────────────────────────────────────
// Privilege escalation — the reason this branch exists
// ─────────────────────────────────────────────────────────────
await check('escalation', 'stranger CANNOT self-assign admin of an existing daycare', 'deny', () =>
  setDoc(doc(as('attacker', 'attacker@evil.com'), 'users', 'attacker'),
    { email: 'attacker@evil.com', role: 'admin', daycareId: DAYCARE }));

await check('escalation', 'stranger CANNOT self-assign staff of an existing daycare', 'deny', () =>
  setDoc(doc(as('attacker2', 'attacker2@evil.com'), 'users', 'attacker2'),
    { email: 'attacker2@evil.com', role: 'staff', daycareId: DAYCARE }));

await check('escalation', 'staff CANNOT promote themselves to admin', 'deny', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'), 'users', 'staff_uid'), { role: 'admin' }));

await check('escalation', 'parent CANNOT promote themselves to staff', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'users', 'parentA_uid'), { role: 'staff' }));

await check('escalation', 'fresh admin CANNOT attach to a daycare they did not create', 'deny', () =>
  updateDoc(doc(as('fresh_admin_uid', 'fresh@lsd.com'), 'users', 'fresh_admin_uid'),
    { daycareId: DAYCARE }));

// ─────────────────────────────────────────────────────────────
// Registration flows that must keep working
// ─────────────────────────────────────────────────────────────
await check('signup', 'new owner can create admin doc with no daycareId', 'allow', () =>
  setDoc(doc(as('new_owner', 'owner@new.com'), 'users', 'new_owner'),
    { email: 'owner@new.com', role: 'admin', firstName: 'New', lastName: 'Owner' }));

await check('signup', 'owner can attach to a daycare they created', 'allow', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'daycares', 'daycare_mine'), {
      name: 'Mine', createdBy: 'fresh_admin_uid',
    });
  });
  return updateDoc(doc(as('fresh_admin_uid', 'fresh@lsd.com'), 'users', 'fresh_admin_uid'),
    { daycareId: 'daycare_mine' });
});

await check('staff', 'admin can create a staff account in their daycare', 'allow', () =>
  setDoc(doc(as('admin_uid', 'admin@lsd.com'), 'users', 'new_staff'),
    { email: 's@lsd.com', role: 'staff', daycareId: DAYCARE, initials: 'AB' }));

await check('staff', 'admin CANNOT create staff in another daycare', 'deny', () =>
  setDoc(doc(as('admin_uid', 'admin@lsd.com'), 'users', 'new_staff2'),
    { email: 's2@x.com', role: 'staff', daycareId: 'daycare_someone_else', initials: 'CD' }));

await check('staff', 'non-admin CANNOT create a staff account', 'deny', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'), 'users', 'new_staff3'),
    { email: 's3@lsd.com', role: 'staff', daycareId: DAYCARE, initials: 'EF' }));

await check('profile', 'user can update their own initials', 'allow', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'), 'users', 'staff_uid'), { initials: 'ZZ' }));

await check('profile', 'admin can clear a staff daycareId (remove staff)', 'allow', () =>
  updateDoc(doc(as('admin_uid', 'admin@lsd.com'), 'users', 'staff_uid'), { daycareId: null }));

// ─────────────────────────────────────────────────────────────
// Parent invite gate (Phase 1)
// ─────────────────────────────────────────────────────────────
await check('parent-invite', 'invited email can create their parent doc', 'allow', () =>
  setDoc(doc(as('p_new', 'invited@x.com'), 'users', 'p_new'),
    { email: 'invited@x.com', role: 'parent', familyId: FAMILY_A, daycareId: DAYCARE }));

await check('parent-invite', 'UNinvited email CANNOT create a parent doc', 'deny', () =>
  setDoc(doc(as('p_bad', 'stranger@x.com'), 'users', 'p_bad'),
    { email: 'stranger@x.com', role: 'parent', familyId: FAMILY_A, daycareId: DAYCARE }));

await check('parent-invite', 'invited email CANNOT claim a different family', 'deny', () =>
  setDoc(doc(as('p_bad2', 'invited@x.com'), 'users', 'p_bad2'),
    { email: 'invited@x.com', role: 'parent', familyId: FAMILY_B, daycareId: DAYCARE }));

await check('parent-invite', 'non-admin CANNOT create an invite', 'deny', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'), 'parentInvites', 'newkid@x.com'),
    { email: 'newkid@x.com', familyId: FAMILY_A, daycareId: DAYCARE, status: 'pending' }));

await check('parent-invite', 'admin can create an invite for their daycare', 'allow', () =>
  setDoc(doc(as('admin_uid', 'admin@lsd.com'), 'parentInvites', 'newkid2@x.com'),
    { email: 'newkid2@x.com', familyId: FAMILY_A, daycareId: DAYCARE,
      invitedBy: 'admin_uid', status: 'pending' }));

// ─────────────────────────────────────────────────────────────
// Parent data scoping
// ─────────────────────────────────────────────────────────────
await check('parent-scope', 'parent reads OWN child sleep logs', 'allow', () =>
  getDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_A, 'sleepLogs', DATE, 'entries', 'e1')));

await check('parent-scope', 'parent CANNOT read another family child logs', 'deny', () =>
  getDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_B, 'sleepLogs', DATE, 'entries', 'e1')));

await check('parent-scope', 'parent CANNOT write to child sleep logs', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_A, 'sleepLogs', DATE, 'entries', 'forged'), { type: 'start' }));

// ─────────────────────────────────────────────────────────────
// Kiosk paths that must stay public
// ─────────────────────────────────────────────────────────────
const anon = testEnv.unauthenticatedContext().firestore();

await check('kiosk', 'unauthenticated can read children', 'allow', () =>
  getDoc(doc(anon, 'children', CHILD_A)));

await check('kiosk', 'unauthenticated can create a signInOut record', 'allow', () =>
  setDoc(doc(anon, 'signInOut', 'rec1'),
    { childId: CHILD_A, daycareId: DAYCARE, type: 'sign-in', parentFullName: 'A Parent' }));

await check('kiosk', 'signInOut records are immutable', 'deny', () =>
  updateDoc(doc(anon, 'signInOut', 'rec1'), { parentFullName: 'Changed' }));

// ─────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────
const width = Math.max(...results.map((r) => r.name.length));
let lastGroup = '';
console.log('\n══════ LogginCare Firestore rules ══════\n');
for (const r of results) {
  if (r.group !== lastGroup) {
    console.log(`\n  ${r.group.toUpperCase()}`);
    lastGroup = r.group;
  }
  const mark = r.status === 'PASS' ? '✓' : '✗';
  console.log(`  ${mark} ${r.name.padEnd(width)}  (expected ${r.expect})`);
  if (r.err) console.log(`      ${r.err}`);
}
const failed = results.filter((r) => r.status === 'FAIL');
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);

await testEnv.cleanup();
process.exit(failed.length > 0 ? 1 : 0);
