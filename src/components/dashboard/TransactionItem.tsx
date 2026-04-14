'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { formatCurrency, formatTransactionDate } from '@/lib/utils';
import { NamedAvatar } from '@/components/ui/avatar';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  index?: number;
}

export function TransactionItem({ transaction, index = 0 }: TransactionItemProps) {
  const { profile } = useAuthStore();
  const isSent = transaction.sender_id === profile?.id;

  const counterpart = isSent ? transaction.receiver : transaction.sender;
  const counterpartName = counterpart?.full_name ?? 'Unknown';

  const sign = isSent ? '-' : '+';
  const amountColor = isSent ? 'text-white' : 'text-emerald-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="transaction-card flex items-center gap-3 p-3 rounded-2xl transition-colors cursor-pointer"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <NamedAvatar
          name={counterpartName}
          avatarUrl={counterpart?.avatar_url}
          size="md"
        />
        <div
          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f0a1e] ${
            isSent
              ? 'bg-white/20'
              : 'bg-emerald-500'
          }`}
        >
          {isSent ? (
            <ArrowUpRight className="w-2.5 h-2.5 text-white/70" />
          ) : (
            <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{counterpartName}</p>
        <p className="text-white/40 text-xs truncate">
          {transaction.narration || (isSent ? 'Sent money' : 'Received money')}
        </p>
      </div>

      {/* Amount & time */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${amountColor}`}>
          {sign}{formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <p className="text-white/30 text-xs mt-0.5">
          {formatTransactionDate(transaction.created_at)}
        </p>
      </div>
    </motion.div>
  );
}
