'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ChevronRight, Clock, Star, UserSearch,
  CheckCircle2, Send,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { NamedAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { PublicProfile, Contact } from '@/types';

// ── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ── Recipient row (shared) ────────────────────────────────────────────────────
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
            <span className="px-1.5 py-0.5 rounded-md bg-[#6C5CE7]/20 text-[#A29BFE] text-[9px] font-semibold uppercase tracking-wide shrink-0">
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

// ── Step 1: Search ────────────────────────────────────────────────────────────
function RequestSearch({ onSelect }: { onSelect: (u: PublicProfile) => void }) {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 280);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];
      const { data, error } = await supabase.rpc('search_users', { p_query: debouncedQuery.trim() } as never);
      if (error) throw error;
      return (data ?? []) as PublicProfile[];
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact:profiles!contacts_contact_user_id_fkey(id, full_name, email, account_number, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as (Contact & { contact: PublicProfile })[];
    },
    staleTime: 60_000,
  });

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
      type TxnRow = { sender_id: string; receiver_id: string; receiver: PublicProfile | null; sender: PublicProfile | null };
      const seen = new Set<string>();
      const result: PublicProfile[] = [];
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

  const isSearching = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-4 px-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <input
          type="search"
          placeholder="Who do you want to request from?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]/40 transition-all"
          autoFocus
        />
        {query && (
          <button type="button" aria-label="Clear" onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

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
                  <RecipientRow key={u.id} user={u} onSelect={onSelect} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <UserSearch className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No users found for &quot;{debouncedQuery}&quot;</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {contacts && contacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Saved</p>
                </div>
                {contacts.map((c, i) => (
                  <RecipientRow key={c.id} user={c.contact} onSelect={onSelect} badge={c.nickname ? 'saved' : undefined} index={i} />
                ))}
              </div>
            )}
            {recentProfiles && recentProfiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Recent</p>
                </div>
                {recentProfiles.map((u, i) => (
                  <RecipientRow key={u.id} user={u} onSelect={onSelect} badge="recent" index={i} />
                ))}
              </div>
            )}
            {(!contacts || contacts.length === 0) && (!recentProfiles || recentProfiles.length === 0) && (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-7 h-7 text-white/15" />
                </div>
                <p className="text-white/40 text-sm">Search to find someone to request from</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 2: Amount + note ─────────────────────────────────────────────────────
function RequestAmountStep({
  target,
  amount,
  setAmount,
  note,
  setNote,
  onNext,
}: {
  target: PublicProfile;
  amount: string;
  setAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  onNext: () => void;
}) {
  const handleDigit = (d: string) => {
    if (d === '.' && amount.includes('.')) return;
    if (d === '.' && amount === '') { setAmount('0.'); return; }
    const next = amount + d;
    // Max 2 decimal places
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
    setAmount(next);
  };

  const handleDelete = () => setAmount(amount.slice(0, -1));

  const numericVal = parseFloat(amount || '0');
  const isValid = numericVal > 0;

  const numpadKeys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['.','0','del'],
  ];

  return (
    <div className="flex flex-col items-center px-4 pt-2">
      {/* Target */}
      <div className="flex items-center gap-3 mb-8 self-start w-full bg-white/4 border border-white/8 rounded-2xl p-3">
        <NamedAvatar name={target.full_name} avatarUrl={target.avatar_url} size="md" />
        <div>
          <p className="text-white font-semibold text-sm">{target.full_name}</p>
          <p className="text-white/40 text-xs">···{target.account_number.slice(-4)}</p>
        </div>
      </div>

      {/* Amount display */}
      <div className="relative mb-2">
        <span className="text-white/30 text-2xl font-bold absolute -left-6 top-1/2 -translate-y-1/2">₦</span>
        <p className={`text-5xl font-bold mono-num transition-colors ${isValid ? 'text-white' : 'text-white/25'}`}>
          {amount || '0'}
        </p>
      </div>
      <p className="text-white/25 text-sm mb-8">
        Requesting from {target.full_name.split(' ')[0]}
      </p>

      {/* Note */}
      <input
        type="text"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={80}
        className="w-full max-w-[280px] mb-6 h-11 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm text-center placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]/40 transition-all"
      />

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {numpadKeys.flat().map((key, idx) => {
          if (key === 'del') {
            return (
              <button key={idx} type="button" onClick={handleDelete}
                className="numpad-btn h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-[var(--fp-border)] text-[#6B7280] hover:text-white transition-all active:scale-90">
                <X className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button key={key} type="button" onClick={() => handleDigit(key)}
              className="numpad-btn h-14 text-xl font-semibold text-white rounded-2xl bg-white/5 hover:bg-white/10 border border-[var(--fp-border)] transition-all active:scale-90 active:bg-[#6C5CE7]/20 mono-num">
              {key}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!isValid}
        className={`mt-8 w-full max-w-[240px] h-12 rounded-2xl text-white font-semibold text-sm disabled:opacity-30 transition-all active:scale-[0.97] ${isValid ? 'btn-fp-primary' : 'bg-white/6'}`}
      >
        Continue
      </button>
    </div>
  );
}

// ── Step 3: Confirm + submit ──────────────────────────────────────────────────
function RequestConfirmStep({
  target,
  amount,
  note,
  onConfirm,
  onBack,
}: {
  target: PublicProfile;
  amount: string;
  note: string;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}) {
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 pt-2">
      <div className="w-full max-w-sm bg-[var(--fp-surface)] border border-[var(--fp-border-mid)] rounded-3xl p-6 space-y-4 mb-6">
        <h3 className="text-white font-bold text-lg">Review Request</h3>

        <div className="space-y-3">
          {[
            ['Requesting from', target.full_name],
            ['Account', `···${target.account_number.slice(-4)}`],
            ['Amount', formatCurrency(parseFloat(amount))],
            ...(note ? [['Note', note]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-white/40 text-sm">{label}</span>
              <span className="text-white text-sm font-medium text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--fp-border)] pt-4">
          <p className="text-white/25 text-xs leading-relaxed text-center">
            {target.full_name.split(' ')[0]} will receive a notification with an option to pay you back.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="btn-fp-primary w-full max-w-sm h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.97]"
      >
        {pending ? (
          <div className="flex gap-1">
            {[0,1,2].map((i) => (
              <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                animate={{ opacity: [0.3,1,0.3], scale: [0.8,1.2,0.8] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }} />
            ))}
          </div>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Request
          </>
        )}
      </button>

      <button type="button" onClick={onBack}
        className="mt-4 text-[#6B7280] text-sm hover:text-white/50 transition-colors">
        Back
      </button>
    </div>
  );
}

// ── Step 4: Success ───────────────────────────────────────────────────────────
function RequestSuccess({ target, amount, onDone }: { target: PublicProfile; amount: string; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 pt-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="w-20 h-20 rounded-full bg-[#6C5CE7]/15 border-2 border-[#6C5CE7]/30 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-[#A29BFE]" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Request Sent!</h2>
        <p className="text-white/40 text-sm leading-relaxed">
          {target.full_name.split(' ')[0]} has been notified of your request for{' '}
          <span className="text-white font-semibold mono-num">{formatCurrency(parseFloat(amount))}</span>.
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onDone}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="btn-fp-primary mt-10 w-full max-w-sm h-12 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.97]"
      >
        Done
      </motion.button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
type RStep = 'search' | 'amount' | 'confirm' | 'success';

export function RequestFlow({ onDone }: { onDone: () => void }) {
  const [rStep, setRStep]   = useState<RStep>('search');
  const [target, setTarget] = useState<PublicProfile | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');

  const handleSelectTarget = (u: PublicProfile) => {
    setTarget(u);
    setRStep('amount');
  };

  const handleAmountNext = () => {
    if (parseFloat(amount) > 0) setRStep('confirm');
  };

  const handleConfirm = async () => {
    if (!target) return;

    const res = await fetch('/api/request-money', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_id: target.id,
        amount:    parseFloat(amount),
        note:      note || undefined,
      }),
    });

    const data = await res.json() as { error?: string; message?: string };

    if (!res.ok) {
      toast.error('Request failed', { description: data.error ?? data.message ?? 'Unknown error' });
      return;
    }

    setRStep('success');
  };

  const stepProgress = { search: 0.25, amount: 0.6, confirm: 0.85, success: 1 };

  return (
    <div className="flex flex-col">
      {/* Progress bar */}
      {rStep !== 'success' && (
        <div className="mx-4 mb-6 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stepProgress[rStep] * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={rStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          {rStep === 'search' && <RequestSearch onSelect={handleSelectTarget} />}

          {rStep === 'amount' && target && (
            <RequestAmountStep
              target={target}
              amount={amount}
              setAmount={setAmount}
              note={note}
              setNote={setNote}
              onNext={handleAmountNext}
            />
          )}

          {rStep === 'confirm' && target && (
            <RequestConfirmStep
              target={target}
              amount={amount}
              note={note}
              onConfirm={handleConfirm}
              onBack={() => setRStep('amount')}
            />
          )}

          {rStep === 'success' && target && (
            <RequestSuccess
              target={target}
              amount={amount}
              onDone={onDone}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
