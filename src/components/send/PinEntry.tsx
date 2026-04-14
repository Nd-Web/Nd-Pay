'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Delete, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSendStore } from '@/lib/stores/sendStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { parseTransferError, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { TransferResult } from '@/types';

const NUM_DIGITS = 4;

export function PinEntry() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { recipient, amount, narration, setResult, setStep } = useSendStore();
  const { profile, updateBalance } = useAuthStore();

  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const transferMutation = useMutation({
    mutationFn: async (enteredPin: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !recipient) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('execute_transfer', {
        p_sender_id: user.id,
        p_receiver_id: recipient.id,
        p_amount: parseFloat(amount),
        p_pin: enteredPin,
        p_narration: narration || undefined,
      } as never);

      if (error) throw new Error(error.message);
      return data as unknown as TransferResult;
    },
    onSuccess: (result) => {
      setResult(result);
      updateBalance(result.sender_balance);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setStep('success');
    },
    onError: (error: Error) => {
      const msg = parseTransferError(error.message);
      toast.error('Transfer failed', { description: msg });

      if (error.message.includes('INVALID_PIN')) {
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 600);
      } else {
        // Non-PIN errors (insufficient funds, etc.) — go back to confirm
        setPin('');
        setTimeout(() => setStep('confirm'), 500);
      }
    },
  });

  const handleDigit = (digit: string) => {
    if (pin.length >= NUM_DIGITS || transferMutation.isPending) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === NUM_DIGITS) {
      setTimeout(() => transferMutation.mutate(next), 200);
    }
  };

  const handleDelete = () => {
    if (transferMutation.isPending) return;
    setPin(pin.slice(0, -1));
  };

  const numpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  if (!recipient || !amount) return null;

  return (
    <div className="flex flex-col items-center px-4 pt-4">
      {/* Lock icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center mb-6"
      >
        <Shield className="w-8 h-8 text-violet-400" />
      </motion.div>

      <h2 className="text-xl font-bold text-white mb-2">Enter your PIN</h2>
      <p className="text-white/40 text-sm mb-2 text-center">
        Authorizing {formatCurrency(parseFloat(amount))} to {recipient.full_name}
      </p>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-4 my-8"
      >
        {Array.from({ length: NUM_DIGITS }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < pin.length
                ? 'bg-violet-500 shadow-lg shadow-violet-500/40 scale-110'
                : 'bg-white/15 border border-white/20'
            }`}
          />
        ))}
      </motion.div>

      {/* Loading overlay */}
      <AnimatePresence>
        {transferMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-violet-400 text-sm mb-4"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing transfer...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {numpadKeys.flat().map((key, idx) => {
          if (!key) return <div key={idx} />;

          if (key === 'del') {
            return (
              <button
                key={key}
                type="button"
                aria-label="Delete last digit"
                onClick={handleDelete}
                disabled={transferMutation.isPending}
                className="numpad-btn h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all duration-150 disabled:opacity-30 active:scale-90"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              aria-label={`Digit ${key}`}
              onClick={() => handleDigit(key)}
              disabled={transferMutation.isPending || pin.length >= NUM_DIGITS}
              className="numpad-btn h-14 text-xl font-semibold text-white rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-150 disabled:opacity-30 active:scale-90 active:bg-violet-500/20"
            >
              {key}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setStep('confirm')}
        className="mt-8 text-white/30 text-sm hover:text-white/50 transition-colors"
        disabled={transferMutation.isPending}
      >
        Cancel
      </button>
    </div>
  );
}
