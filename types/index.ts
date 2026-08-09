//types/index.ts
// User Roles
export type UserRole = 'admin' | 'staff' | 'parent';

// User Type
export interface User {
  uid: string;
  email: string;
  role: UserRole;
  daycareId?: string;
  initials?: string;
  firstName?: string;
  lastName?: string;
  familyId?: string; // Parents only: links the parent to their family
  // Parents only. Set when they choose a password so the Home Screen app can
  // sign in. Firebase cannot tell us this: email-link users carry the same
  // 'password' provider ID as users with an actual password, so we record it.
  hasPassword?: boolean;
  createdAt: Date;
}

// Parent Invite Type
// Stored at parentInvites/{lowercased email}. Created by an admin, consumed
// when the parent completes magic-link sign-in. This document — not the email
// link itself — is what grants parent access.
export interface ParentInvite {
  email: string;
  familyId: string;
  daycareId: string;
  invitedBy: string; // uid of the admin who sent it
  invitedByName?: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string; // uid assigned at first sign-in
}

// ============================================
// MESSAGING & MEDIA TYPES
// ============================================

// A photo attached to a message. `path` is the Cloud Storage object path and
// is the durable reference; `url` is a download URL, which works without auth
// for anyone holding it — never treat it as access control.
export interface MessageAttachment {
  path: string;
  url: string;
  contentType: string;
  size: number;
  fileName: string;
}

// One thread per family. The document ID IS the familyId, which lets security
// rules authorize the messages subcollection from the path alone — no document
// read required, so parent queries stay provable for list operations.
export interface MessageThread {
  id: string; // == familyId
  familyId: string;
  daycareId: string;
  createdAt: Date;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageSenderRole?: 'parent' | 'staff';
  unreadForParent?: number;
  unreadForStaff?: number;
}

export interface Message {
  id: string;
  familyId: string;
  senderId: string;
  senderRole: 'parent' | 'staff';
  senderName: string;
  text: string;
  attachments?: MessageAttachment[];
  createdAt: Date;
}

// Flat index of every photo shared with a family, so the media gallery is a
// single query instead of a walk across messages, activities and incidents.
export interface MediaItem {
  id: string;
  familyId: string;
  daycareId: string;
  childId?: string;
  path: string;
  url: string;
  contentType: string;
  size: number;
  fileName: string;
  source: 'message' | 'activity' | 'incident';
  sourceId?: string;
  caption?: string;
  uploadedBy: string;
  uploadedByRole: 'parent' | 'staff';
  uploadedByName: string;
  createdAt: Date;
}

// ============================================
// ANNOUNCEMENTS (daycare-wide)
// ============================================

// Posted by staff to every family. Deliberately scoped by daycareId rather
// than familyId — it is the one thing in the app addressed to everyone.
export interface Announcement {
  id: string;
  daycareId: string;
  authorId: string;
  authorName: string;
  text: string;
  attachments?: MessageAttachment[];
  allowReplies: boolean;
  createdAt: Date;
}

// One per user per announcement; the document ID is the user's uid, so a
// person can change or remove their own reaction and cannot add two.
export interface AnnouncementReaction {
  emoji: string;
  byRole: 'parent' | 'staff';
  byName: string;
  createdAt: Date;
}

export interface AnnouncementReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'parent' | 'staff';
  text: string;
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
  archived?: boolean; // Soft-delete: hides child from active views
  archivedAt?: Date;
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
  nutrition?: NutritionData; // Optional nutrition info
}

// ============================================
// NUTRITION TYPES (Open Food Facts)
// ============================================

export interface NutritionItem {
  name: string;
  calories: number; // kcal per 100g
  protein: number; // g per 100g
  carbs: number; // g per 100g
  fat: number; // g per 100g
  servingGrams: number; // actual serving size in grams
  calculatedCalories: number; // calories for this serving
  productId?: string; // Open Food Facts barcode/id
  imageUrl?: string; // Product thumbnail
}

export interface NutritionData {
  items: NutritionItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
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

// ============================================
// INCIDENT LOG TYPES
// ============================================

export type IncidentType = 'injury' | 'illness' | 'behavioral' | 'other';

export const INCIDENT_LOCATIONS = [
  'Classroom',
  'Playground',
  'Bathroom',
  'Nap Area',
  'Kitchen/Eating Area',
  'Hallway',
  'Outdoor Area',
  'Entry/Exit',
  'Other',
];

export const BODY_PARTS = [
  'Head',
  'Face',
  'Neck',
  'Arm (Left)',
  'Arm (Right)',
  'Hand (Left)',
  'Hand (Right)',
  'Chest',
  'Back',
  'Stomach',
  'Leg (Left)',
  'Leg (Right)',
  'Foot (Left)',
  'Foot (Right)',
  'Other',
];

export interface IncidentLogEntry {
  id: string;
  childId: string;
  type: IncidentType;
  description: string;
  timestamp: Date;
  location: string;
  bodyPartAffected?: string;
  firstAidGiven?: string;
  photoUrl?: string;
  parentNotified: boolean;
  parentNotifiedAt?: Date;
  parentNotifiedMethod?: 'email' | 'phone' | 'in-person';
  staffInitials: string;
  staffId: string;
  staffName?: string;
  createdAt: Date;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  lastEditedByInitials?: string;
  deleted?: boolean;
}
