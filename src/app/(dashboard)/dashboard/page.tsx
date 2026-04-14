'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell, ChevronRight, Send, Zap, Plus,
  ArrowLeftRight, DownloadCloud, Clock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { useAddMoney } from '@/hooks/useAddMoney';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { SavedContacts } from '@/components/dashboard/SavedContacts';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { NamedAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Quick action config
const quickActions = [
  { href: '/send', icon: Send, label: 'Send', color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30', action: null },
  { href: '/transactions', icon: ArrowLeftRight, label: 'History', color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30', action: null },
  { href: null, icon: Plus, label: 'Add $1K', color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30', action: 'fund' },
  { href: '/notifications', icon: Bell, label: 'Alerts', color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30', action: null },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { profile, isLoading } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { data: recentTxns, isLoading: txnLoading } = useRecentTransactions();
  const addMoney = useAddMoney();

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          {isLoading ? (
            <>
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="w-20 h-2.5" />
                <Skeleton className="w-32 h-4" />
              </div>
            </>
          ) : (
            <>
              <NamedAvatar name={profile?.full_name ?? 'User'} avatarUrl={profile?.avatar_url} size="md" />
              <div>
                <p className="text-white/40 text-xs">{getGreeting()},</p>
                <p className="text-white font-bold text-base leading-tight">
                  {profile?.full_name?.split(' ')[0] ?? 'Friend'} 👋
                </p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/notifications"
            className="relative p-2.5 rounded-xl glass border border-white/10 block"
          >
            <Bell className="w-5 h-5 text-white/70" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </Link>
        </motion.div>
      </div>

      {/* ── Balance Card ── */}
      <div className="mb-6">
        {isLoading ? (
          <div className="mx-4">
            <Skeleton className="h-44 rounded-3xl" />
          </div>
        ) : (
          <BalanceCard />
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-4 gap-3 px-4 mb-8">
        {quickActions.map(({ href, icon: Icon, label, color, shadow, action }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.05 }}
          >
            {action === 'fund' ? (
              <button
                type="button"
                onClick={() => addMoney.mutate()}
                disabled={addMoney.isPending}
                className="flex flex-col items-center gap-2 w-full group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} transition-all duration-200 group-hover:scale-105 group-active:scale-95 group-disabled:opacity-60`}>
                  {addMoney.isPending
                    ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  }
                </div>
                <span className="text-white/60 text-xs font-medium group-hover:text-white/80 transition-colors">
                  {label}
                </span>
              </button>
            ) : (
              <Link href={href!} className="flex flex-col items-center gap-2 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} transition-all duration-200 group-hover:scale-105 group-active:scale-95`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <span className="text-white/60 text-xs font-medium group-hover:text-white/80 transition-colors">
                  {label}
                </span>
              </Link>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Saved Contacts ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-white font-semibold text-sm">Quick Send</h2>
          <Link href="/send" className="text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors">
            Find someone
          </Link>
        </div>
        <SavedContacts />
      </motion.div>

      {/* ── Recent Transactions ── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-base">Recent Activity</h2>
          <Link
            href="/transactions"
            className="text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            See all
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {txnLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : recentTxns && recentTxns.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-1"
          >
            {recentTxns.map((txn, i) => (
              <TransactionItem key={txn.id} transaction={txn} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/40 text-sm font-medium mb-1">No transactions yet</p>
            <p className="text-white/25 text-xs mb-6">Your recent activity will appear here</p>
            <Link href="/send">
              <Button size="sm" variant="outline">
                <Send className="w-3.5 h-3.5" />
                Send your first transfer
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
