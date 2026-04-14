'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownLeft, RefreshCw,
  ArrowLeftRight, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuthStore } from '@/lib/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { NamedAvatar } from '@/components/ui/avatar';
import { formatCurrency, formatTransactionDate } from '@/lib/utils';
import type { Transaction, TransactionFilter } from '@/types';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Transaction['status'] }) {
  const map: Record<Transaction['status'], { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
    completed: { label: 'Completed', variant: 'success' },
    pending:   { label: 'Pending',   variant: 'warning' },
    failed:    { label: 'Failed',    variant: 'destructive' },
    reversed:  { label: 'Reversed',  variant: 'secondary' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Expandable transaction row ────────────────────────────────────────────────
function TransactionRow({ transaction, index = 0 }: { transaction: Transaction; index?: number }) {
  const { profile } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSent = transaction.sender_id === profile?.id;
  const counterpart = isSent ? transaction.receiver : transaction.sender;
  const counterpartName = counterpart?.full_name ?? 'Unknown';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(transaction.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden hover:bg-white/7 transition-colors"
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        {/* Avatar + direction icon */}
        <div className="relative shrink-0">
          <NamedAvatar name={counterpartName} avatarUrl={counterpart?.avatar_url} size="md" />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0A0A0F] flex items-center justify-center ${isSent ? 'bg-white/20' : 'bg-[#00D68F]'}`}>
            {isSent
              ? <ArrowUpRight className="w-2.5 h-2.5 text-white/70" />
              : <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
            }
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{counterpartName}</p>
          <p className="text-white/35 text-xs truncate">{transaction.narration || (isSent ? 'Sent money' : 'Received money')}</p>
        </div>

        {/* Amount + expand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold mono-num ${isSent ? 'text-white' : 'text-[#00D68F]'}`}>
              {isSent ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
            </p>
            <p className="text-white/25 text-[10px]">{format(new Date(transaction.created_at), 'h:mm a')}</p>
          </div>
          <div className="text-white/20">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/8 px-4 py-4 space-y-3">
              {/* Reference */}
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Reference</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs font-mono">{transaction.reference}</span>
                  <button
                    type="button"
                    aria-label="Copy reference"
                    onClick={handleCopy}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied
                      ? <Check className="w-3 h-3 text-[#00D68F]" />
                      : <Copy className="w-3 h-3 text-white/30" />
                    }
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Status</span>
                <StatusBadge status={transaction.status} />
              </div>

              {/* Type */}
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Type</span>
                <span className="text-white/60 text-xs capitalize">{transaction.type}</span>
              </div>

              {/* Narration */}
              {transaction.narration && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/40 text-xs shrink-0">Note</span>
                  <span className="text-white/60 text-xs text-right">{transaction.narration}</span>
                </div>
              )}

              {/* Full timestamp */}
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Date & Time</span>
                <span className="text-white/50 text-xs">{formatTransactionDate(transaction.created_at)}</span>
              </div>

              {/* Counterpart account */}
              {counterpart && (
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-xs">{isSent ? 'Recipient' : 'Sender'} account</span>
                  <span className="text-white/50 text-xs font-mono">···{counterpart.account_number.slice(-4)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Date group header ─────────────────────────────────────────────────────────
function DateGroupHeader({ dateKey }: { dateKey: string }) {
  const date = new Date(dateKey);
  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-white/35 text-xs font-semibold uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

// ── Group transactions by date ────────────────────────────────────────────────
function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const txn of transactions) {
    const key = format(new Date(txn.created_at), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(txn);
  }
  return groups;
}

// ── Filter pills ──────────────────────────────────────────────────────────────
const directionFilters = [
  { value: 'all',      label: 'All' },
  { value: 'sent',     label: 'Sent',     Icon: ArrowUpRight },
  { value: 'received', label: 'Received', Icon: ArrowDownLeft },
] as const;

const dateFilters = [
  { value: 'all', label: 'All time' },
  { value: '7d',  label: '7 days'   },
  { value: '30d', label: '30 days'  },
  { value: '90d', label: '3 months' },
] as const;

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { profile } = useAuthStore();
  const [filter, setFilter] = useState<TransactionFilter>({ direction: 'all', dateRange: 'all' });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useTransactions(filter);
  const allTxns = data?.pages.flatMap((p) => p.data) ?? [];

  const totalSent = allTxns
    .filter((t) => t.sender_id === profile?.id && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);
  const totalReceived = allTxns
    .filter((t) => t.receiver_id === profile?.id && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);

  const groups = groupByDate(allTxns);
  const sortedKeys = Object.keys(groups).sort((a, b) => (b > a ? 1 : -1));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">History</h1>
          <p className="text-white/35 text-sm">{allTxns.length} transactions</p>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          onClick={() => refetch()}
          className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Stats */}
      {!isLoading && allTxns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mx-4 mb-5"
        >
          <div className="rounded-2xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/15 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#FF6B6B]" />
              <span className="text-[#FF6B6B] text-[10px] font-semibold uppercase tracking-wide">Sent</span>
            </div>
            <p className="text-white font-bold text-lg mono-num">{formatCurrency(totalSent, 'USD', true)}</p>
          </div>
          <div className="rounded-2xl bg-[#00D68F]/10 border border-[#00D68F]/15 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#00D68F]" />
              <span className="text-[#00D68F] text-[10px] font-semibold uppercase tracking-wide">Received</span>
            </div>
            <p className="text-white font-bold text-lg mono-num">{formatCurrency(totalReceived, 'USD', true)}</p>
          </div>
        </motion.div>
      )}

      {/* Direction filter */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {directionFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter((f) => ({ ...f, direction: item.value }))}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter.direction === item.value
                ? 'bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/40'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            {'Icon' in item && <item.Icon className="w-3.5 h-3.5" />}
            {item.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {dateFilters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter((f) => ({ ...f, dateRange: value }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filter.dateRange === value
                ? 'bg-white/15 text-white border border-white/25'
                : 'bg-white/5 text-white/40 border border-white/8 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="px-4 space-y-1 pb-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-2xl mb-2" />)
        ) : allTxns.length > 0 ? (
          <>
            {sortedKeys.map((dateKey) => (
              <div key={dateKey}>
                <DateGroupHeader dateKey={dateKey} />
                <div className="space-y-1.5">
                  {groups[dateKey].map((txn, i) => (
                    <TransactionRow key={txn.id} transaction={txn} index={i} />
                  ))}
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/40 text-sm font-medium mb-1">No transactions found</p>
            <p className="text-white/25 text-xs">Try adjusting the filters above</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
