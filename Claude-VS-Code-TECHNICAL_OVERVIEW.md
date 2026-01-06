# SleepLog - Technical Overview Document

## Project Summary

**SleepLog** is a California-compliant daycare sleep tracking and electronic sign-in/out system built with Next.js 16, React 19, TypeScript, and Firebase. It meets Title 22 regulatory requirements for infant sleep monitoring (Section 101229) and electronic sign-in/out records with digital signatures (Section 101229.1).

**Key Purpose:** Provide daycare centers with real-time sleep tracking for infants under 2 years, electronic parent sign-in/out with digital signatures, and compliance reporting.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Server & client-side rendering, API routes |
| UI Library | React 19 | Component-based UI |
| Language | TypeScript 5 | Type safety |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Database | Firebase Firestore | Real-time NoSQL database |
| Authentication | Firebase Auth | User authentication |
| Storage | Firebase Storage | Image/photo storage |
| Charts | Recharts | Sleep analytics visualizations |
| Email | Nodemailer | Email reports to parents |
| PWA | Service Worker | Offline capability |

---

## Project Folder Structure

```
sleeplog-fresh/
├── app/                                   # Next.js App Router (21 pages/routes)
│   ├── analytics/page.tsx                # Analytics dashboard with charts
│   ├── api/send-email/route.ts           # Email API (Nodemailer)
│   ├── dashboard/page.tsx                # Main sleep tracking dashboard (<2yrs)
│   ├── kiosk-setup/page.tsx              # Tablet kiosk configuration
│   ├── login/page.tsx                    # User login
│   ├── page.tsx                          # Landing page
│   ├── profile/page.tsx                  # User profile management
│   ├── register/
│   │   ├── daycare/page.tsx              # Daycare registration
│   │   └── family/page.tsx               # Family & children registration
│   ├── reports/
│   │   ├── page.tsx                      # Historical sleep reports
│   │   └── sign-in-out/page.tsx          # Sign-in/out records with signatures
│   ├── reset-password/page.tsx           # Password reset
│   ├── settings/
│   │   ├── layout.tsx                    # Settings layout wrapper
│   │   ├── page.tsx                      # Profile & settings
│   │   ├── daycare/page.tsx              # Daycare settings
│   │   └── families/page.tsx             # Family management
│   ├── sign-in/page.tsx                  # Kiosk sign-in/out interface
│   ├── signup/page.tsx                   # User registration
│   ├── staff/
│   │   ├── page.tsx                      # Staff management (admin)
│   │   └── invite/page.tsx               # Staff invitation
│   ├── layout.tsx                        # Root layout with AuthProvider
│   └── globals.css                       # Global Tailwind styles
│
├── components/                            # 16 reusable React components
│   ├── Button.tsx                        # Variants: primary/secondary/danger
│   ├── ChildCard.tsx                     # Main sleep tracking card with timer
│   ├── DatePicker.tsx                    # Date selection for reports
│   ├── EditChildModal.tsx                # Edit child info & upload photos
│   ├── EditFamilyModal.tsx               # Edit family/guardian info
│   ├── HistoricalChildCard.tsx           # Read-only historical data card
│   ├── ImageUpload.tsx                   # File upload component
│   ├── Input.tsx                         # Form input component
│   ├── Modal.tsx                         # Reusable modal dialog
│   ├── Select.tsx                        # Dropdown component
│   ├── ServiceWorkerRegister.tsx         # PWA service worker registration
│   ├── SignatureCanvas.tsx               # Touch/stylus signature capture
│   ├── SleepActionModal.tsx              # Sleep tracking action modal
│   ├── SleepAnalytics.tsx                # Recharts visualizations
│   ├── SleepLogTable.tsx                 # Sleep entries table
│   └── Timer.tsx                         # Active session timer
│
├── contexts/
│   └── AuthContext.tsx                   # Firebase auth state management
│
├── lib/
│   └── firebase.ts                       # Firebase initialization & exports
│
├── types/
│   └── index.ts                          # 8 TypeScript interfaces
│
├── utils/
│   ├── csvExport.ts                      # CSV export utilities
│   └── reportGenerator.ts                # Email HTML generation
│
├── public/                               # PWA assets
│   ├── manifest.json                     # PWA manifest
│   ├── sw.js                             # Service worker
│   └── icon-192.png, icon-512.png        # PWA icons
│
└── Configuration Files
    ├── .env.local                        # Environment variables (Firebase + Email)
    ├── next.config.ts                    # Next.js config
    ├── tsconfig.json                     # TypeScript config
    ├── package.json                      # Dependencies & scripts
    ├── postcss.config.mjs                # PostCSS for Tailwind
    └── eslint.config.mjs                 # ESLint configuration
```

---

## File Descriptions & Relationships

### Core Application Files

| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Authentication state provider - wraps app with user session, login/logout/signup functions |
| `lib/firebase.ts` | Firebase app initialization - exports `auth`, `db` (Firestore), `storage` instances |
| `types/index.ts` | TypeScript interfaces: User, Child, Family, SleepLogEntry, SleepSession, SignInOutRecord, Daycare |
| `app/layout.tsx` | Root layout - wraps all pages with AuthProvider, sets PWA metadata |

### Page Routes (21 pages)

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page with intro & navigation | No |
| `/login`, `/signup` | Email/password authentication | No |
| `/reset-password` | Firebase password reset flow | No |
| `/register/daycare` | Admin creates their daycare center | Yes |
| `/register/family` | Admin adds families & children | Yes (Admin) |
| `/dashboard` | Main sleep tracking interface (children <2yrs only) | Yes |
| `/analytics` | 7-day trend charts, CSV export | Yes |
| `/reports` | Historical sleep logs by date | Yes |
| `/reports/sign-in-out` | Sign-in/out records with signature images | Yes |
| `/sign-in` | Public kiosk for parent sign-in/out with signature | No |
| `/kiosk-setup` | One-time tablet configuration for admin | Yes (Admin) |
| `/staff` | Staff management with role editing | Yes (Admin) |
| `/staff/invite` | Send staff invitations via email | Yes (Admin) |
| `/settings/*` | Profile, daycare, and family management | Yes |

### Key Components

| Component | Purpose | Used By |
|-----------|---------|---------|
| `ChildCard.tsx` | Core UI: displays child info, timer, sleep log table, action buttons | Dashboard |
| `SleepActionModal.tsx` | Modal for start/check/stop sleep actions with position/breathing/mood dropdowns | ChildCard |
| `Timer.tsx` | Displays elapsed time for active sleep sessions | ChildCard |
| `SleepLogTable.tsx` | Renders table of sleep entries with timestamps and staff initials | ChildCard, Reports |
| `SignatureCanvas.tsx` | Canvas for touch/stylus signature capture, outputs base64 image | Sign-in page |
| `SleepAnalytics.tsx` | Recharts bar/line charts for sleep trends | Analytics page |
| `EditChildModal.tsx` | Edit child details with photo upload to Firebase Storage | ChildCard, Settings |
| `EditFamilyModal.tsx` | Edit family/guardian information | Settings/families |
| `HistoricalChildCard.tsx` | Read-only card for viewing past sleep records | Reports page |
| `DatePicker.tsx` | Date selection for navigating historical reports | Reports pages |

### Utilities

| File | Purpose |
|------|---------|
| `utils/csvExport.ts` | Functions to export sleep data and sign-in/out records as CSV files |
| `utils/reportGenerator.ts` | Generates styled HTML email content with sleep session summaries |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/send-email` | POST | Sends HTML email reports via Nodemailer (Gmail) to parents |

---

## Database Schema (Firestore)

```
Firestore Collections:
├── users/{uid}
│   └── email, firstName, lastName, role (admin|staff), daycareId, initials, createdAt
│
├── daycares/{daycareId}
│   └── name, address, licenseNumber, phoneNumber, email, licenseHolderName,
│       adminFirstName, adminLastName, createdBy, createdAt
│
├── families/{familyId}
│   └── daycareId, motherName, motherEmail, fatherName, fatherEmail,
│       guardianName, guardianIdNumber, guardianPhone, createdAt
│
├── children/{childId}
│   ├── name, dateOfBirth, photoUrl, familyId, daycareId, createdAt
│   └── sleepLogs/{YYYY-MM-DD}/entries/{entryId}  [Nested subcollection]
│       └── childId, timestamp, type (start|check|stop), position, breathing,
│           mood, intervalSinceLast, staffInitials, staffId, sessionId
│
└── signInOut/{recordId}
    └── childId, childName, daycareId, type (sign-in|sign-out), timestamp,
        parentFullName, relationship, signature (base64), idNumber, notes, createdAt
```

---

## Key Data Flows

### Authentication Flow
```
User Registration → Firebase Auth + Firestore user doc → AuthContext provides user state → Protected pages check auth
```

### Sleep Tracking Flow
```
Dashboard (filters <24mo) → ChildCard per child → SleepActionModal (start/check/stop)
→ Save to children/{id}/sleepLogs/{date}/entries → Real-time onSnapshot updates all devices
```

### Sign-In/Out Flow
```
Kiosk Setup (one-time) → Sign-In Page (public) → Child selection + SignatureCanvas
→ Save to signInOut collection → View in Sign-In/Out Reports
```

### Email Reports Flow
```
ChildCard email button → generateEmailHTML() → POST /api/send-email → Nodemailer → Parent inbox
```

---

## User Roles & Access

| Role | Access Level |
|------|--------------|
| **Admin** | Full access: manage staff, register families, configure kiosk, all reports |
| **Staff** | Track sleep, view reports, send emails (cannot manage staff or families) |
| **Parents** | Public kiosk access only (no authentication required) |

---

## Compliance Features

### Sleep Tracking (Title 22, Section 101229)
- 15-minute check intervals for sleeping infants
- Sleep position tracking (Back/Side/Tummy)
- Breathing condition monitoring (Normal/Labored/Congested)
- Mood tracking (Happy/Fussy/Upset/Crying)
- Staff identification on all entries
- Age-based filtering (children under 24 months only)

### Sign-In/Out (Section 101229.1)
- Digital signature capture (stored as base64 image)
- Full legal name required
- Automatic timestamps
- Immutable audit trail (no edits/deletes allowed)
- ID verification for non-registered guardians
- Print-friendly reports with signature display

---

## Environment Variables Required

```
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Email service (server-side)
EMAIL_USER=gmail-account@gmail.com
EMAIL_PASS=gmail-app-password
```

---

## Project Statistics

- **Total TypeScript/TSX files:** 47
- **Pages/Routes:** 21
- **Components:** 16
- **Utilities:** 2
- **API endpoints:** 1
- **Context providers:** 1
- **Firestore collections:** 5 main + nested subcollections

---

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Run ESLint
```
