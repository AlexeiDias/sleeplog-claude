# Firestore Rules Tests

Tests `firestore.rules` against the local Firebase emulator. Nothing here
touches the real `sleeplog-claude` project — the emulator uses a throwaway
`demo-loggincare` project ID and its own in-memory database.

## Requirements

- Java (the Firestore emulator is a `.jar`)
- Network access on the first run, so the emulator can download

## Run

```bash
cd rules-tests
npm install
npm test
```

Exit code is non-zero if any expectation fails, so this can gate a deploy.

## What is covered

- **escalation** — a user cannot give themselves `admin` or `staff` on an
  existing daycare, cannot promote themselves later via update, and cannot
  attach to a daycare they did not create
- **signup** — a new owner can still register and then link their own daycare
- **staff** — an admin can create staff in their own daycare and nowhere else
- **profile** — ordinary profile edits still work; admins can remove staff
- **parent-invite** — the invite gate holds, and family cannot be swapped
- **parent-scope** — parents read their own children only, and cannot write
- **kiosk** — public reads and sign-in/out creation still work, and sign-in/out
  records remain immutable

## Deploying rules

Passing tests do **not** deploy anything. Rules go live only when published
from the Firebase console or via:

```bash
firebase deploy --only firestore:rules
```
