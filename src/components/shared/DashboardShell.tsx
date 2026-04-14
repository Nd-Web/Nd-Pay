'use client';

import { OnboardingCarousel } from './OnboardingCarousel';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OnboardingCarousel />
      {children}
    </>
  );
}
