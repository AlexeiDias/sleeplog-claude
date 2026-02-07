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
export type SleepPosition = 'Back' | 'Side' | 'Tummy' | 'Seating' | 'Standing';
export type BreathingCondition = 'Normal' | 'Labored' | 'Congested';
export type Mood = 'Happy' | 'Neutral' | 'Fussy' | 'Upset' | 'Crying';
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
export type DiaperType = 'dry' | 'wet' | 'solid' | 'both';

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

// ============================================
// ACTIVITY LOG TYPES (NEW)
// ============================================

// Activity Category (customizable per daycare)
export interface ActivityCategory {
  id: string;
  name: string; // e.g., "🎮 Games & Play"
  activities: string[]; // Predefined activity names
}

// Activity Settings (per daycare)
export interface ActivitySettings {
  enabled: boolean;
  categories: ActivityCategory[];
}

// Activity Log Entry
export interface ActivityLogEntry {
  id: string;
  childId: string;
  category: string; // Category name
  activityName: string;
  duration?: number; // Minutes (optional)
  notes?: string;
  timestamp: Date;
  staffInitials: string;
  staffId: string;
  createdAt: Date;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  lastEditedByInitials?: string;
  deleted?: boolean;
}

// Activity Log Summary (for daily reports)
export interface ActivityLogSummary {
  date: string;
  childId: string;
  totalActivities: number;
  totalDuration: number; // Total minutes
  entriesByCategory: { [category: string]: ActivityLogEntry[] };
  entries: ActivityLogEntry[];
}

// Default Activity Categories
export const DEFAULT_ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: 'games',
    name: '🎮 Games & Play',
    activities: ['Memory Game', 'Puzzles', 'Building Blocks', 'Free Play', 'Board Games'],
  },
  {
    id: 'learning',
    name: '📚 Learning',
    activities: ['Letters', 'Numbers', 'Reading', 'Writing', 'Flashcards'],
  },
  {
    id: 'motor',
    name: '✋ Motor Skills',
    activities: ['Drawing', 'Tracing', 'Cutting', 'Coloring', 'Play-Doh'],
  },
  {
    id: 'arts',
    name: '🎨 Arts & Crafts',
    activities: ['Painting', 'Crafts', 'Music', 'Dancing', 'Singing'],
  },
  {
    id: 'stem',
    name: '🔬 STEM',
    activities: ['Science Experiment', 'Counting', 'Sorting', 'Patterns', 'Nature Walk'],
  },
  {
    id: 'life',
    name: '🏠 Life Skills',
    activities: ['Cooking/Baking', 'Cleaning Up', 'Self-Care', 'Sharing', 'Taking Turns'],
  },
  {
    id: 'outdoor',
    name: '🌳 Outdoor',
    activities: ['Playground', 'Running', 'Ball Games', 'Sandbox', 'Water Play'],
  },
];
