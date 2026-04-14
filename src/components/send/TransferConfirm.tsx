'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield } from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { Button } from '@/components/ui/button';
import { NamedAvatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';

export function TransferConfirm() {
  const { recipient, amount, narration, setStep } = useSendStore();

  if (!recipient || !amount) return null;

  const fee = 0; // Free transfers in demo
  const total = parseFloat(amount) + fee;

  return (
    <div className="flex flex-col px-4">
      {/* Transfer visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-4 py-8"
      >
        <div className="flex flex-col items-center gap-2">
          <NamedAvatar name="You" size="lg" />
          <span className="text-white/40 text-xs">You</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-12 h-px bg-gradient-to-r from-violet-500/50 to-violet-500" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <div className="w-12 h-px bg-gradient-to-l from-violet-500/50 to-violet-500" />
          </div>
          <span className="text-violet-400 font-bold text-lg">{formatCurrency(parseFloat(amount))}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <NamedAvatar name={recipient.full_name} avatarUrl={recipient.avatar_url} size="lg" />
          <span className="text-white/40 text-xs truncate max-w-[80px] text-center">{recipient.full_name.split(' ')[0]}</span>
        </div>
      </motion.div>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-6"
      >
        <div className="divide-y divide-white/5">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-white/50 text-sm">Recipient</span>
            <div className="text-right">
              <p className="text-white text-sm font-medium">{recipient.full_name}</p>
              <p className="text-white/30 text-xs font-mono">···{recipient.account_number.slice(-4)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-white/50 text-sm">Amount</span>
            <span className="text-white text-sm font-semibold">{formatCurrency(parseFloat(amount))}</span>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-white/50 text-sm">Transaction fee</span>
            <span className="text-emerald-400 text-sm font-medium">Free</span>
          </div>

          {narration && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-white/50 text-sm">Note</span>
              <span className="text-white text-sm max-w-[160px] text-right truncate">{narration}</span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-4 bg-white/5">
            <span className="text-white font-semibold text-sm">Total deducted</span>
            <span className="text-white font-bold text-base">{formatCurrency(total)}</span>
          </div>
        </div>
      </motion.div>

      {/* Security note */}
      <div className="flex items-start gap-2 mb-6 px-1">
        <Shield className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-white/40 text-xs leading-relaxed">
          This transfer is secured and processed instantly. You&apos;ll be asked to enter your 4-digit PIN to authorize.
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button className="w-full" size="lg" onClick={() => setStep('pin')}>
          Authorize with PIN
          <Shield className="w-4 h-4" />
        </Button>
        <Button variant="ghost" className="w-full" size="sm" onClick={() => setStep('amount')}>
          Go back
        </Button>
      </div>
    </div>
  );
}
