import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'dark',
        toggleTheme: () =>
          set((s) => ({
            theme: s.theme === 'dark' ? 'light' : 'dark',
          })),
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'flowpay-theme' }
    ),
    { name: 'flowpay-theme' }
  )
);
