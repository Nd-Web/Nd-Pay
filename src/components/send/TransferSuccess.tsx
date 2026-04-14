'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Home, Receipt, Send, UserPlus, Check } from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NamedAvatar } from '@/components/ui/avatar';
import { formatCurrency, formatTransactionDate } from '@/lib/utils';
import { playSuccessSound } from '@/lib/sounds';
import { toast } from 'sonner';

// Confetti pieces
function Confetti() {
  const colors = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];
  return (
    <>
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 360;
        const dist = 60 + (i % 3) * 50;
        const x = Math.cos((angle * Math.PI) / 180) * dist;
        const y = Math.sin((angle * Math.PI) / 180) * dist - 30;
        const color = colors[i % colors.length];
        const shape = i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm rotate-45' : 'rounded-none';

        return (
          <motion.div
            key={i}
            className={`absolute w-2.5 h-2.5 pointer-events-none ${shape}`}
            style={{ backgroundColor: color, left: '50%', top: '30%' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0, rotate: angle }}
            transition={{ duration: 1.1, delay: 0.1 + i * 0.015, ease: 'easeOut' }}
          />
        );
      })}
    </>
  );
}

export function TransferSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { recipient, result, reset } = useSendStore();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    playSuccessSound();
  }, []);

  const handleSaveContact = async () => {
    if (!recipient || saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_user_id: recipient.id }),
      });
      if (res.ok) {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        toast.success(`${recipient.full_name} saved to contacts`);
      }
    } catch {
      toast.error('Could not save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    reset();
    router.push('/dashboard');
  };

  const handleSendAgain = () => {
    if (!recipient) { reset(); router.push('/send'); return; }
    // Keep recipient, reset to amount step
    useSendStore.getState().setStep('amount');
    useSendStore.getState().setAmount('');
    useSendStore.getState().setResult(null);
    router.push('/send');
  };

  if (!result || !recipient) return null;

  const txn = result.transaction;

  return (
    <div className="relative flex flex-col items-center px-4 pt-6 pb-8 overflow-hidden">
      <Confetti />

      {/* Success ring + checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        className="relative mb-6"
      >
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/25"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10">
          <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold text-white mb-1">Money Sent!</h2>
        <p className="text-white/50 text-sm">
          {formatCurrency(txn.amount)} transferred to {recipient.full_name}
        </p>
      </motion.div>

      {/* Receipt card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/8">
          <NamedAvatar name={recipient.full_name} avatarUrl={recipient.avatar_url} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{recipient.full_name}</p>
            <p className="text-white/40 text-xs font-mono">···{recipient.account_number.slice(-4)}</p>
          </div>
          <p className="text-emerald-400 font-bold text-xl">{formatCurrency(txn.amount)}</p>
        </div>

        {/* Details */}
        <div className="divide-y divide-white/5 text-sm">
          {[
            { label: 'Reference', value: txn.reference, mono: true },
            {
              label: 'Status', value: (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Completed
                </span>
              )
            },
            txn.narration ? { label: 'Note', value: txn.narration } : null,
            { label: 'Date', value: formatTransactionDate(txn.completed_at) },
            { label: 'Transaction fee', value: <span className="text-emerald-400 font-medium">Free</span> },
          ].filter(Boolean).map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-white/40">{row!.label}</span>
              {typeof row!.value === 'string'
                ? <span className={`text-white/80 ${(row as {mono?: boolean}).mono ? 'font-mono text-xs' : ''} text-right max-w-[55%] truncate`}>{row!.value}</span>
                : row!.value}
            </div>
          ))}
        </div>
      </motion.div>

      {/* New balance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-6 text-center"
      >
        <p className="text-white/25 text-xs">Your new balance</p>
        <p className="text-white/70 font-bold text-xl">{formatCurrency(result.sender_balance)}</p>
      </motion.div>

      {/* Save contact button */}
      <AnimatePresence>
        {!saved && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.55 }}
            onClick={handleSaveContact}
            disabled={saving}
            className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-300 text-sm font-medium hover:bg-violet-500/25 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Save {recipient.full_name.split(' ')[0]} as contact
          </motion.button>
        )}
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            Contact saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full space-y-3"
      >
        <Button className="w-full" size="lg" onClick={handleDone}>
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" onClick={handleSendAgain}>
            <Send className="w-3.5 h-3.5" />
            Send Again
          </Button>
          <Button variant="outline" size="sm" onClick={() => { reset(); router.push('/transactions'); }}>
            <Receipt className="w-3.5 h-3.5" />
            View Receipt
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
