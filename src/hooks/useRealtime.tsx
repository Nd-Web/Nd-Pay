'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { toast } from 'sonner';
import { playCreditSound, playDebitSound, playSystemSound } from '@/lib/sounds';
import { formatCurrency } from '@/lib/utils';
import type { Notification, Wallet } from '@/types';

export function useRealtime(userId: string | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { updateBalance } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime:user:${userId}`)

      // ── 1. Wallet balance changes ──────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newWallet = payload.new as Wallet;
          updateBalance(newWallet.balance);
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
      )

      // ── 2. New notifications (credit, debit, system) ──────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          addNotification(notification);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Skip the initial subscription echo (first few ms)
          if (isFirstMount.current) return;

          const amount = notification.metadata?.amount;
          const amountStr = amount ? ` ${formatCurrency(amount)}` : '';

          if (notification.type === 'credit') {
            playCreditSound();
            toast.custom(
              (id) => (
                <CreditToast
                  id={id}
                  title={notification.title}
                  body={notification.body}
                  amount={amount}
                />
              ),
              { duration: 7000, position: 'top-center' }
            );
          } else if (notification.type === 'debit') {
            playDebitSound();
            toast.custom(
              (id) => (
                <DebitToast
                  id={id}
                  title={notification.title}
                  body={notification.body}
                  amount={amount}
                />
              ),
              { duration: 5000, position: 'top-center' }
            );
          } else {
            playSystemSound();
            toast.info(notification.title, {
              description: notification.body,
              duration: 4000,
            });
          }
        }
      )

      // ── 3. New transactions (invalidate feed) ─────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Give it a moment before enabling toast triggers (avoid startup echoes)
          setTimeout(() => { isFirstMount.current = false; }, 1500);
        }
      });

    channelRef.current = channel;

    return () => {
      isFirstMount.current = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);
}

// ── Inline toast components (rendered via toast.custom) ─────────────────────
// These are plain functions, not exported as hooks, so they can be called
// inside the useEffect without violating Rules of Hooks.

function CreditToast({
  id,
  title,
  body,
  amount,
}: {
  id: string | number;
  title: string;
  body: string;
  amount?: number;
}) {
  return (
    <div
      className="flex items-start gap-3 bg-[#0A1A14] border border-[#00D68F]/35 rounded-2xl p-4 shadow-2xl shadow-[#00D68F]/10 max-w-sm w-full cursor-pointer"
      onClick={() => toast.dismiss(id)}
    >
      <div className="w-10 h-10 rounded-full bg-[#00D68F]/15 border border-[#00D68F]/25 flex items-center justify-center shrink-0 text-lg">
        💰
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#00D68F] font-bold text-sm">{title}</p>
        <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{body}</p>
        {amount && (
          <p className="text-[#00D68F] font-bold text-base mt-1 mono-num">
            +{formatCurrency(amount)}
          </p>
        )}
      </div>
    </div>
  );
}

function DebitToast({
  id,
  title,
  body,
  amount,
}: {
  id: string | number;
  title: string;
  body: string;
  amount?: number;
}) {
  return (
    <div
      className="flex items-start gap-3 bg-[#100E1A] border border-[#6C5CE7]/30 rounded-2xl p-4 shadow-2xl shadow-[#6C5CE7]/10 max-w-sm w-full cursor-pointer"
      onClick={() => toast.dismiss(id)}
    >
      <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/15 border border-[#6C5CE7]/25 flex items-center justify-center shrink-0 text-lg">
        📤
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#A29BFE] font-bold text-sm">{title}</p>
        <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{body}</p>
        {amount && (
          <p className="text-[#FF6B6B] font-semibold text-sm mt-1 mono-num">
            -{formatCurrency(amount)}
          </p>
        )}
      </div>
    </div>
  );
}

export function useContactsSearch() {
  const supabase = createClient();

  const searchUsers = async (query: string) => {
    if (!query || query.trim().length < 2) return [];
    const { data, error } = await supabase.rpc('search_users', {
      p_query: query.trim(),
    } as never);
    if (error) throw error;
    return data ?? [];
  };

  return { searchUsers };
}
