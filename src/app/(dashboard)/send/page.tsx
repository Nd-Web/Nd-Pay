'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { RecipientSearch } from '@/components/send/RecipientSearch';
import { AmountEntry } from '@/components/send/AmountEntry';
import { TransferConfirm } from '@/components/send/TransferConfirm';
import { PinEntry } from '@/components/send/PinEntry';
import { TransferSuccess } from '@/components/send/TransferSuccess';

const stepTitles = {
  search: 'Send Money',
  amount: 'Enter Amount',
  confirm: 'Review Transfer',
  pin: 'Confirm with PIN',
  success: 'Transfer Complete',
};

const stepProgress = {
  search: 0.25,
  amount: 0.5,
  confirm: 0.75,
  pin: 0.9,
  success: 1,
};

export default function SendPage() {
  const router = useRouter();
  const { step, setStep, reset } = useSendStore();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (step === 'success') reset();
    };
  }, []);

  const handleBack = () => {
    const backMap = {
      search: null,
      amount: 'search' as const,
      confirm: 'amount' as const,
      pin: 'confirm' as const,
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

  const showBackButton = step !== 'success';
  const isSuccess = step === 'success';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {!isSuccess && (
        <div className="flex items-center gap-3 px-4 pt-14 pb-4">
          <button
            onClick={handleBack}
            className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">{stepTitles[step]}</h1>
          </div>

          <button
            onClick={() => { reset(); router.push('/dashboard'); }}
            className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
      )}

      {/* Progress bar */}
      {!isSuccess && (
        <div className="mx-4 mb-6 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stepProgress[step] * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Step content */}
      <div className={`flex-1 ${isSuccess ? 'pt-14' : ''}`}>
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
      </div>
    </div>
  );
}
