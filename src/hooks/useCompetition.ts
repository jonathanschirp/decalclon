import { create } from 'zustand';
import type { Competition, CompetitionResults } from '../types';
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
    results[athleteId] = { ...results[athleteId], [eventId]: value };

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

      await api.updateCompetition(comp.id, { results: merged });
      await get().fetchOne(comp.id);
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ syncing: false });
    }
  },
}));
