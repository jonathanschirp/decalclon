import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  init: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'light',

  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  },

  init: () => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored ?? preferred;
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
}));
