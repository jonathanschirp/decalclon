import { create } from 'zustand';
import type { Competition, CompetitionResults } from '../types';
import { getEventsForType } from '../lib/events';
import { DNS_MARK } from '../lib/predictions';
import * as api from '../lib/firebase';
import { fetchEventResults, mapEventResults } from '../lib/worldathletics';

interface CompetitionsState {
  competitions: Competition[];
  current: Competition | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: Omit<Competition, 'id' | 'createdAt'>) => Promise<string>;
  update: (id: string, data: Partial<Omit<Competition, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateResult: (competitionId: string, athleteId: string, eventId: string, value: number) => Promise<void>;
  resetResult: (competitionId: string, athleteId: string, eventId: string) => Promise<void>;
  syncFromWA: () => Promise<void>;
  syncing: boolean;
}

export const useCompetitions = create<CompetitionsState>((set, get) => ({
  competitions: [],
  current: null,
  loading: false,
  error: null,
  syncing: false,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const competitions = await api.fetchCompetitions();
      set({ competitions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const competition = await api.fetchCompetition(id);
      set({ current: competition, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  create: async (data) => {
    const id = await api.createCompetition(data);
    await get().fetch();
    return id;
  },

  update: async (id, data) => {
    await api.updateCompetition(id, data);
    // Refresh current if it matches
    if (get().current?.id === id) {
      await get().fetchOne(id);
    }
    await get().fetch();
  },

  remove: async (id) => {
    await api.deleteCompetition(id);
    set({ current: null });
    await get().fetch();
  },

  updateResult: async (competitionId, athleteId, eventId, value) => {
    const comp = get().current;
    if (!comp) return;

    const results = { ...comp.results };
    if (!results[athleteId]) {
      results[athleteId] = {};
    }
    const athleteResults = { ...results[athleteId], [eventId]: value };

    // Withdrawal (and zeroing of later events) is derived in calculatePredictedScores
    // from whether a no-mark is the athlete's most recent entry — we no longer persist
    // no-marks forward. Entering a real result reactivates the athlete: clear any
    // trailing no-marks after this event, unless a real result follows it (in which
    // case those are legitimate mid-competition failed events and must be kept).
    if (value !== DNS_MARK) {
      const events = getEventsForType(comp.type);
      const idx = events.findIndex((e) => e.id === eventId);
      if (idx >= 0) {
        const hasLaterReal = events.slice(idx + 1).some((e) => {
          const v = athleteResults[e.id];
          return v != null && v !== DNS_MARK;
        });
        if (!hasLaterReal) {
          for (let i = idx + 1; i < events.length; i++) {
            if (athleteResults[events[i].id] === DNS_MARK) {
              delete athleteResults[events[i].id];
            }
          }
        }
      }
    }

    results[athleteId] = athleteResults;

    await api.updateCompetition(competitionId, { results });
    await get().fetchOne(competitionId);
  },

  resetResult: async (competitionId, athleteId, eventId) => {
    const comp = get().current;
    if (!comp) return;

    const results = { ...comp.results };
    if (results[athleteId]) {
      const { [eventId]: _, ...rest } = results[athleteId];
      results[athleteId] = rest;
    }

    await api.updateCompetition(competitionId, { results });
    await get().fetchOne(competitionId);
  },

  syncFromWA: async () => {
    const comp = get().current;
    if (!comp?.waCompetitionId || !comp.waEventId || !comp.waAthleteMap) return;

    set({ syncing: true, error: null });
    try {
      const waResults = await fetchEventResults(comp.waCompetitionId, comp.waEventId);
      const newResults = mapEventResults(waResults, comp.type, comp.waAthleteMap);

      // Merge: WA results overwrite, but keep any manual entries for athletes not in WA
      const merged: CompetitionResults = { ...comp.results };
      for (const [athleteId, events] of Object.entries(newResults)) {
        merged[athleteId] = { ...merged[athleteId], ...events };
      }

      // Detect DNS gaps and trailing withdrawals.
      const events = getEventsForType(comp.type);

      // Helper: does another athlete have a real result for this event?
      const eventHasOtherResult = (eventId: string, excludeId: string) =>
        comp.athleteIds.some(
          (otherId) => otherId !== excludeId && merged[otherId]?.[eventId] != null && merged[otherId][eventId] !== DNS_MARK,
        );

      for (const athleteId of comp.athleteIds) {
        if (!merged[athleteId]) continue;
        const athleteResults = merged[athleteId];

        // Find the last event index this athlete has a real result for
        let lastResultIdx = -1;
        for (let i = events.length - 1; i >= 0; i--) {
          const val = athleteResults[events[i].id];
          if (val != null && val !== DNS_MARK) {
            lastResultIdx = i;
            break;
          }
        }

        // 1) Mid-competition gaps: events before the athlete's last result
        //    that are completed by others but missing for this athlete.
        for (let i = 0; i < lastResultIdx; i++) {
          const eventId = events[i].id;
          if (athleteResults[eventId] != null) continue;
          if (eventHasOtherResult(eventId, athleteId)) {
            merged[athleteId] = { ...merged[athleteId], [eventId]: DNS_MARK };
          }
        }

        // 2) Trailing withdrawal: if at least 2 events after the athlete's
        //    last result have results for other athletes, the athlete has
        //    stopped competing — mark all missing trailing events as DNS.
        if (lastResultIdx >= 0 && lastResultIdx < events.length - 1) {
          let completedAfter = 0;
          for (let i = lastResultIdx + 1; i < events.length; i++) {
            const eventId = events[i].id;
            if (athleteResults[eventId] != null) break; // athlete has a result here, not trailing
            if (eventHasOtherResult(eventId, athleteId)) completedAfter++;
          }

          if (completedAfter >= 2) {
            for (let i = lastResultIdx + 1; i < events.length; i++) {
              const eventId = events[i].id;
              if (athleteResults[eventId] != null) continue;
              if (eventHasOtherResult(eventId, athleteId)) {
                merged[athleteId] = { ...merged[athleteId], [eventId]: DNS_MARK };
              }
            }
          }
        }
      }

      await api.updateCompetition(comp.id, { results: merged });
      await get().fetchOne(comp.id);
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ syncing: false });
    }
  },
}));
