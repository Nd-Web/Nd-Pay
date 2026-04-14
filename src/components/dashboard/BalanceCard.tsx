'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { maskAccountNumber } from '@/lib/utils';

// Animated counter — uses DM Mono via mono-num class
function AnimatedBalance({ value }: { value: number }) {
  const count    = useMotionValue(value);
  const rounded  = useTransform(count, (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)
  );
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' });
    prevValue.current = value;
    return controls.stop;
  }, [value, count]);

  return <motion.span className="mono-num">{rounded}</motion.span>;
}

export function BalanceCard() {
  const { profile, wallet }         = useAuthStore();
  const [balanceVisible, setVisible] = useState(true);
  const [copied, setCopied]          = useState(false);
  const [isShimmering, setShimmer]   = useState(false);
  const prevBalance                  = useRef(wallet?.balance ?? 0);

  // Shimmer sweep whenever balance changes
  useEffect(() => {
    if (wallet && wallet.balance !== prevBalance.current) {
      setShimmer(true);
      setTimeout(() => setShimmer(false), 1200);
      prevBalance.current = wallet.balance;
    }
  }, [wallet?.balance]);

  const handleCopy = () => {
    if (!profile?.account_number) return;
    navigator.clipboard.writeText(profile.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative mx-4 rounded-3xl overflow-hidden"
    >
      {/* FlowPay gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6C5CE7] via-[#7B6FF0] to-[#A29BFE]" />

      {/* Shimmer sweep on balance update */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={isShimmering ? { opacity: [0, 0.40, 0] } : { opacity: 0 }}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.50) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
        }}
      />

      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-14 w-56 h-56 rounded-full bg-white/5" />
      <div className="absolute top-1/2 right-1/4   w-16 h-16 rounded-full bg-white/5" />

      {/* Top edge highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 p-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-0.5">
              Available Balance
            </p>
            <p className="text-white/50 text-sm">
              {wallet?.currency ?? 'USD'} Wallet
            </p>
          </div>
          <button
            type="button"
            aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
            onClick={() => setVisible((v) => !v)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            {balanceVisible
              ? <EyeOff className="w-4 h-4 text-white/70" />
              : <Eye    className="w-4 h-4 text-white/70" />
            }
          </button>
        </div>

        {/* Balance amount — DM Mono via mono-num */}
        <div className="mb-8">
          <motion.div
            key={balanceVisible ? 'show' : 'hide'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {balanceVisible ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/60 text-2xl font-semibold mono-num">$</span>
                <span className="text-5xl font-bold text-white tracking-tight">
                  {wallet != null
                    ? <AnimatedBalance value={wallet.balance} />
                    : <span className="opacity-40 mono-num">—</span>
                  }
                </span>
              </div>
            ) : (
              <p className="text-5xl font-bold text-white/40 tracking-widest mono-num">
                ••••••••
              </p>
            )}
          </motion.div>
        </div>

        {/* Account number */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">
              Account Number
            </p>
            <p className="text-white/80 text-sm mono-num font-medium tracking-wider">
              {profile?.account_number
                ? maskAccountNumber(profile.account_number)
                : '—'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy account number"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70 text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#00D68F]" />
                <span className="text-[#00D68F]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
