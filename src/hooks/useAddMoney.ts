'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';
import { playCreditSound } from '@/lib/sounds';
import { formatCurrency } from '@/lib/utils';

export function useAddMoney() {
  const queryClient = useQueryClient();
  const { updateBalance } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/wallet/fund', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add money');
      }
      return res.json() as Promise<{ success: boolean; new_balance: number; amount: number }>;
    },
    onSuccess: (data) => {
      updateBalance(data.new_balance);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      playCreditSound();
      toast.success(`${formatCurrency(data.amount)} added to your wallet!`, {
        description: `New balance: ${formatCurrency(data.new_balance)}`,
        duration: 5000,
      });
    },
    onError: (err: Error) => {
      toast.error('Could not add money', { description: err.message });
    },
  });
}
