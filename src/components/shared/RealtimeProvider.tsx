'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRealtime } from '@/hooks/useRealtime';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();

  // Bootstrap data
  useProfile();
  useNotifications();

  // Subscribe to realtime events
  useRealtime(profile?.id);

  return <>{children}</>;
}
