'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, TransactionFilter } from '@/types';

const PAGE_SIZE = 20;

export function useTransactions(filter?: TransactionFilter) {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: ['transactions', filter],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!transactions_sender_id_fkey(id, full_name, email, account_number, avatar_url),
          receiver:profiles!transactions_receiver_id_fkey(id, full_name, email, account_number, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filter?.type) query = query.eq('type', filter.type);
      if (filter?.status) query = query.eq('status', filter.status);

      if (filter?.direction === 'sent') {
        query = query.eq('sender_id', user.id);
      } else if (filter?.direction === 'received') {
        query = query.eq('receiver_id', user.id);
      }

      if (filter?.dateRange && filter.dateRange !== 'all') {
        const days = { '7d': 7, '30d': 30, '90d': 90 }[filter.dateRange];
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data: data as Transaction[],
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 10_000,
  });
}

export function useRecentTransactions() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!transactions_sender_id_fkey(id, full_name, email, account_number, avatar_url),
          receiver:profiles!transactions_receiver_id_fkey(id, full_name, email, account_number, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Transaction[];
    },
    staleTime: 15_000,
  });
}

export function useTransaction(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!transactions_sender_id_fkey(id, full_name, email, account_number, avatar_url),
          receiver:profiles!transactions_receiver_id_fkey(id, full_name, email, account_number, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    enabled: !!id,
  });
}
