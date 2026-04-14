'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'light') {
      root.style.setProperty('--background',      '#FFFFFF');
      root.style.setProperty('--foreground',      '#0A0A0F');
      root.style.setProperty('--fp-card',         '#F5F5FA');
      root.style.setProperty('--fp-surface',      '#ECECF4');
      root.style.setProperty('--fp-overlay',      'rgba(0,0,0,0.03)');
      root.style.setProperty('--fp-border',       'rgba(0,0,0,0.07)');
      root.style.setProperty('--fp-border-mid',   'rgba(0,0,0,0.12)');
      root.style.setProperty('--fp-text-muted',   '#6B7280');
      /* Legacy compat */
      root.style.setProperty('--bg-primary',      '#FFFFFF');
      root.style.setProperty('--bg-card',         '#F5F5FA');
      root.style.setProperty('--bg-surface',      'rgba(0,0,0,0.03)');
      root.style.setProperty('--text-primary',    '#0A0A0F');
      root.style.setProperty('--text-secondary',  '#6B7280');
      root.style.setProperty('--border-color',    'rgba(0,0,0,0.07)');
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.style.setProperty('--background',      '#0A0A0F');
      root.style.setProperty('--foreground',      '#FFFFFF');
      root.style.setProperty('--fp-card',         '#12121A');
      root.style.setProperty('--fp-surface',      '#1A1A24');
      root.style.setProperty('--fp-overlay',      'rgba(255,255,255,0.03)');
      root.style.setProperty('--fp-border',       'rgba(255,255,255,0.06)');
      root.style.setProperty('--fp-border-mid',   'rgba(255,255,255,0.10)');
      root.style.setProperty('--fp-text-muted',   '#6B7280');
      /* Legacy compat */
      root.style.setProperty('--bg-primary',      '#0A0A0F');
      root.style.setProperty('--bg-card',         '#12121A');
      root.style.setProperty('--bg-surface',      'rgba(255,255,255,0.03)');
      root.style.setProperty('--text-primary',    '#FFFFFF');
      root.style.setProperty('--text-secondary',  '#6B7280');
      root.style.setProperty('--border-color',    'rgba(255,255,255,0.06)');
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  return <>{children}</>;
}
