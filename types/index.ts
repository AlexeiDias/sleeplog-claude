// Add these types to your existing types/index.ts file

export type SignInOutType = 'sign-in' | 'sign-out';
export type ParentRelationship = 'Mother' | 'Father' | 'Guardian' | 'Authorized Person';

export interface SignInOutRecord {
  id: string;
  childId: string;
  childName: string;
  daycareId: string;
  type: SignInOutType;
  timestamp: Date;
  parentFullName: string;
  parentSignature?: string; // base64 signature data
  relationship: ParentRelationship;
  notes?: string;
  createdAt: Date;
}
