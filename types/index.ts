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
  // Care log settings (optional - stored in separate document but referenced here)
  careLogSettings?: CareLogSettings;
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

// ============================================
// CARE LOG TYPES (NEW)
// ============================================

// Care Log Type Options
export type CareLogType = 'diaper' | 'meal' | 'bottle';
export type DiaperType = 'wet' | 'solid' | 'both';

// Care Log Settings (per child)
export interface CareLogSettings {
  enabled: boolean;
  trackDiapers: boolean;
  trackMeals: boolean;
  trackBottles: boolean;
  pottyTrained: boolean; // If true, hide diaper tracking
  noBottles: boolean; // If true, hide bottle tracking
}

// Base Care Log Entry
export interface BaseCareLogEntry {
  id: string;
  childId: string;
  type: CareLogType;
  timestamp: Date;
  staffInitials: string;
  staffId: string;
  createdAt: Date;
  lastEditedAt?: Date;
  lastEditedBy?: string; // Staff ID
  lastEditedByInitials?: string; // Staff initials
}

// Diaper Change Entry
export interface DiaperEntry extends BaseCareLogEntry {
  type: 'diaper';
  diaperType: DiaperType;
  comments?: string;
}

// Meal Entry
export interface MealEntry extends BaseCareLogEntry {
  type: 'meal';
  amount?: number; // Optional weight in oz
  ingredients: string; // Required
  comments?: string;
}

// Bottle Entry
export interface BottleEntry extends BaseCareLogEntry {
  type: 'bottle';
  amount: number; // Required (in oz)
  comments?: string;
}

// Union type for all care log entries
export type CareLogEntry = DiaperEntry | MealEntry | BottleEntry;

// Care Log Summary (for daily reports)
export interface CareLogSummary {
  date: string; // YYYY-MM-DD
  childId: string;
  totalDiapers: number;
  totalMeals: number;
  totalBottles: number;
  totalBottleOz: number;
  totalMealOz: number;
  entries: CareLogEntry[];
}
