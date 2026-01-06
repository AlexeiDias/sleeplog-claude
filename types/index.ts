//types/index.ts
// User Roles
export type UserRole = 'admin' | 'staff';

// User Type
export interface User {
  uid: string;
  email: string;
  role: UserRole;
  daycareId?: string;
  initials?: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}

// Daycare Type
export interface Daycare {
  id: string;
  name: string;
  address: string;
  licenseNumber: string;
  phoneNumber: string;
  email: string;
  licenseHolderName: string;
  adminFirstName: string;
  adminLastName: string;
  createdBy: string; // userId
  createdAt: Date;
}

// Family Type
export interface Family {
  id: string;
  daycareId: string;
  motherName?: string;
  motherEmail?: string;
  fatherName?: string;
  fatherEmail?: string;
  guardianName?: string;
  guardianIdNumber?: string;
  guardianPhone?: string;
  createdAt: Date;
}

// Child Type
export interface Child {
  id: string;
  name: string;
  dateOfBirth: Date;
  photoUrl?: string;
  familyId: string;
  daycareId: string;
  createdAt: Date;
}

// Sleep Log Entry Types
export type SleepPosition = 'Back' | 'Side' | 'Tummy';
export type BreathingCondition = 'Normal' | 'Labored' | 'Congested';
export type Mood = 'Happy' | 'Fussy' | 'Upset' | 'Crying';
export type SleepAction = 'start' | 'check' | 'stop';

export interface SleepLogEntry {
  id: string;
  childId: string;
  timestamp: Date;
  type: SleepAction;
  position: SleepPosition;
  breathing: BreathingCondition;
  mood?: Mood; // Only for 'stop' action
  notes?: string; // Optional notes for any action
  intervalSinceLast?: number; // Minutes since last entry
  staffInitials: string;
  staffId: string;
  sessionId: string; // Groups entries from start to stop
}

// Sleep Session (for dashboard display)
export interface SleepSession {
  sessionId: string;
  childId: string;
  startTime: Date;
  endTime?: Date;
  entries: SleepLogEntry[];
  totalDuration?: number; // Minutes
  isActive: boolean;
}

// Sign-In/Out Types
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
  relationship: ParentRelationship;
  signature?: string; // base64 signature image
  idNumber?: string; // ID number for non-registered guardians
  notes?: string;
  createdAt: Date;
}
