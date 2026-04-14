import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Profile, Wallet } from '@/types';

interface AuthState {
  profile: Profile | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPin: boolean;

  setProfile: (profile: Profile | null) => void;
  setWallet: (wallet: Wallet | null) => void;
  updateBalance: (balance: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      profile: null,
      wallet: null,
      isLoading: true,
      isAuthenticated: false,
      hasPin: false,

      setProfile: (profile) =>
        set({
          profile,
          isAuthenticated: !!profile,
          hasPin: !!(profile?.pin_hash && profile.pin_hash !== ''),
        }),

      setWallet: (wallet) => set({ wallet }),

      updateBalance: (balance) =>
        set((state) => ({
          wallet: state.wallet ? { ...state.wallet, balance } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      reset: () =>
        set({
          profile: null,
          wallet: null,
          isLoading: false,
          isAuthenticated: false,
          hasPin: false,
        }),
    }),
    { name: 'ndpay-auth' }
  )
);
