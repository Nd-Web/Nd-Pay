'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { RecipientSearch } from '@/components/send/RecipientSearch';
import { AmountEntry } from '@/components/send/AmountEntry';
import { TransferConfirm } from '@/components/send/TransferConfirm';
import { PinEntry } from '@/components/send/PinEntry';
import { TransferSuccess } from '@/components/send/TransferSuccess';
import { RequestFlow } from '@/components/send/RequestFlow';

type Mode = 'send' | 'request';

const sendStepTitles = {
  search:  'Send Money',
  amount:  'Enter Amount',
  confirm: 'Review Transfer',
  pin:     'Confirm with PIN',
  success: 'Transfer Complete',
};

const sendStepProgress = {
  search:  0.25,
  amount:  0.5,
  confirm: 0.75,
  pin:     0.9,
  success: 1,
};

export default function SendPage() {
  const router = useRouter();
  const { step, setStep, reset } = useSendStore();
  const [mode, setMode] = useState<Mode>('send');

  // If the store already has a recipient pre-filled (e.g. from "Accept & Pay"),
  // skip directly to the amount step in send mode.
  useEffect(() => {
    // intentionally empty — recipient pre-fill is handled by useSendStore
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (step === 'success') reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    const backMap = {
      search:  null,
      amount:  'search' as const,
      confirm: 'amount' as const,
      pin:     'confirm' as const,
      success: null,
    };
    const prev = backMap[step];
    if (prev) {
      setStep(prev);
    } else {
      reset();
      router.push('/dashboard');
    }
  };

  const isSuccess        = step === 'success';
  const isRequestMode    = mode === 'request';
  const showTabs         = step === 'search' || isRequestMode;
  const showSendProgress = !isSuccess && !isRequestMode;
  const headerTitle      = isRequestMode ? 'Request Money' : sendStepTitles[step];

  const switchMode = (m: Mode) => {
    reset();
    setMode(m);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {!isSuccess && (
        <div className="flex items-center gap-3 px-4 pt-14 pb-4">
          <button
            type="button"
            aria-label="Back to dashboard"
            onClick={() => { reset(); router.push('/dashboard'); }}
            className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">{headerTitle}</h1>
          </div>

          {!isRequestMode && (
            <button
              type="button"
              aria-label="Close"
              onClick={() => { reset(); router.push('/dashboard'); }}
              className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          )}
        </div>
      )}

      {/* Mode tabs (search step only) */}
      {showTabs && (
        <div className="px-4 mb-4">
          <div className="flex bg-white/5 border border-[var(--fp-border)] rounded-2xl p-1 gap-1">
            {(['send', 'request'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="relative flex-1 h-9 rounded-xl text-sm font-medium transition-colors"
              >
                {mode === m && (
                  <motion.div
                    layoutId="send-mode-pill"
                    className="absolute inset-0 bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${mode === m ? 'text-white' : 'text-white/40'}`}>
                  {m === 'send' ? 'Send Money' : 'Request Money'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar (send mode only) */}
      {showSendProgress && (
        <div className="mx-4 mb-6 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${sendStepProgress[step] * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Step content */}
      <div className={`flex-1 ${isSuccess ? 'pt-14' : ''}`}>
        {isRequestMode ? (
          <RequestFlow onDone={() => { reset(); router.push('/dashboard'); }} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full"
            >
              {step === 'search' && <RecipientSearch />}
              {step === 'amount' && <AmountEntry />}
              {step === 'confirm' && <TransferConfirm />}
              {step === 'pin' && <PinEntry />}
              {step === 'success' && <TransferSuccess />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
