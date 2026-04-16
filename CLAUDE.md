# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — typecheck with `tsc -b` then build with Vite
- `npm run lint` — ESLint across the project
- `npm test` — run all tests once (`vitest run`)
- `npm run test:watch` — run tests in watch mode
- `npx vitest run src/lib/scoring.test.ts` — run a single test file

## Architecture

React + TypeScript SPA for predicting decathlon/heptathlon scores. Uses Firebase Firestore as the backend and Zustand for client-side state.

### Key layers

- **`src/lib/`** — Pure logic, no React. Contains the World Athletics scoring formula (`scoring.ts`), event constant tables (`events.ts`), and prediction calculations (`predictions.ts`). The scoring module converts performances to points using `A × (B − P)^C` (track) or `A × (P − B)^C` (field). Some field events (high jump, pole vault, long jump) require meter→centimeter conversion before scoring.
- **`src/lib/firebase.ts`** — All Firestore CRUD. Two collections: `athletes` and `competitions`. Every data access function lives here.
- **`src/hooks/`** — Zustand stores (`useAthletes`, `useCompetitions`) that wrap the Firebase API with loading/error state. These are the data layer for all components.
- **`src/pages/`** — Route-level components. Routing is flat: `/`, `/athletes`, `/athletes/:id`, `/competitions`, `/competitions/:id`.
- **`src/components/`** — Organized into `athletes/`, `competitions/`, `common/`, and `layout/`.
- **`src/types/index.ts`** — All shared TypeScript types.

### Scoring system

Predictions work by filling in missing event results with the athlete's personal bests, then summing points across all events. The `calculatePredictedScores` function in `predictions.ts` orchestrates this: actual results take priority, PBs fill gaps, and athletes are ranked by predicted total.

## Environment

Firebase config is loaded from `VITE_FIREBASE_*` env vars (see `.env.example`). The app requires a configured Firebase project with Firestore enabled.

## Stack

React 19, React Router 7, Tailwind CSS 4 (via `@tailwindcss/vite`), Zustand 5, Firebase 12, Vite 8, Vitest 4, TypeScript 5.9.
