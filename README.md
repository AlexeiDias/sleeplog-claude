# SleepLog - Daycare Sleep Tracking System

A compliant sleep tracking application for California daycare centers, designed to meet **Title 22, Section 101229** regulatory requirements for infant sleep monitoring.

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

- Real-time sleep session tracking with 15-minute check reminders
- Multi-staff support with role-based access control (Admin/Staff)
- Email and print reports for parents
- Historical reports with date navigation
- Analytics dashboard with charts and CSV export
- Staff management with invite system
- PWA-ready with service worker support

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
│   │   └── page.tsx                 # Main dashboard with child cards
│   ├── login/
│   │   └── page.tsx                 # User login
│   ├── register/
│   │   ├── daycare/
│   │   │   └── page.tsx             # Daycare registration
│   │   └── family/
│   │       └── page.tsx             # Family & children registration
│   ├── reports/
│   │   └── page.tsx                 # Historical reports viewer
│   ├── reset-password/
│   │   └── page.tsx                 # Password reset
│   ├── settings/
│   │   └── page.tsx                 # User profile & settings
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
│   ├── HistoricalChildCard.tsx      # Read-only card for past dates
│   ├── Input.tsx                    # Form input component
│   ├── Modal.tsx                    # Reusable modal dialog
│   ├── Select.tsx                   # Dropdown select component
│   ├── ServiceWorkerRegister.tsx    # PWA service worker registration
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
   │  Signup │        │  (main)   │        │ Daycare  │
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
        │(history) │  │ (charts) │  │(profile) │  │(admin)│
        └──────────┘  └──────────┘  └──────────┘  └───────┘
```

### Key Files Explained

| File | Purpose | Depends On |
|------|---------|------------|
| `contexts/AuthContext.tsx` | Manages user authentication state, login/logout/signup functions | `lib/firebase.ts` |
| `lib/firebase.ts` | Initializes Firebase app, exports `auth` and `db` instances | Environment variables |
| `types/index.ts` | Defines all TypeScript interfaces (User, Child, SleepLogEntry, etc.) | - |
| `components/ChildCard.tsx` | Core UI for sleep tracking - displays timer, sleep log, action buttons | `SleepActionModal`, `SleepLogTable`, `Timer`, `AuthContext` |
| `components/SleepActionModal.tsx` | Form modal for recording sleep actions (start/check/stop) | `Modal`, `Select`, `Button` |
| `utils/reportGenerator.ts` | Generates HTML email content for parent reports | `types/index.ts` |
| `utils/csvExport.ts` | Exports sleep data to CSV format | `types/index.ts` |
| `app/api/send-email/route.ts` | API endpoint that sends emails via Nodemailer | `reportGenerator.ts` |

### Component Hierarchy

```
Dashboard Page
└── ChildCard (for each child)
    ├── Timer (shows elapsed time when sleeping)
    ├── SleepLogTable (displays today's entries)
    │   └── Formatted rows with time, action, position, breathing, mood
    └── SleepActionModal (triggered by Start/Check/Stop buttons)
        ├── Select (position dropdown)
        ├── Select (breathing dropdown)
        └── Select (mood dropdown - only for Stop action)

Analytics Page
└── SleepAnalytics (for each child)
    ├── Summary Cards (avg sleep, total sessions, active days)
    ├── BarChart (daily sleep duration)
    └── LineChart (session count trend)

Reports Page
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
│   └── createdAt
│
├── children/{childId}
│   ├── name, dateOfBirth
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

interface Child {
  id: string;
  name: string;
  dateOfBirth: Date;
  familyId: string;
  daycareId: string;
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
5. Admin invites staff → `/staff/invite`
6. All users set initials before tracking sleep

### Role Permissions

| Feature | Admin | Staff |
|---------|-------|-------|
| View Dashboard | Yes | Yes |
| Track Sleep | Yes | Yes |
| View Reports | Yes | Yes |
| Send Emails | Yes | Yes |
| View Analytics | Yes | Yes |
| Manage Staff | Yes | No |
| Register Families | Yes | No |

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

## Compliance Notes

This application is designed to meet **California Title 22, Section 101229** requirements:

- 15-minute check intervals for sleeping infants
- Tracking of sleep position (Back/Side/Tummy)
- Breathing condition monitoring
- Staff identification on all log entries
- Exportable reports for regulatory compliance

---

## Development Phases Completed

1. **Phase 1-4:** Core authentication, daycare/family registration
2. **Phase 5:** Email/Print reports with staff names
3. **Phase 6:** Staff management with role-based permissions
4. **Phase 7:** Settings & profile management
5. **Phase 8:** Historical reports with date navigation
6. **Phase 9:** Analytics dashboard with charts and CSV export
