'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, ChevronRight } from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/button';
import { NamedAvatar } from '@/components/ui/avatar';
import { formatCurrency, validateAmount } from '@/lib/utils';

const QUICK_AMOUNTS = ['50', '100', '250', '500'];

const NUMPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

export function AmountEntry() {
  const { recipient, amount, narration, setAmount, setNarration, setStep } = useSendStore();
  const { wallet } = useAuthStore();
  const [error, setError] = useState('');

  const handleKey = (key: string) => {
    setError('');

    if (key === 'del') {
      setAmount(amount.slice(0, -1));
      return;
    }

    // Prevent leading zeros (except "0.")
    if (key !== '.' && amount === '0') {
      setAmount(key);
      return;
    }

    // Only one decimal point
    if (key === '.' && amount.includes('.')) return;

    // Max 2 decimal places
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;

    // Max length guard
    if (amount.replace('.', '').length >= 10) return;

    setAmount(amount + key);
  };

  const handleContinue = () => {
    const val = amount || '0';
    const err = validateAmount(val);
    if (err) { setError(err); return; }

    const num = parseFloat(val);
    if (wallet && num > wallet.balance) {
      setError(`Exceeds balance (${formatCurrency(wallet.balance)} available)`);
      return;
    }
    setStep('confirm');
  };

  const displayAmount = amount || '0';
  const numValue = parseFloat(displayAmount);
  const isValid = !isNaN(numValue) && numValue > 0;

  if (!recipient) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Recipient pill */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mx-4 p-3 rounded-2xl bg-white/5 border border-white/8 mb-8"
      >
        <NamedAvatar name={recipient.full_name} avatarUrl={recipient.avatar_url} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Sending to</p>
          <p className="text-white font-semibold text-sm truncate">{recipient.full_name}</p>
        </div>
        <button
          type="button"
          onClick={() => setStep('search')}
          className="text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors"
        >
          Change
        </button>
      </motion.div>

      {/* Amount display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 mb-4">
        <motion.div
          className="flex items-baseline gap-2 mb-2"
          animate={error ? { x: [-6, 6, -6, 6, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className={`text-3xl font-bold transition-colors ${isValid ? 'text-white/50' : 'text-white/20'}`}>$</span>
          <span className={`tabular-nums font-bold tracking-tight transition-all ${
            displayAmount.length > 7 ? 'text-3xl' : displayAmount.length > 4 ? 'text-5xl' : 'text-6xl'
          } ${isValid ? 'text-white' : 'text-white/30'}`}>
            {displayAmount}
          </span>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {wallet && !error && (
          <p className="text-white/25 text-xs mt-1.5">
            Balance: {formatCurrency(wallet.balance)}
          </p>
        )}

        {/* Quick-amount chips */}
        <div className="flex gap-2 mt-5">
          {QUICK_AMOUNTS.map((qa) => (
            <button
              key={qa}
              type="button"
              onClick={() => { setAmount(qa); setError(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                amount === qa
                  ? 'bg-violet-500/30 text-violet-300 border-violet-500/50'
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              ${qa}
            </button>
          ))}
        </div>
      </div>

      {/* Note input */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Add a note (optional)"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          maxLength={100}
          className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
        />
      </div>

      {/* Numpad */}
      <div className="px-6 mb-4">
        <div className="grid grid-cols-3 gap-2">
          {NUMPAD.flat().map((key, idx) => {
            const isDel = key === 'del';
            return (
              <button
                key={`${key}-${idx}`}
                type="button"
                aria-label={isDel ? 'Delete digit' : key === '.' ? 'Decimal point' : `Digit ${key}`}
                onClick={() => handleKey(key)}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all duration-100 active:scale-90 ${
                  isDel
                    ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 flex items-center justify-center'
                    : key === '.'
                    ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    : 'bg-white/8 border border-white/8 text-white hover:bg-white/12 active:bg-violet-500/20'
                }`}
              >
                {isDel ? (
                  <Delete className="w-5 h-5 mx-auto" />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="px-4">
        <Button
          className="w-full"
          size="lg"
          onClick={handleContinue}
          disabled={!isValid}
        >
          Continue — {isValid ? formatCurrency(numValue) : '$0.00'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
