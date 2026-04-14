'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Delete, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendStore } from '@/lib/stores/sendStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { TransferResult } from '@/types';

const NUM_DIGITS = 4;

// ── Pulsing dots "transfer in progress" indicator ─────────────────────────────
function ProcessingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 text-[#A29BFE] text-sm py-1"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] inline-block"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span>Transfer in progress…</span>
    </motion.div>
  );
}

// ── Lockout countdown display ─────────────────────────────────────────────────
function LockoutBanner({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[280px] rounded-2xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/25 px-5 py-4 text-center"
    >
      <Lock className="w-6 h-6 text-[#FF6B6B] mx-auto mb-2" />
      <p className="text-[#FF6B6B] font-semibold text-sm mb-0.5">PIN Locked</p>
      <p className="text-white/40 text-xs leading-relaxed">
        Too many wrong attempts.<br />Try again in{' '}
        <span className="text-[#FF6B6B] font-bold mono-num">{label}</span>
      </p>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PinEntry() {
  const queryClient = useQueryClient();
  const { recipient, amount, narration, setResult, setStep } = useSendStore();
  const { updateBalance } = useAuthStore();

  const [pin, setPin]                   = useState('');
  const [shake, setShake]               = useState(false);
  const [isPending, setIsPending]       = useState(false);
  const [lockoutSecs, setLockoutSecs]   = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // Countdown timer when locked
  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const id = setInterval(() => {
      setLockoutSecs((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSecs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const executeTransfer = async (enteredPin: string) => {
    if (!recipient || !amount) return;
    setIsPending(true);

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: recipient.id,
          amount:      parseFloat(amount),
          pin:         enteredPin,
          narration:   narration || undefined,
        }),
      });

      const data = await res.json() as {
        error?: string;
        message?: string;
        seconds_remaining?: number;
        attempts_remaining?: number;
        locked?: boolean;
      } & Partial<TransferResult>;

      if (!res.ok) {
        const errCode = data.error ?? '';

        // ── Locked out ──────────────────────────────────────────────────────
        if (res.status === 429 || errCode === 'PIN_LOCKED') {
          const secs = data.seconds_remaining ?? 900;
          setLockoutSecs(secs);
          setPin('');
          toast.error('PIN locked', {
            description: data.message ?? 'Try again after the lockout expires.',
          });
          return;
        }

        // ── Wrong PIN ───────────────────────────────────────────────────────
        if (errCode === 'INVALID_PIN') {
          const remaining = data.attempts_remaining ?? 0;
          setAttemptsLeft(remaining);

          if (data.locked || remaining === 0) {
            setLockoutSecs(15 * 60);
          }

          setShake(true);
          setPin('');
          setTimeout(() => setShake(false), 600);

          toast.error('Incorrect PIN', {
            description: remaining > 0
              ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining`
              : 'Account locked for 15 minutes',
          });
          return;
        }

        // ── Other errors (insufficient funds, etc.) ─────────────────────────
        toast.error('Transfer failed', { description: data.message ?? data.error ?? 'Unknown error' });
        setPin('');
        setTimeout(() => setStep('confirm'), 500);
        return;
      }

      // ── Success ─────────────────────────────────────────────────────────────
      const result = data as unknown as TransferResult;
      setResult(result);
      updateBalance(result.sender_balance);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setStep('success');

    } catch {
      toast.error('Network error', { description: 'Could not reach the server.' });
      setPin('');
    } finally {
      setIsPending(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= NUM_DIGITS || isPending || lockoutSecs > 0) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === NUM_DIGITS) {
      setTimeout(() => executeTransfer(next), 200);
    }
  };

  const handleDelete = () => {
    if (isPending || lockoutSecs > 0) return;
    setPin(pin.slice(0, -1));
  };

  const numpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  if (!recipient || !amount) return null;

  const isDisabled = isPending || lockoutSecs > 0;

  return (
    <div className="flex flex-col items-center px-4 pt-4">
      {/* Shield icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-16 h-16 rounded-2xl bg-[#6C5CE7]/15 border border-[#6C5CE7]/25 flex items-center justify-center mb-6"
      >
        <Shield className="w-8 h-8 text-[#A29BFE]" />
      </motion.div>

      <h2 className="text-xl font-bold text-white mb-1">Enter your PIN</h2>
      <p className="text-[#6B7280] text-sm mb-2 text-center">
        Authorizing {formatCurrency(parseFloat(amount))} to {recipient.full_name}
      </p>

      {/* Attempts remaining hint */}
      <AnimatePresence>
        {attemptsLeft < 5 && attemptsLeft > 0 && lockoutSecs === 0 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[#FF6B6B]/70 text-xs mb-2"
          >
            {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining before lockout
          </motion.p>
        )}
      </AnimatePresence>

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
                ? 'bg-[#6C5CE7] shadow-lg shadow-[#6C5CE7]/40 scale-110'
                : 'bg-white/15 border border-white/20'
            }`}
          />
        ))}
      </motion.div>

      {/* Activity indicator / lockout banner */}
      <AnimatePresence mode="wait">
        {isPending && <ProcessingIndicator key="processing" />}
        {lockoutSecs > 0 && !isPending && (
          <motion.div key="lockout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LockoutBanner seconds={lockoutSecs} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mt-6">
        {numpadKeys.flat().map((key, idx) => {
          if (!key) return <div key={idx} />;

          if (key === 'del') {
            return (
              <button
                key={key}
                type="button"
                aria-label="Delete last digit"
                onClick={handleDelete}
                disabled={isDisabled}
                className="numpad-btn h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-[var(--fp-border)] text-[#6B7280] hover:text-white transition-all duration-150 disabled:opacity-30 active:scale-90"
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
              disabled={isDisabled || pin.length >= NUM_DIGITS}
              className="numpad-btn h-14 text-xl font-semibold text-white rounded-2xl bg-white/5 hover:bg-white/10 border border-[var(--fp-border)] transition-all duration-150 disabled:opacity-30 active:scale-90 active:bg-[#6C5CE7]/20 mono-num"
            >
              {key}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setStep('confirm')}
        className="mt-8 text-[#6B7280] text-sm hover:text-white/50 transition-colors"
        disabled={isPending}
      >
        Cancel
      </button>
    </div>
  );
}
