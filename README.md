# SleepLog - Daycare Sleep Tracking & Sign-In/Out System

A comprehensive compliance solution for California daycare centers, meeting **Title 22, Section 101229** regulatory requirements for infant sleep monitoring and **Section 101229.1** for electronic sign-in/out records with digital signatures.

## Technical Overview

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Database | Firebase Firestore | - |
| Authentication | Firebase Auth | - |
| Charts | Recharts | 3.6.0 |
| Email | Nodemailer | 7.0.12 |

### Key Features

**Sleep Tracking:**
- Real-time sleep session tracking with 15-minute check reminders
- Multi-staff collaboration on same child sessions
- Age-based filtering (dashboard shows only children under 2 years)
- Timer and automatic interval calculations
- Position, breathing, and mood tracking

**Sign-In/Out System:**
- California-compliant electronic signature capture
- Touch/stylus signature support for tablets
- Quick parent buttons (no typing for registered parents)
- ID verification for non-registered guardians
- Immutable audit trail with signatures stored as base64 images
- Print-friendly reports with signature display

**Reports & Analytics:**
- Daily sleep reports with email and print
- Sign-in/out records with filters (child, date, type)
- CSV export for both sleep logs and sign-in/out records
- Historical reports with date navigation
- Analytics dashboard with charts and trends

**User Management:**
- Role-based access control (Admin/Staff)
- Staff management with invite system
- Multi-device support (same user on multiple devices)
- Real-time sync across all devices

**Kiosk Mode:**
- Tablet-optimized entrance sign-in/out
- No authentication required (physical security)
- Auto-detection of sign-in vs sign-out status
- Large touch targets for easy parent use

---

## Project Structure

```
sleeplog-fresh/
├── app/                              # Next.js App Router (pages & API)
│   ├── analytics/
│   │   └── page.tsx                 # Analytics dashboard with charts
│   ├── api/
│   │   └── send-email/
│   │       └── route.ts             # Email API endpoint (Nodemailer)
│   ├── dashboard/
│   │   └── page.tsx                 # Main dashboard (children under 2 years)
│   ├── kiosk-setup/
│   │   └── page.tsx                 # One-time tablet configuration
│   ├── login/
│   │   └── page.tsx                 # User login
│   ├── register/
│   │   ├── daycare/
│   │   │   └── page.tsx             # Daycare registration
│   │   └── family/
│   │       └── page.tsx             # Family & children registration
│   ├── reports/
│   │   ├── page.tsx                 # Historical sleep reports viewer
│   │   └── sign-in-out/
│   │       └── page.tsx             # Sign-in/out records with signatures
│   ├── reset-password/
│   │   └── page.tsx                 # Password reset
│   ├── settings/
│   │   └── page.tsx                 # User profile & settings
│   ├── sign-in/
│   │   └── page.tsx                 # Kiosk sign-in/out interface
│   ├── signup/
│   │   └── page.tsx                 # User registration
│   ├── staff/
│   │   ├── invite/
│   │   │   └── page.tsx             # Staff invite page
│   │   └── page.tsx                 # Staff management (admin only)
│   ├── page.tsx                     # Landing page
│   ├── layout.tsx                   # Root layout with AuthProvider
│   └── globals.css                  # Global styles
│
├── components/                       # Reusable React components
│   ├── Button.tsx                   # Custom button (variants: primary/secondary/danger)
│   ├── ChildCard.tsx                # Main sleep tracking card with timer
│   ├── DatePicker.tsx               # Date selection for reports
│   ├── EditChildModal.tsx           # Edit child information & photo
│   ├── EditFamilyModal.tsx          # Edit family & guardian information
│   ├── HistoricalChildCard.tsx      # Read-only card for past dates
│   ├── Input.tsx                    # Form input component
│   ├── Modal.tsx                    # Reusable modal dialog
│   ├── Select.tsx                   # Dropdown select component
│   ├── ServiceWorkerRegister.tsx    # PWA service worker registration
│   ├── SignatureCanvas.tsx          # Digital signature capture component
│   ├── SleepActionModal.tsx         # Modal for logging sleep actions
│   ├── SleepAnalytics.tsx           # Charts component (Recharts)
│   ├── SleepLogTable.tsx            # Table for sleep entries
│   └── Timer.tsx                    # Active session elapsed time
│
├── contexts/
│   └── AuthContext.tsx              # Authentication state & Firebase auth
│
├── lib/
│   └── firebase.ts                  # Firebase initialization
│
├── types/
│   └── index.ts                     # TypeScript type definitions
│
├── utils/
│   ├── csvExport.ts                 # CSV export utilities
│   └── reportGenerator.ts           # Email HTML generation
│
├── public/                          # Static assets & PWA files
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service worker
│   ├── icon-192.png                 # PWA icon
│   └── icon-512.png                 # PWA icon
│
└── Configuration files
    ├── .env.local                   # Environment variables
    ├── next.config.ts               # Next.js configuration
    ├── tsconfig.json                # TypeScript configuration
    └── package.json                 # Dependencies & scripts
```

---

## File Descriptions & Relationships

### Core Application Flow

```
                    ┌─────────────────┐
                    │   layout.tsx    │ ← Root layout wraps all pages
                    │  (AuthProvider) │   with authentication context
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐        ┌───────────┐        ┌──────────┐
   │  Login  │        │ Dashboard │        │ Register │
   │  Signup │        │ (<2 yrs)  │        │ Daycare  │
   └────┬────┘        └─────┬─────┘        │ Family   │
        │                   │              └──────────┘
        │                   │
        └───────────────────┼───────────────────────┐
                            │                       │
              ┌─────────────┼─────────────┐         │
              │             │             │         │
              ▼             ▼             ▼         ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐
        │ Reports  │  │Analytics │  │ Settings │  │ Staff │
        │ Sleep    │  │ (charts) │  │(profile) │  │(admin)│
        │ Sign I/O │  │          │  │          │  │       │
        └──────────┘  └──────────┘  └──────────┘  └───────┘
                            │
                            ▼
                      ┌──────────┐
                      │ Kiosk    │
                      │ Sign I/O │
                      └──────────┘
```

### Key Files Explained

| File | Purpose | Depends On |
|------|---------|------------|
| `contexts/AuthContext.tsx` | Manages user authentication state, login/logout/signup functions | `lib/firebase.ts` |
| `lib/firebase.ts` | Initializes Firebase app, exports `auth` and `db` instances | Environment variables |
| `types/index.ts` | Defines all TypeScript interfaces (User, Child, SignInOutRecord, etc.) | - |
| `components/ChildCard.tsx` | Core UI for sleep tracking - displays timer, sleep log, action buttons | `SleepActionModal`, `SleepLogTable`, `Timer` |
| `components/SignatureCanvas.tsx` | Canvas component for capturing touch/stylus signatures | - |
| `components/EditChildModal.tsx` | Modal for editing child info and uploading photos | `Modal`, `Input`, `Button` |
| `components/EditFamilyModal.tsx` | Modal for editing parent and guardian information | `Modal`, `Input`, `Button` |
| `app/sign-in/page.tsx` | Kiosk interface for parent sign-in/out with signatures | `SignatureCanvas` |
| `app/reports/sign-in-out/page.tsx` | View/print/export sign-in/out records with signatures | `AuthContext` |
| `utils/reportGenerator.ts` | Generates HTML email content for parent reports | `types/index.ts` |
| `utils/csvExport.ts` | Exports sleep and sign-in/out data to CSV | `types/index.ts` |
| `app/api/send-email/route.ts` | API endpoint that sends emails via Nodemailer | `reportGenerator.ts` |

### Component Hierarchy

```
Dashboard Page (Age Filtered)
├── Shows only children under 24 months
├── Quick Links Card (admin only)
│   ├── Kiosk Setup
│   ├── Sign-In/Out Records
│   └── Daily Sleep Reports
└── ChildCard (for each child under 2 years)
    ├── Timer (shows elapsed time when sleeping)
    ├── Edit Button → EditChildModal
    ├── Family Edit Button → EditFamilyModal
    ├── SleepLogTable (displays today's entries)
    └── SleepActionModal (triggered by Start/Check/Stop buttons)
        ├── Select (position dropdown)
        ├── Select (breathing dropdown)
        └── Select (mood dropdown - only for Stop action)

Sign-In Page (Kiosk)
├── Shows ALL children (including 2+ years)
├── Child selection grid
├── Quick parent buttons (registered)
├── "Other Person" button (non-registered)
└── SignatureCanvas (digital signature capture)

Sign-In/Out Reports Page
├── Filters (child, date, type)
├── Records table with signatures
├── Print functionality
└── CSV export

Analytics Page
└── SleepAnalytics (for each child)
    ├── Summary Cards (avg sleep, total sessions, active days)
    ├── BarChart (daily sleep duration)
    └── LineChart (session count trend)

Historical Reports Page
└── DatePicker
└── HistoricalChildCard (for each child)
    └── SleepLogTable (read-only historical data)
```

---

## Data Models (Firestore Schema)

### Collections Structure

```
Firestore
├── users/{uid}
│   ├── uid, email, firstName, lastName
│   ├── role: 'admin' | 'staff'
│   ├── daycareId, initials
│   └── createdAt
│
├── daycares/{daycareId}
│   ├── name, address, licenseNumber
│   ├── phoneNumber, email
│   ├── licenseHolderName
│   ├── adminFirstName, adminLastName
│   └── createdBy, createdAt
│
├── families/{familyId}
│   ├── daycareId
│   ├── motherName, motherEmail
│   ├── fatherName, fatherEmail
│   ├── guardianName, guardianIdNumber, guardianPhone ← NEW
│   └── createdAt
│
├── children/{childId}
│   ├── name, dateOfBirth
│   ├── photoUrl ← NEW (uploaded photo)
│   ├── familyId, daycareId
│   ├── createdAt
│   │
│   └── sleepLogs/{YYYY-MM-DD}/entries/{entryId}  ← Nested subcollection
│       ├── childId, timestamp
│       ├── type: 'start' | 'check' | 'stop'
│       ├── position: 'Back' | 'Side' | 'Tummy'
│       ├── breathing: 'Normal' | 'Labored' | 'Congested'
│       ├── mood: 'Happy' | 'Fussy' | 'Upset' | 'Crying' (stop only)
│       ├── intervalSinceLast (minutes)
│       ├── staffInitials, staffId
│       └── sessionId (groups start→checks→stop)
│
└── signInOut/{recordId} ← NEW: Electronic sign-in/out records
    ├── childId, childName
    ├── daycareId
    ├── type: 'sign-in' | 'sign-out'
    ├── timestamp (auto-captured)
    ├── parentFullName
    ├── relationship: 'Mother' | 'Father' | 'Guardian' | 'Authorized Person'
    ├── signature (base64 image) ← Digital signature
    ├── idNumber (for non-registered guardians)
    ├── notes (optional)
    └── createdAt (immutable - audit trail)
```

### TypeScript Interfaces

```typescript
// User roles
type UserRole = 'admin' | 'staff';

// Sleep tracking types
type SleepPosition = 'Back' | 'Side' | 'Tummy';
type BreathingCondition = 'Normal' | 'Labored' | 'Congested';
type Mood = 'Happy' | 'Fussy' | 'Upset' | 'Crying';
type SleepAction = 'start' | 'check' | 'stop';

// Sign-in/out types (NEW)
type SignInOutType = 'sign-in' | 'sign-out';
type ParentRelationship = 'Mother' | 'Father' | 'Guardian' | 'Authorized Person';

interface SleepLogEntry {
  id: string;
  childId: string;
  timestamp: Date;
  type: SleepAction;
  position: SleepPosition;
  breathing: BreathingCondition;
  mood?: Mood;              // Only for 'stop' action
  intervalSinceLast?: number; // Minutes since last entry
  staffInitials: string;
  staffId: string;
  sessionId: string;        // Groups entries in a session
}

interface SignInOutRecord {
  id: string;
  childId: string;
  childName: string;
  daycareId: string;
  type: SignInOutType;
  timestamp: Date;
  parentFullName: string;
  relationship: ParentRelationship;
  signature: string;        // Base64 image
  idNumber?: string;        // For non-registered guardians
  notes?: string;
  createdAt: Date;
}

interface Child {
  id: string;
  name: string;
  dateOfBirth: Date;
  photoUrl?: string;        // NEW: Child photo
  familyId: string;
  daycareId: string;
}

interface Family {
  id: string;
  daycareId: string;
  motherName?: string;
  motherEmail?: string;
  fatherName?: string;
  fatherEmail?: string;
  guardianName?: string;     // NEW
  guardianIdNumber?: string; // NEW
  guardianPhone?: string;    // NEW
  createdAt: Date;
}

interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  daycareId?: string;
  initials?: string;
}
```

---

## Authentication & Authorization

### Flow

1. User registers via `/signup` → Firebase Auth creates account
2. User document created in Firestore with role assignment
3. Admin registers daycare → `/register/daycare`
4. Admin registers families/children → `/register/family`
5. Admin can add guardian information to families
6. Admin invites staff → `/staff/invite`
7. All users set initials before tracking sleep
8. Admin configures tablet for kiosk → `/kiosk-setup`

### Role Permissions

| Feature | Admin | Staff | Kiosk (Parents) |
|---------|-------|-------|-----------------|
| View Dashboard | Yes | Yes | No |
| Track Sleep | Yes | Yes | No |
| View Reports | Yes | Yes | No |
| Send Emails | Yes | Yes | No |
| View Analytics | Yes | Yes | No |
| Manage Staff | Yes | No | No |
| Register Families | Yes | No | No |
| Edit Children | Yes | No | No |
| Sign-In/Out | No | No | Yes (public) |

### Multi-Device Support

✅ **One user can be logged in on multiple devices simultaneously**
- Same admin on iPad (kiosk management) + iPhone (sleep tracking)
- All changes sync in real-time via Firestore
- No logout conflicts or session issues

✅ **Multiple staff can collaborate on same child's sleep session**
- Staff A starts session
- Staff B does sleep checks
- Staff C stops session
- All actions logged with individual staff initials

---

## API Endpoints

### POST `/api/send-email`

Sends HTML email reports to parents via Nodemailer.

**Request:**
```json
{
  "to": "parent@example.com",
  "cc": "daycare@example.com",
  "subject": "Sleep Report for Child Name",
  "htmlContent": "<html>...</html>"
}
```

**Response:**
```json
{ "success": true, "messageId": "..." }
```

---

## Environment Variables

```bash
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Email service (server-side)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and email credentials

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

---

## Kiosk Setup Guide

### One-Time Configuration

1. **Navigate to:** `/kiosk-setup` (admin only)
2. **Select your daycare** from the list
3. **Bookmark** `/sign-in` on the tablet's home screen
4. **Mount tablet** at entrance (recommended: wall mount or stand)

### Tablet Recommendations

- **Device:** iPad or Android tablet (10" or larger)
- **Mode:** Guided Access (iOS) or Kiosk Mode (Android)
- **URL:** Bookmark `https://your-app.vercel.app/sign-in`
- **Network:** Stable WiFi connection required
- **Power:** Keep plugged in with cable management

### Parent Usage Flow

1. **Tap child's photo** on main screen
2. **Select parent/guardian** (quick buttons) OR "Other Person"
3. **Draw signature** with finger or stylus
4. **Tap "Complete Sign In"** (or Sign Out)
5. **Success screen** appears briefly
6. **Returns to main screen** automatically

---

## Compliance Notes

This application is designed to meet California regulatory requirements:

### Title 22, Section 101229 (Sleep Tracking)
- ✅ 15-minute check intervals for sleeping infants
- ✅ Tracking of sleep position (Back/Side/Tummy)
- ✅ Breathing condition monitoring
- ✅ Staff identification on all log entries
- ✅ Exportable reports for regulatory compliance
- ✅ Age-based filtering (children under 2 years)

### Title 22, Section 101229.1 (Sign-In/Out)
- ✅ Full legal name captured
- ✅ Digital signature stored as image
- ✅ Timestamp automatically recorded
- ✅ Parent/guardian signs (not staff)
- ✅ Records kept indefinitely in Firestore
- ✅ Print-friendly reports with signatures
- ✅ Immutable audit trail (no edits/deletes)
- ✅ ID verification for non-registered guardians

### Data Retention
- Sleep logs: Accessible by date indefinitely
- Sign-in/out records: Stored permanently
- Signatures: Base64 images in Firestore
- All timestamps in Pacific Time

---

## Development Phases Completed

1. **Phase 1-4:** Core authentication, daycare/family registration
2. **Phase 5:** Email/Print reports with staff names
3. **Phase 6:** Staff management with role-based permissions
4. **Phase 7:** Settings & profile management
5. **Phase 8:** Historical reports with date navigation
6. **Phase 9:** Analytics dashboard with charts and CSV export
7. **Phase 10:** Edit families and children with photo upload
8. **Phase 11:** Electronic sign-in/out with digital signatures
9. **Phase 12:** Sign-in/out reports with filters and export
10. **Phase 13:** Age-based dashboard filtering (under 2 years)
11. **Phase 14:** Guardian registration and quick kiosk buttons

---

## Key User Workflows

### Daily Staff Workflow

```
1. Login to dashboard
2. View children under 2 years old
3. Click child card to track sleep
4. Start session → Record checks (15 min) → Stop session
5. View/print daily reports
6. Send email reports to parents
```

### Parent Workflow (Kiosk)

```
1. Arrive at daycare entrance
2. Tap child's photo on tablet
3. Tap your name button (or "Other Person")
4. Sign with finger
5. Done! Child signed in
```

### Admin Workflow

```
1. Register families and children
2. Add guardian information
3. Configure tablet kiosk
4. Manage staff invites
5. View sign-in/out records
6. Export compliance reports
7. Monitor analytics
```

---

## Troubleshooting

### Signature Not Saving
- Ensure signature canvas shows "✍️ Sign here"
- Draw signature completely before submitting
- Check Firestore rules allow `signInOut` writes

### Dashboard Empty
- Verify children are under 24 months (2 years)
- Older children hidden from dashboard but available in kiosk

### Reports Not Loading
- Check Firestore composite index exists
- Navigate to Firebase Console → Firestore → Indexes
- Index fields: `daycareId` (Ascending), `timestamp` (Descending)

### Kiosk Redirects to Setup
- Clear browser localStorage
- Reconfigure via `/kiosk-setup`
- Verify daycare ID matches

---

## Production Deployment

Deployed on **Vercel** with automatic builds:

```bash
# Push to main branch triggers deployment
git push origin main

# Vercel builds and deploys automatically
# View at: https://sleeplog-claude.vercel.app
```

### Performance Optimizations
- Real-time Firestore listeners for instant updates
- Image optimization via Next.js Image component
- Client-side rendering for interactive features
- Server-side API routes for email sending

---

## Support & Documentation

- **Firebase Console:** https://console.firebase.google.com
- **Vercel Dashboard:** https://vercel.com
- **California Title 22:** https://www.cdss.ca.gov/regulations

---

## License

Proprietary - California Daycare Compliance Solution
