// Cloud Storage security rules tests for LogginCare.
//
// Run with:   cd rules-tests && npm run test:storage
//
// Storage rules are a SEPARATE ruleset from firestore.rules. The Firestore
// suite says nothing about who can read a child's photo.
//
// Known limitation being tested for honestly: Storage rules cannot read
// Firestore, so a parent currently cannot be distinguished from staff here.
// The assertions below encode what the rules actually guarantee today, not
// what we wish they guaranteed. When custom claims land, the "any signed-in
// user" assertions should be tightened and these tests updated with them.

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

const RULES_PATH = fileURLToPath(new URL('../storage.rules', import.meta.url));

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-loggincare',
  storage: {
    host: '127.0.0.1',
    port: 9199,
    rules: readFileSync(RULES_PATH, 'utf8'),
  },
});

const results = [];

async function check(group, name, expect, fn) {
  try {
    await (expect === 'allow' ? assertSucceeds(fn()) : assertFails(fn()));
    results.push({ status: 'PASS', group, name, expect });
  } catch (err) {
    results.push({ status: 'FAIL', group, name, expect, err: String(err).slice(0, 140) });
  }
}

const png = () =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const imageMeta = { contentType: 'image/png' };
const pdfMeta = { contentType: 'application/pdf' };

const staff = () => testEnv.authenticatedContext('staff_uid', {
  email: 'staff@lsd.com', email_verified: true,
}).storage();
const parent = () => testEnv.authenticatedContext('parent_uid', {
  email: 'parent@x.com', email_verified: true,
}).storage();
const anon = () => testEnv.unauthenticatedContext().storage();

// Seed one file with rules disabled so read assertions have something to fetch.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await uploadBytes(
    ref(ctx.storage(), 'children/child_a/photo_1.jpg'), png(), imageMeta);
  await uploadBytes(
    ref(ctx.storage(), 'incidents/child_a/2026-08-03/entry_1'), png(), imageMeta);
});

// ── Signed-out access ──────────────────────────────────────────
await check('anonymous', 'signed-out CANNOT read a child photo', 'deny', () =>
  getBytes(ref(anon(), 'children/child_a/photo_1.jpg')));

await check('anonymous', 'signed-out CANNOT upload a child photo', 'deny', () =>
  uploadBytes(ref(anon(), 'children/child_a/hack.jpg'), png(), imageMeta));

await check('anonymous', 'signed-out CANNOT read an incident photo', 'deny', () =>
  getBytes(ref(anon(), 'incidents/child_a/2026-08-03/entry_1')));

// ── Staff access (the working path) ────────────────────────────
await check('staff', 'staff CAN read a child photo', 'allow', () =>
  getBytes(ref(staff(), 'children/child_a/photo_1.jpg')));

await check('staff', 'staff CAN upload a child photo', 'allow', () =>
  uploadBytes(ref(staff(), 'children/child_a/photo_2.jpg'), png(), imageMeta));

await check('staff', 'staff CAN upload an incident photo', 'allow', () =>
  uploadBytes(ref(staff(), 'incidents/child_a/2026-08-03/entry_2'), png(), imageMeta));

// ── Content type and size constraints ──────────────────────────
await check('constraints', 'non-image upload to child photos is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'children/child_a/malware.pdf'), png(), pdfMeta));

await check('constraints', 'non-image upload to incidents is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'incidents/child_a/2026-08-03/doc.pdf'), png(), pdfMeta));

// Both paths cap at 5MB, matching the rules that were already live in the
// console before storage.rules existed in the repo.
const overSized = () => new Uint8Array(5 * 1024 * 1024 + 1024);

await check('constraints', 'child photo over 5MB is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'children/child_a/huge.jpg'), overSized(), imageMeta));

await check('constraints', 'incident photo over 5MB is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'incidents/child_a/2026-08-03/huge'), overSized(), imageMeta));

// ── Undeclared paths are denied by default ─────────────────────
await check('unknown-paths', 'writing to an undeclared path is denied', 'deny', () =>
  uploadBytes(ref(staff(), 'random/anything.jpg'), png(), imageMeta));

await check('unknown-paths', 'writing to documents/ is denied (not built yet)', 'deny', () =>
  uploadBytes(ref(staff(), 'documents/family_a/vaccine.pdf'), png(), pdfMeta));

// ── Message attachments ────────────────────────────────────────
await check('messages', 'staff CAN upload a message photo', 'allow', () =>
  uploadBytes(ref(staff(), 'messages/family_a/msg_1/photo.jpg'), png(), imageMeta));

await check('messages', 'parent CAN upload a message photo', 'allow', () =>
  uploadBytes(ref(parent(), 'messages/family_a/msg_2/photo.jpg'), png(), imageMeta));

await check('messages', 'signed-out CANNOT upload a message photo', 'deny', () =>
  uploadBytes(ref(anon(), 'messages/family_a/msg_3/photo.jpg'), png(), imageMeta));

await check('messages', 'non-image message attachment is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'messages/family_a/msg_4/doc.pdf'), png(), pdfMeta));

await check('messages', 'message photo over 5MB is rejected', 'deny', () =>
  uploadBytes(ref(staff(), 'messages/family_a/msg_5/huge.jpg'),
    new Uint8Array(5 * 1024 * 1024 + 1024), imageMeta));

// ── KNOWN GAP — documented, not yet fixable without custom claims ──
// A parent can read any child's photo, including other families'. Storage
// rules cannot check family membership. This assertion asserts the CURRENT
// behaviour so the gap is visible rather than forgotten; flip it to 'deny'
// when custom claims are in place.
await check('known-gap', 'parent CAN read any child photo (needs custom claims)', 'allow', () =>
  getBytes(ref(parent(), 'children/child_a/photo_1.jpg')));

// ── Report ─────────────────────────────────────────────────────
const width = Math.max(...results.map((r) => r.name.length));
let lastGroup = '';
console.log('\n══════ LogginCare Cloud Storage rules ══════\n');
for (const r of results) {
  if (r.group !== lastGroup) {
    console.log(`\n  ${r.group.toUpperCase()}`);
    lastGroup = r.group;
  }
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.name.padEnd(width)}  (expected ${r.expect})`);
  if (r.err) console.log(`      ${r.err}`);
}
const failed = results.filter((r) => r.status === 'FAIL');
console.log(`\n  ${results.length - failed.length}/${results.length} passed`);
console.log('  NOTE: one assertion documents a known gap — parents can read any');
console.log('        child photo until custom claims exist.\n');

await testEnv.cleanup();
process.exit(failed.length > 0 ? 1 : 0);
