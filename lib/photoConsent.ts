//lib/photoConsent.ts
// Photo consent, one record per family.
//
// Scope is deliberately narrow: whether photos including this family's children
// may appear in daycare-wide announcements that other families can see. Photos
// sent privately to a family are not covered and never need consent.
//
// IMPORTANT: the app cannot tell who appears in a photograph. This does not
// prevent a declining family's child from ending up in a group photo — it puts
// the answer in front of staff at the moment they post, and creates a dated
// record of what was agreed. It is a workflow aid, not an enforcement
// mechanism, and should not be described as one.

import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { displayName, toDate } from '@/lib/messaging';

export interface ConsentRecord {
  familyId: string;
  allowed: boolean;
  answeredByName: string;
  answeredAt: Date;
}

/** null means no answer on file, which is treated as declined. */
export async function fetchConsent(familyId: string): Promise<ConsentRecord | null> {
  const snapshot = await getDoc(doc(db, 'photoConsent', familyId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    familyId,
    allowed: Boolean(data.allowed),
    answeredByName: (data.answeredByName as string) || '',
    answeredAt: toDate(data.answeredAt),
  };
}

export async function recordConsent(user: User, allowed: boolean): Promise<void> {
  if (!user.familyId || !user.daycareId) {
    throw new Error('Account is not linked to a family');
  }

  const existing = await getDoc(doc(db, 'photoConsent', user.familyId));

  await setDoc(
    doc(db, 'photoConsent', user.familyId),
    {
      familyId: user.familyId,
      daycareId: user.daycareId,
      allowed,
      answeredBy: user.uid,
      answeredByName: displayName(user),
      // Preserve the original answer date; record when it last changed.
      answeredAt: existing.exists() ? existing.data().answeredAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export interface FamilyConsentStatus {
  familyId: string;
  familyName: string;
  childNames: string[];
  status: 'allowed' | 'declined' | 'unanswered';
}

/**
 * Staff-side view: which families have said no, or not answered.
 *
 * Both queries are constrained by daycareId — the field the rules authorise on
 * — so they are provable for list operations.
 */
export async function fetchDaycareConsent(
  daycareId: string
): Promise<FamilyConsentStatus[]> {
  const [familySnap, childSnap, consentSnap] = await Promise.all([
    getDocs(query(collection(db, 'families'), where('daycareId', '==', daycareId))),
    getDocs(query(collection(db, 'children'), where('daycareId', '==', daycareId))),
    getDocs(query(collection(db, 'photoConsent'), where('daycareId', '==', daycareId))),
  ]);

  const consentByFamily = new Map<string, boolean>();
  consentSnap.forEach((d) => consentByFamily.set(d.id, Boolean(d.data().allowed)));

  const childrenByFamily = new Map<string, string[]>();
  childSnap.forEach((d) => {
    const data = d.data();
    if (data.archived) return;
    const list = childrenByFamily.get(data.familyId as string) || [];
    list.push(data.name as string);
    childrenByFamily.set(data.familyId as string, list);
  });

  return familySnap.docs.map((d) => {
    const data = d.data();
    const answer = consentByFamily.get(d.id);
    return {
      familyId: d.id,
      familyName: (data.motherName as string) || (data.fatherName as string) || 'Family',
      childNames: childrenByFamily.get(d.id) || [],
      status: answer === undefined ? 'unanswered' : answer ? 'allowed' : 'declined',
    };
  });
}

/** Children whose families have not agreed — the list staff need before posting. */
export function childrenToExclude(statuses: FamilyConsentStatus[]): string[] {
  return statuses
    .filter((s) => s.status !== 'allowed')
    .flatMap((s) => s.childNames);
}
