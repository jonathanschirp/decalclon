import { create } from 'zustand';
import type { Athlete } from '../types';
import * as api from '../lib/firebase';

interface AthletesState {
  athletes: Athlete[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchByGender: (gender: 'male' | 'female') => Promise<void>;
  create: (data: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, data: Partial<Omit<Athlete, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Athlete | undefined;
}

export const useAthletes = create<AthletesState>((set, get) => ({
  athletes: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const athletes = await api.fetchAthletes();
      set({ athletes, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchByGender: async (gender) => {
    set({ loading: true, error: null });
    try {
      const athletes = await api.fetchAthletesByGender(gender);
      set({ athletes, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  create: async (data) => {
    const id = await api.createAthlete(data);
    await get().fetch();
    return id;
  },

  update: async (id, data) => {
    await api.updateAthlete(id, data);
    await get().fetch();
  },

  remove: async (id) => {
    await api.deleteAthlete(id);
    await get().fetch();
  },

  getById: (id) => get().athletes.find((a) => a.id === id),
}));
