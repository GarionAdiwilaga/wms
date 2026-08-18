import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const applyThemeToDOM = (theme: Theme) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark as requested
      setTheme: (theme: Theme) => {
        set({ theme });
        applyThemeToDOM(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: Theme = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyThemeToDOM(next);
      },
    }),
    {
      name: 'gpk_theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM('dark');
        }
      },
    }
  )
);

// Initialize system listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      applyThemeToDOM('system');
    }
  });
}
