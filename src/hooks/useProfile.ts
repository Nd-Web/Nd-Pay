'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import type { Profile } from '@/types';

export function useProfile() {
  const supabase = createClient();
  const { setProfile, setWallet, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          throw new Error('Not authenticated');
        }

        const [profileResult, walletResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (walletResult.error) throw walletResult.error;

        setProfile(profileResult.data ?? null);
        setWallet(walletResult.data ?? null);
        setLoading(false);

        return { profile: profileResult.data, wallet: walletResult.data };
      } catch (err) {
        setLoading(false);
        throw err;
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useUpdateProfile() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates as never)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], (old: { profile: Profile } | undefined) =>
        old ? { ...old, profile: data } : undefined
      );
      useAuthStore.getState().setProfile(data);
    },
  });
}

export function useSetPin() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pin: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('set_transaction_pin', {
        p_user_id: user.id,
        p_pin: pin,
      } as never);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
