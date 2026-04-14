'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, Clock, Star, UserSearch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSendStore } from '@/lib/stores/sendStore';
import { NamedAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicProfile, Contact } from '@/types';

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function RecipientRow({
  user,
  onSelect,
  badge,
  index = 0,
}: {
  user: PublicProfile;
  onSelect: (u: PublicProfile) => void;
  badge?: string;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(user)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group"
    >
      <NamedAvatar name={user.full_name} avatarUrl={user.avatar_url} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white font-medium text-sm truncate">{user.full_name}</p>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-400 text-[9px] font-semibold uppercase tracking-wide shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs truncate">{user.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-white/20 text-xs font-mono">···{user.account_number.slice(-4)}</span>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.button>
  );
}

export function RecipientSearch() {
  const supabase = createClient();
  const { setRecipient, setStep } = useSendStore();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 280);

  // Search results
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];
      const { data, error } = await supabase.rpc('search_users', {
        p_query: debouncedQuery.trim(),
      } as never);
      if (error) throw error;
      return (data ?? []) as PublicProfile[];
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });

  // Saved contacts
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact:profiles!contacts_contact_user_id_fkey(id, full_name, email, account_number, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as (Contact & { contact: PublicProfile })[];
    },
    staleTime: 60_000,
  });

  // Recent transactions for "recent contacts"
  const { data: recentProfiles } = useQuery({
    queryKey: ['recent-contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('receiver_id, sender_id, receiver:profiles!transactions_receiver_id_fkey(id, full_name, email, account_number, avatar_url), sender:profiles!transactions_sender_id_fkey(id, full_name, email, account_number, avatar_url)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return [];

      // Collect unique counterparts
      const seen = new Set<string>();
      const result: PublicProfile[] = [];

      type TxnRow = { sender_id: string; receiver_id: string; receiver: PublicProfile | null; sender: PublicProfile | null };
      for (const txn of (data ?? []) as unknown as TxnRow[]) {
        const counterpart = txn.sender_id === user.id ? txn.receiver : txn.sender;
        if (counterpart && !seen.has(counterpart.id)) {
          seen.add(counterpart.id);
          result.push(counterpart);
        }
        if (result.length >= 5) break;
      }

      return result;
    },
    staleTime: 30_000,
  });

  const handleSelect = (user: PublicProfile) => {
    setRecipient(user);
    setStep('amount');
  };

  const isSearching = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-4 px-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <input
          type="search"
          placeholder="Name, email, or account number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
          autoFocus
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Search results */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {searchLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-white/30 text-xs font-medium px-1">Search results</p>
                {searchResults.map((u, i) => (
                  <RecipientRow key={u.id} user={u} onSelect={handleSelect} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <UserSearch className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No users found for &quot;{debouncedQuery}&quot;</p>
                <p className="text-white/20 text-xs mt-1">Try a different name, email, or account number</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Saved contacts */}
            {contacts && contacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Saved</p>
                </div>
                {contacts.map((c, i) => (
                  <RecipientRow
                    key={c.id}
                    user={c.contact}
                    onSelect={handleSelect}
                    badge={c.nickname ? 'saved' : undefined}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Recent */}
            {recentProfiles && recentProfiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Recent</p>
                </div>
                {recentProfiles.map((u, i) => (
                  <RecipientRow key={u.id} user={u} onSelect={handleSelect} badge="recent" index={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {(!contacts || contacts.length === 0) && (!recentProfiles || recentProfiles.length === 0) && (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-7 h-7 text-white/15" />
                </div>
                <p className="text-white/40 text-sm">Search to find someone to send to</p>
                <p className="text-white/20 text-xs mt-1">Min. 2 characters · name, email, or account number</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
