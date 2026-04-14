'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Delete } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const NUM_DIGITS = 4;

type Step = 'enter' | 'confirm';

export default function SetupPinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length >= NUM_DIGITS) return;
    const next = currentPin + digit;
    setCurrentPin(next);
    setError('');

    if (next.length === NUM_DIGITS) {
      if (step === 'enter') {
        setTimeout(() => setStep('confirm'), 300);
      } else {
        // Confirm step complete
        setTimeout(() => handleConfirm(next), 300);
      }
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
    setError('');
  };

  const handleConfirm = async (confirmValue: string) => {
    if (confirmValue !== pin) {
      setError('PINs do not match. Try again.');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
        setConfirmPin('');
        setStep('enter');
      }, 600);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('set_transaction_pin', {
        p_user_id: user.id,
        p_pin: pin,
      } as never);

      if (error) throw error;

      toast.success('PIN set successfully!', {
        description: 'Your account is now fully secured.',
      });
      router.push('/dashboard');
    } catch (err) {
      toast.error('Failed to set PIN. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('enter');
    } finally {
      setLoading(false);
    }
  };

  const numpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">NdPay</span>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 shadow-2xl">
        {/* Shield icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-violet-400" />
          </div>
        </div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 'enter' ? 'Set your PIN' : 'Confirm your PIN'}
            </h1>
            <p className="text-white/50 text-sm">
              {step === 'enter'
                ? 'Choose a 4-digit PIN to authorize transfers'
                : 'Enter your PIN one more time to confirm'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* PIN Dots */}
        <motion.div
          animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          {Array.from({ length: NUM_DIGITS }).map((_, i) => (
            <motion.div
              key={`${step}-${i}`}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < currentPin.length
                  ? 'bg-violet-500 scale-110 shadow-lg shadow-violet-500/40'
                  : 'bg-white/15 border border-white/20'
              }`}
              animate={i < currentPin.length ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.15 }}
            />
          ))}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm mb-4 -mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {numpadKeys.flat().map((key, idx) => {
            if (!key) return <div key={idx} />;

            if (key === 'del') {
              return (
                <button
                  key={key}
                  type="button"
                  aria-label="Delete last digit"
                  onClick={handleDelete}
                  className="numpad-btn h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all duration-150 active:scale-90"
                  disabled={loading}
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
                className="numpad-btn h-14 text-xl font-semibold text-white rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-150 active:scale-90 active:bg-violet-500/20"
                disabled={loading || currentPin.length >= NUM_DIGITS}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {(['enter', 'confirm'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-violet-500' : step === 'confirm' && s === 'enter' ? 'w-4 bg-emerald-500' : 'w-4 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-center justify-center gap-2 text-white/50 text-sm"
        >
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Setting up your account...
        </motion.div>
      )}
    </motion.div>
  );
}
