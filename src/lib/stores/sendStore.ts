import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PublicProfile, TransferResult, SendMoneyState } from '@/types';

interface SendStore extends SendMoneyState {
  setStep: (step: SendMoneyState['step']) => void;
  setRecipient: (recipient: PublicProfile | null) => void;
  setAmount: (amount: string) => void;
  setNarration: (narration: string) => void;
  setResult: (result: TransferResult | null) => void;
  reset: () => void;
}

const initialState: SendMoneyState = {
  step: 'search',
  recipient: null,
  amount: '',
  narration: '',
  result: null,
};

export const useSendStore = create<SendStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      setRecipient: (recipient) => set({ recipient }),
      setAmount: (amount) => set({ amount }),
      setNarration: (narration) => set({ narration }),
      setResult: (result) => set({ result }),
      reset: () => set(initialState),
    }),
    { name: 'ndpay-send' }
  )
);
