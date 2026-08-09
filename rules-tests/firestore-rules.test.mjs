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
import { fileURLToPath } from 'url';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
} from 'firebase/firestore';

// Resolved relative to THIS file, not the working directory — the emulator is
// launched from the repo root so that firebase-tools can see firestore.rules.
const RULES_PATH = fileURLToPath(new URL('../firestore.rules', import.meta.url));

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
    rules: readFileSync(RULES_PATH, 'utf8'),
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
  // Separate staff account used only by the "admin removes staff" test, so it
  // does not strip daycareId from staff_uid and break later staff assertions.
  await setDoc(doc(db, 'users', 'staff_removable_uid'), {
    email: 'removable@lsd.com', role: 'staff', daycareId: DAYCARE, initials: 'RM',
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
    await setDoc(doc(db, 'children', child, 'careLogs', DATE, 'entries', 'e1'), {
      type: 'bottle', amount: 4, staffInitials: 'TD',
    });
    await setDoc(doc(db, 'children', child, 'incidentLogs', DATE, 'entries', 'e1'), {
      type: 'injury', description: 'scraped knee', staffInitials: 'TD',
    });
  }
  await setDoc(doc(db, 'families', FAMILY_A), {
    daycareId: DAYCARE, motherName: 'Mother A', motherEmail: 'parenta@x.com',
  });
  await setDoc(doc(db, 'daycares', DAYCARE, 'activitySettings', 'config'), {
    enabled: true, categories: [],
  });
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

await check('profile', 'parent CAN record hasPassword on their own profile', 'allow', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'users', 'parentA_uid'),
    { hasPassword: true }));

await check('profile', 'parent CANNOT set hasPassword on another user', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'users', 'staff_uid'),
    { hasPassword: true }));

await check('profile', 'admin can clear a staff daycareId (remove staff)', 'allow', () =>
  updateDoc(doc(as('admin_uid', 'admin@lsd.com'), 'users', 'staff_removable_uid'),
    { daycareId: null }));

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
// Revocation — access must not rebuild itself
// ─────────────────────────────────────────────────────────────
await check('revoke', 'admin can delete a parent user doc (revoke)', 'allow', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', 'revokable_parent'), {
      email: 'revokable@x.com', role: 'parent', daycareId: DAYCARE, familyId: FAMILY_A,
    });
  });
  return deleteDoc(doc(as('admin_uid', 'admin@lsd.com'), 'users', 'revokable_parent'));
});

await check('revoke', 'admin can mark an invite revoked', 'allow', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'parentInvites', 'revoked@x.com'), {
      email: 'revoked@x.com', familyId: FAMILY_A, daycareId: DAYCARE,
      invitedBy: 'admin_uid', status: 'accepted', acceptedBy: 'revoked_uid',
    });
  });
  return updateDoc(doc(as('admin_uid', 'admin@lsd.com'), 'parentInvites', 'revoked@x.com'),
    { status: 'revoked' });
});

await check('revoke', 'revoked parent CANNOT rebuild their user doc', 'deny', () =>
  setDoc(doc(as('revoked_uid', 'revoked@x.com'), 'users', 'revoked_uid'),
    { email: 'revoked@x.com', role: 'parent', familyId: FAMILY_A, daycareId: DAYCARE }));

await check('revoke', 'accepted parent CAN rebuild their own user doc', 'allow', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'parentInvites', 'rebuild@x.com'), {
      email: 'rebuild@x.com', familyId: FAMILY_A, daycareId: DAYCARE,
      invitedBy: 'admin_uid', status: 'accepted', acceptedBy: 'rebuild_uid',
    });
  });
  return setDoc(doc(as('rebuild_uid', 'rebuild@x.com'), 'users', 'rebuild_uid'),
    { email: 'rebuild@x.com', role: 'parent', familyId: FAMILY_A, daycareId: DAYCARE });
});

await check('revoke', 'another account CANNOT use an accepted invite', 'deny', () =>
  setDoc(doc(as('thief_uid', 'rebuild@x.com'), 'users', 'thief_uid'),
    { email: 'rebuild@x.com', role: 'parent', familyId: FAMILY_A, daycareId: DAYCARE }));

await check('revoke', 'admin can delete an invite (cancel)', 'allow', () =>
  deleteDoc(doc(as('admin_uid', 'admin@lsd.com'), 'parentInvites', 'newkid2@x.com')));

await check('revoke', 'parent CANNOT revoke another parent', 'deny', () =>
  deleteDoc(doc(as('parentA_uid', 'parenta@x.com'), 'users', 'parentA_uid')));

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

await check('parent-scope', 'parent CANNOT write to OWN child care logs', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_A, 'careLogs', DATE, 'entries', 'forged'), { type: 'bottle', amount: 4 }));

await check('parent-scope', 'parent CANNOT read another family care logs', 'deny', () =>
  getDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_B, 'careLogs', DATE, 'entries', 'e1')));

await check('parent-scope', 'parent CANNOT read another family incident logs', 'deny', () =>
  getDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'children', CHILD_B, 'incidentLogs', DATE, 'entries', 'e1')));

await check('parent-scope', 'parent CANNOT edit a child record', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'children', CHILD_A), { name: 'Renamed' }));

await check('parent-scope', 'parent CANNOT create a child', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'), 'children', 'child_forged'),
    { name: 'Forged', familyId: FAMILY_A, daycareId: DAYCARE }));

await check('parent-scope', 'parent CANNOT edit a family record', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'families', FAMILY_A), { motherName: 'Changed' }));

await check('parent-scope', 'parent CANNOT read daycare activity settings', 'deny', () =>
  getDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'daycares', DAYCARE, 'activitySettings', 'config')));

await check('parent-scope', 'staff CAN still read child logs (no regression)', 'allow', () =>
  getDoc(doc(as('staff_uid', 'staff@lsd.com'),
    'children', CHILD_A, 'sleepLogs', DATE, 'entries', 'e1')));

await check('parent-scope', 'staff CAN still write child logs (no regression)', 'allow', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'),
    'children', CHILD_A, 'careLogs', DATE, 'entries', 'staff_entry'),
    { type: 'bottle', amount: 4, staffInitials: 'ST' }));

// ─────────────────────────────────────────────────────────────
// LIST / query rules
//
// Firestore evaluates list rules against the QUERY, not its results: if the
// query's constraints cannot prove every possible match is readable, the whole
// query is denied — even when it would match nothing. get() assertions cannot
// catch this, which is how the Parent Access section shipped broken.
// ─────────────────────────────────────────────────────────────
await check('list', 'admin CAN list users constrained by daycareId', 'allow', () =>
  getDocs(query(collection(as('admin_uid', 'admin@lsd.com'), 'users'),
    where('daycareId', '==', DAYCARE))));

await check('list', 'admin CANNOT list users by familyId alone', 'deny', () =>
  getDocs(query(collection(as('admin_uid', 'admin@lsd.com'), 'users'),
    where('familyId', '==', FAMILY_A))));

await check('list', 'admin CAN list parentInvites constrained by daycareId', 'allow', () =>
  getDocs(query(collection(as('admin_uid', 'admin@lsd.com'), 'parentInvites'),
    where('daycareId', '==', DAYCARE))));

await check('list', 'admin CANNOT list parentInvites by familyId alone', 'deny', () =>
  getDocs(query(collection(as('admin_uid', 'admin@lsd.com'), 'parentInvites'),
    where('familyId', '==', FAMILY_A))));

await check('list', 'parent CANNOT list parentInvites', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'parentInvites'),
    where('daycareId', '==', DAYCARE))));

await check('list', 'parent CANNOT list all users in the daycare', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'users'),
    where('daycareId', '==', DAYCARE))));

await check('list', 'parent CAN still get their own invite', 'allow', () =>
  getDoc(doc(as('p_invited', 'invited@x.com'), 'parentInvites', 'invited@x.com')));

await check('list', 'parent CAN list their own family children', 'allow', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'children'),
    where('familyId', '==', FAMILY_A))));

// ─────────────────────────────────────────────────────────────
// MESSAGING — thread ID is the familyId, so rules authorize from the path
// ─────────────────────────────────────────────────────────────
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'messageThreads', FAMILY_A), {
    familyId: FAMILY_A, daycareId: DAYCARE, lastMessagePreview: 'hi',
  });
  await setDoc(doc(db, 'messageThreads', FAMILY_B), {
    familyId: FAMILY_B, daycareId: DAYCARE, lastMessagePreview: 'hi',
  });
  await setDoc(doc(db, 'messageThreads', FAMILY_A, 'messages', 'm1'), {
    familyId: FAMILY_A, senderId: 'staff_uid', senderRole: 'staff',
    senderName: 'Staff', text: 'Hello',
  });
  await setDoc(doc(db, 'messageThreads', FAMILY_B, 'messages', 'm1'), {
    familyId: FAMILY_B, senderId: 'staff_uid', senderRole: 'staff',
    senderName: 'Staff', text: 'Hello',
  });
  await setDoc(doc(db, 'media', 'media_a'), {
    familyId: FAMILY_A, daycareId: DAYCARE, source: 'message',
    uploadedBy: 'staff_uid', uploadedByRole: 'staff', url: 'x', path: 'x',
  });
  await setDoc(doc(db, 'media', 'media_b'), {
    familyId: FAMILY_B, daycareId: DAYCARE, source: 'message',
    uploadedBy: 'staff_uid', uploadedByRole: 'staff', url: 'x', path: 'x',
  });
});

await check('messaging', 'parent CAN read own family messages', 'allow', () =>
  getDocs(collection(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_A, 'messages')));

await check('messaging', 'parent CANNOT read another family messages', 'deny', () =>
  getDocs(collection(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_B, 'messages')));

await check('messaging', 'staff CAN read any family messages in daycare', 'allow', () =>
  getDocs(collection(as('staff_uid', 'staff@lsd.com'),
    'messageThreads', FAMILY_B, 'messages')));

await check('messaging', 'staff CAN list threads by daycareId', 'allow', () =>
  getDocs(query(collection(as('staff_uid', 'staff@lsd.com'), 'messageThreads'),
    where('daycareId', '==', DAYCARE))));

await check('messaging', 'parent CANNOT list all threads', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'messageThreads'),
    where('daycareId', '==', DAYCARE))));

await check('messaging', 'parent CAN send as parent in own thread', 'allow', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_A, 'messages', 'p_msg'),
    { familyId: FAMILY_A, senderId: 'parentA_uid', senderRole: 'parent',
      senderName: 'Parent A', text: 'Hi' }));

await check('messaging', 'parent CANNOT impersonate staff', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_A, 'messages', 'fake_staff'),
    { familyId: FAMILY_A, senderId: 'parentA_uid', senderRole: 'staff',
      senderName: 'Tais', text: 'Official notice' }));

await check('messaging', 'parent CANNOT forge another senderId', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_A, 'messages', 'forged_sender'),
    { familyId: FAMILY_A, senderId: 'staff_uid', senderRole: 'parent',
      senderName: 'Parent A', text: 'Hi' }));

await check('messaging', 'parent CANNOT post into another family thread', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'messageThreads', FAMILY_B, 'messages', 'intruder'),
    { familyId: FAMILY_B, senderId: 'parentA_uid', senderRole: 'parent',
      senderName: 'Parent A', text: 'Hi' }));

await check('messaging', 'parent CAN stamp their own read marker', 'allow', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'messageThreads', FAMILY_A),
    { lastReadByParentAt: new Date() }));

await check('messaging', 'parent CANNOT stamp the staff read marker', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'messageThreads', FAMILY_A),
    { lastReadByStaffAt: new Date() }));

await check('messaging', 'staff CAN stamp their own read marker', 'allow', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'), 'messageThreads', FAMILY_A),
    { lastReadByStaffAt: new Date() }));

await check('messaging', 'staff CANNOT stamp the parent read marker', 'deny', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'), 'messageThreads', FAMILY_A),
    { lastReadByParentAt: new Date() }));

await check('messaging', 'parent CANNOT touch another family thread', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'), 'messageThreads', FAMILY_B),
    { lastReadByParentAt: new Date() }));

await check('messaging', 'messages are immutable', 'deny', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'),
    'messageThreads', FAMILY_A, 'messages', 'm1'), { text: 'edited' }));

await check('messaging', 'staff CANNOT delete a message (admin only)', 'deny', () =>
  deleteDoc(doc(as('staff_uid', 'staff@lsd.com'),
    'messageThreads', FAMILY_A, 'messages', 'm1')));

// ─────────────────────────────────────────────────────────────
// MEDIA gallery
// ─────────────────────────────────────────────────────────────
await check('media', 'parent CAN list own family media', 'allow', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'media'),
    where('familyId', '==', FAMILY_A))));

await check('media', 'parent CANNOT list another family media', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'media'),
    where('familyId', '==', FAMILY_B))));

await check('media', 'parent CANNOT list all media in the daycare', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'media'),
    where('daycareId', '==', DAYCARE))));

await check('media', 'staff CAN list media by daycareId', 'allow', () =>
  getDocs(query(collection(as('staff_uid', 'staff@lsd.com'), 'media'),
    where('daycareId', '==', DAYCARE))));

await check('media', 'parent CAN add media to own family', 'allow', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'), 'media', 'parent_upload'),
    { familyId: FAMILY_A, daycareId: DAYCARE, source: 'message',
      uploadedBy: 'parentA_uid', uploadedByRole: 'parent', url: 'x', path: 'x' }));

await check('media', 'parent CANNOT add media to another family', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'), 'media', 'cross_family'),
    { familyId: FAMILY_B, daycareId: DAYCARE, source: 'message',
      uploadedBy: 'parentA_uid', uploadedByRole: 'parent', url: 'x', path: 'x' }));

await check('media', 'media is immutable', 'deny', () =>
  updateDoc(doc(as('staff_uid', 'staff@lsd.com'), 'media', 'media_a'),
    { caption: 'edited' }));

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS — daycare-wide by design, unlike everything else
// ─────────────────────────────────────────────────────────────
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'announcements', 'ann_open'), {
    daycareId: DAYCARE, authorId: 'staff_uid', authorName: 'Staff',
    text: 'Field trip Friday', allowReplies: true,
  });
  await setDoc(doc(db, 'announcements', 'ann_locked'), {
    daycareId: DAYCARE, authorId: 'staff_uid', authorName: 'Staff',
    text: 'Photos from today', allowReplies: false,
  });
  await setDoc(doc(db, 'announcements', 'ann_other'), {
    daycareId: 'daycare_someone_else', authorId: 'x', authorName: 'X',
    text: 'Not yours', allowReplies: true,
  });
});

await check('announce', 'parent CAN list announcements for their daycare', 'allow', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'announcements'),
    where('daycareId', '==', DAYCARE))));

await check('announce', 'parent CANNOT list another daycare announcements', 'deny', () =>
  getDocs(query(collection(as('parentA_uid', 'parenta@x.com'), 'announcements'),
    where('daycareId', '==', 'daycare_someone_else'))));

await check('announce', 'staff CAN post an announcement', 'allow', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'), 'announcements', 'ann_new'),
    { daycareId: DAYCARE, authorId: 'staff_uid', authorName: 'Staff',
      text: 'Hello', allowReplies: false }));

await check('announce', 'parent CANNOT post an announcement', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'), 'announcements', 'ann_parent'),
    { daycareId: DAYCARE, authorId: 'parentA_uid', authorName: 'Parent',
      text: 'Hello everyone', allowReplies: true }));

await check('announce', 'staff CANNOT forge another author', 'deny', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'), 'announcements', 'ann_forged'),
    { daycareId: DAYCARE, authorId: 'admin_uid', authorName: 'Admin',
      text: 'Hello', allowReplies: false }));

// --- reactions ---
await check('announce', 'parent CAN react with an allowed emoji', 'allow', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_locked', 'reactions', 'parentA_uid'),
    { emoji: '\u2764\uFE0F', byRole: 'parent', byName: 'Parent A' }));

await check('announce', 'parent CANNOT react with a disallowed emoji', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_locked', 'reactions', 'parentA_uid'),
    { emoji: '\u{1F4A9}', byRole: 'parent', byName: 'Parent A' }));

await check('announce', 'parent CANNOT react as someone else', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_locked', 'reactions', 'staff_uid'),
    { emoji: '\u{1F44D}', byRole: 'parent', byName: 'Parent A' }));

await check('announce', 'parent CAN list reactions to count them', 'allow', () =>
  getDocs(collection(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_locked', 'reactions')));

// --- replies ---
await check('announce', 'parent CAN reply when replies are allowed', 'allow', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_open', 'replies', 'r1'),
    { authorId: 'parentA_uid', authorName: 'Parent A', authorRole: 'parent', text: 'Yes!' }));

await check('announce', 'parent CANNOT reply when replies are off', 'deny', () =>
  setDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_locked', 'replies', 'r2'),
    { authorId: 'parentA_uid', authorName: 'Parent A', authorRole: 'parent', text: 'Cute!' }));

await check('announce', 'staff CAN reply even when replies are off', 'allow', () =>
  setDoc(doc(as('staff_uid', 'staff@lsd.com'),
    'announcements', 'ann_locked', 'replies', 'r3'),
    { authorId: 'staff_uid', authorName: 'Staff', authorRole: 'staff', text: 'Thanks' }));

await check('announce', 'replies are immutable', 'deny', () =>
  updateDoc(doc(as('parentA_uid', 'parenta@x.com'),
    'announcements', 'ann_open', 'replies', 'r1'), { text: 'edited' }));

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
