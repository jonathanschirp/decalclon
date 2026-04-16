# Decathlon Predictor

A single-page web application for tracking and predicting results in decathlon and heptathlon competitions. During a live competition, as results come in event by event, the app fills in each athlete's remaining events with their personal bests and computes a live predicted final ranking. Athlete and competition data is persisted in Firebase Firestore, and athlete profiles plus competition start lists can be imported directly from the World Athletics database.

---

## Features

### Athlete Management
- Create athletes with name, gender, nationality, and per-event personal bests
- Track the official combined-event personal best (decathlon/heptathlon total) alongside individual event PBs
- Import athletes directly from World Athletics: search by name, auto-populate all PBs and the combined PB from the official database
- View a full athlete profile showing each event PB, its point value under the IAAF scoring tables, and the sum of all event PBs vs. the official combined PB

### Competition Management
- Create decathlon or heptathlon competitions with name, date, location, and status (upcoming / in progress / completed)
- Enroll athletes from the existing athlete roster
- Import competitions from World Athletics: search the WA calendar, select a combined event, and auto-create any athletes who are not yet in the database (including fetching their PBs)
- Three-tier import fallback:
  1. **Results** — competition has finished or is in progress; full results are imported
  2. **Start list** — competition is imminent; athletes are created without results
  3. **Metadata only** — competition is in the future and has no published data yet; name, date, and location are imported and the event type is selected manually
- Sync results from World Athletics at any time with the "Sync from WA" button, which merges WA data on top of any manually entered results

### Live Scoreboard
- Dual-column score display: actual points accumulated so far and predicted final score
- Sort by either predicted total or current actual score (toggle buttons)
- Medal icons (gold / silver / bronze) for the top three positions
- Performance entry directly in the scoreboard table — click any cell to enter a result
- Reset individual results back to the athlete's personal best (hover to reveal reset button)
- Sticky right columns for actual and predicted totals so they stay visible while scrolling horizontally through all events
- Unit suffixes on track times under 60 seconds (e.g. `10.50s`)

### World Athletics Integration
- Searches the World Athletics GraphQL API (via the Stellate proxy) for both athletes and competitions
- Maps WA discipline names to internal event IDs, handling both the full names used in personal best records ("110 Metres Hurdles") and the abbreviated names used in competition result details ("110mH")
- Skips wind-assisted PB marks (trailing `=`) and equipment-variant marks (e.g. "Shot Put (6kg)")
- Extracts the official combined-event total (e.g. "Decathlon: 9126") from the WA personal bests list

### Authentication
- Firebase Authentication with email/password sign-in
- Users must be manually added in the Firebase Console — no self-registration
- Auth gate prevents any access to the app without a valid session
- Sign-out button in the navigation bar

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 19 |
| Routing | React Router | 7 |
| State management | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Backend / database | Firebase Firestore | 12 |
| Authentication | Firebase Auth | 12 |
| Build tool | Vite | 8 |
| Type checking | TypeScript | 5.9 |
| Testing | Vitest | 4 |

---

## Architecture

```
src/
├── lib/                    # Pure logic — no React, no Firebase
│   ├── events.ts           # IAAF event definitions and scoring constants
│   ├── scoring.ts          # Points formula, time parsing, performance formatting
│   ├── predictions.ts      # Predicted score calculation and current-event detection
│   ├── worldathletics.ts   # World Athletics API client
│   └── firebase.ts         # All Firestore and Auth initialization + CRUD functions
├── hooks/
│   ├── useAthletes.ts      # Zustand store wrapping athlete CRUD
│   ├── useCompetition.ts   # Zustand store wrapping competition CRUD + sync
│   └── useAuth.ts          # Zustand store for Firebase Auth state
├── pages/
│   ├── Dashboard.tsx
│   ├── AthletesPage.tsx
│   ├── AthleteDetailPage.tsx
│   ├── CompetitionsPage.tsx
│   ├── CompetitionDetailPage.tsx
│   └── LoginPage.tsx
├── components/
│   ├── layout/
│   │   └── Navbar.tsx
│   ├── athletes/
│   │   ├── AthleteList.tsx
│   │   ├── AthleteProfile.tsx
│   │   ├── AthleteForm.tsx      # Create / edit athlete with WA import
│   │   └── AthleteSearch.tsx    # WA athlete search widget
│   ├── competitions/
│   │   ├── CompetitionList.tsx
│   │   ├── CompetitionForm.tsx  # Create / edit competition with WA import
│   │   ├── CompetitionSearch.tsx # WA competition search + athlete auto-creation
│   │   └── Scoreboard.tsx       # Live prediction table
│   └── common/
│       ├── PerformanceInput.tsx
│       └── PointsDisplay.tsx
└── types/
    └── index.ts            # All shared TypeScript types
```

### Scoring system

Points for each event are calculated using the standard IAAF formula:

- **Track events** (lower is better): `floor(A × (B − P)^C)`
- **Field events** (higher is better): `floor(A × (P − B)^C)`

where `P` is the performance, and `A`, `B`, `C` are event-specific constants. High Jump, Pole Vault, and Long Jump expect centimeters in the formula, so meter inputs are converted before scoring.

The prediction engine (`predictions.ts`) iterates over all events for each enrolled athlete. For each event, it uses the actual result if one has been entered, otherwise falls back to the athlete's personal best. The predicted total is the sum across all ten (decathlon) or seven (heptathlon) events, allowing a live ranking at any point during the competition.

### World Athletics API

The app calls the World Athletics GraphQL API through the public Stellate proxy at `https://worldathletics.stellate.sh/`. No API key is required. Four query types are used:

| Query | Purpose |
|---|---|
| `searchCompetitors` | Search athletes by name |
| `getSingleCompetitor` | Fetch full profile and personal bests by `aaAthleteId` |
| `getCalendarEvents` | Search the competition calendar |
| `getCalendarCompetitionResults` | Fetch combined event list, results, and start list |

WA uses two distinct athlete ID systems: `aaAthleteId` (returned by search, used for profile lookups) and `iaafId` (embedded in competition results). These are not interchangeable. The app stores a `waAthleteMap` on each competition — a mapping from `iaafId` to local Firestore athlete ID — which is used when syncing results.

### State management

Each Zustand store is a self-contained module that wraps Firebase calls with loading and error state. Components read from the store and call its action methods; they never call Firebase directly. The stores are:

- `useAthletes` — CRUD for the `athletes` Firestore collection
- `useCompetitions` — CRUD for the `competitions` collection, plus `updateResult`, `resetResult`, and `syncFromWA`
- `useAuth` — wraps `onAuthStateChanged`, `signInWithEmailAndPassword`, and `signOut`

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore and Authentication enabled

### Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in production mode)
3. Enable **Authentication** and turn on the **Email/Password** sign-in provider
4. Add users manually under Authentication → Users
5. Copy your project's web app config values

### Firestore security rules

Deploy these rules to restrict all reads and writes to authenticated users:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Environment variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Install and run

```bash
npm install
npm run dev
```

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check with `tsc -b` then build for production |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npx vitest run src/lib/scoring.test.ts` | Run a single test file |

---

## Data model

### Athlete

```ts
{
  id: string;
  name: string;
  gender: 'male' | 'female';
  nationality?: string;
  personalBests: Record<string, number>;  // eventId → performance value
  combinedPB?: number;                    // official decathlon/heptathlon total PB
  waAthleteId?: string;                   // World Athletics aaAthleteId
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Competition

```ts
{
  id: string;
  name: string;
  date: string;
  location?: string;
  type: 'decathlon' | 'heptathlon';
  status: 'upcoming' | 'in_progress' | 'completed';
  athleteIds: string[];
  results: { [athleteId: string]: { [eventId: string]: number } };
  waCompetitionId?: number;
  waEventId?: number;
  waAthleteMap?: Record<string, string>;  // iaafId → Firestore athleteId
  createdAt: Timestamp;
}
```

### Event IDs

Decathlon: `dec_100m`, `dec_long_jump`, `dec_shot_put`, `dec_high_jump`, `dec_400m`, `dec_110m_hurdles`, `dec_discus`, `dec_pole_vault`, `dec_javelin`, `dec_1500m`

Heptathlon: `hep_100m_hurdles`, `hep_high_jump`, `hep_shot_put`, `hep_200m`, `hep_long_jump`, `hep_javelin`, `hep_800m`
