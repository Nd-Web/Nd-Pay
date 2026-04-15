'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Home, Send, UserPlus, Check,
  Download, X, Share2,
} from 'lucide-react';
import { useSendStore } from '@/lib/stores/sendStore';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NamedAvatar } from '@/components/ui/avatar';
import { formatCurrency, formatTransactionDate } from '@/lib/utils';
import { playSuccessSound } from '@/lib/sounds';
import { toast } from 'sonner';

// ── Confetti pieces ───────────────────────────────────────────────────────────
function Confetti() {
  const colors = ['#6C5CE7', '#00D68F', '#A29BFE', '#F59E0B', '#FF6B6B', '#FFD93D', '#A29BFE'];
  return (
    <>
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 360;
        const dist  = 60 + (i % 3) * 50;
        const x     = Math.cos((angle * Math.PI) / 180) * dist;
        const y     = Math.sin((angle * Math.PI) / 180) * dist - 30;
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

// ── Printable receipt (hidden until @media print) ────────────────────────────
function PrintReceipt({
  txnId, amount, recipient, senderName, date, narration, newBalance,
}: {
  txnId: string; amount: number; recipient: { full_name: string; account_number: string };
  senderName: string; date: string; narration?: string | null; newBalance: number;
}) {
  const rows = [
    ['Status',           '✓ Completed'],
    ['Amount',           formatCurrency(amount)],
    ['To',               recipient.full_name],
    ['Account',          `···${recipient.account_number.slice(-4)}`],
    ['From',             senderName],
    ['Reference',        txnId],
    ['Date',             date],
    ...(narration ? [['Note', narration]] : []),
    ['Transaction fee',  'Free'],
    ['New balance',      formatCurrency(newBalance)],
  ];

  return (
    <div id="fp-receipt-print">
      <div className="receipt-root">
        <h2 className="receipt-heading">FlowPay Receipt</h2>
        <p className="receipt-subheading">Keep this for your records</p>
        <hr className="receipt-hr" />
        <table className="receipt-table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="receipt-td-row">
                <td className="receipt-td-label">{label}</td>
                <td className="receipt-td-value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="receipt-footer">
          FlowPay — Demo app · All money is simulated · No real transactions
        </p>
      </div>
    </div>
  );
}

// ── Receipt modal (screenshot-friendly) ──────────────────────────────────────
function ReceiptModal({
  txn, recipient, senderName, newBalance, onClose,
}: {
  txn: { id: string; amount: number; reference: string; completed_at: string; narration?: string | null };
  recipient: { full_name: string; account_number: string; avatar_url?: string | null };
  senderName: string;
  newBalance: number;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = [
      `FlowPay Receipt`,
      `Sent ${formatCurrency(txn.amount)} to ${recipient.full_name}`,
      `Ref: ${txn.reference}`,
      `Date: ${formatTransactionDate(txn.completed_at)}`,
      `Fee: Free`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'FlowPay Receipt', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Receipt copied to clipboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-sm rounded-3xl bg-[#12121A] border border-[var(--fp-border)] overflow-hidden shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <p className="text-white font-semibold text-sm">Transaction Receipt</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/8 transition-colors text-[#6B7280] hover:text-white"
            aria-label="Close receipt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt body */}
        <div ref={receiptRef} className="px-5 py-4 space-y-0">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#00D68F]/20 border border-[#00D68F]/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#00D68F]" />
            </div>
            <div>
              <p className="text-white font-bold">{formatCurrency(txn.amount)}</p>
              <p className="text-[#00D68F] text-xs font-medium">Completed</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-white/70 text-sm">{recipient.full_name}</p>
              <p className="text-[#6B7280] text-xs mono-num">···{recipient.account_number.slice(-4)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/3 border border-white/6 divide-y divide-white/4 text-sm">
            {[
              { label: 'From',      value: senderName },
              { label: 'Reference', value: txn.reference, mono: true },
              { label: 'Date',      value: formatTransactionDate(txn.completed_at) },
              ...(txn.narration ? [{ label: 'Note', value: txn.narration }] : []),
              { label: 'Fee',       value: 'Free', green: true },
              { label: 'New balance', value: formatCurrency(newBalance), bold: true },
            ].map(({ label, value, mono, green, bold }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[#6B7280]">{label}</span>
                <span className={`text-right max-w-[55%] truncate ${
                  mono  ? 'mono-num text-xs text-white/70' :
                  green ? 'text-[#00D68F] font-medium' :
                  bold  ? 'text-white font-semibold' :
                          'text-white/80'
                }`}>{value}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[#6B7280] text-[11px] pt-3 pb-1">
            Demo app · All money is simulated
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="w-3.5 h-3.5" />
            Print / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main success screen ───────────────────────────────────────────────────────
export function TransferSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { recipient, result, reset } = useSendStore();
  const [saved, setSaved]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => { playSuccessSound(); }, []);

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
    } catch { toast.error('Could not save contact'); }
    finally { setSaving(false); }
  };

  const handleDone       = () => { reset(); router.push('/dashboard'); };
  const handleSendAgain  = () => {
    if (!recipient) { reset(); router.push('/send'); return; }
    useSendStore.getState().setStep('amount');
    useSendStore.getState().setAmount('');
    useSendStore.getState().setResult(null);
    router.push('/send');
  };

  if (!result || !recipient) return null;

  const txn = result.transaction;

  return (
    <>
      {/* Hidden print receipt — only visible to @media print */}
      <PrintReceipt
        txnId={txn.reference}
        amount={txn.amount}
        recipient={recipient}
        senderName="You"
        date={formatTransactionDate(txn.completed_at)}
        narration={txn.narration}
        newBalance={result.sender_balance}
      />

      <div className="relative flex flex-col items-center px-4 pt-6 pb-8 overflow-hidden">
        <Confetti />

        {/* Success ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14 }}
          className="relative mb-6"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-[#00D68F]/20"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00D68F] to-[#00B07A] flex items-center justify-center shadow-2xl shadow-[#00D68F]/40 relative z-10">
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
          <p className="text-[#6B7280] text-sm">
            {formatCurrency(txn.amount)} transferred to {recipient.full_name}
          </p>
        </motion.div>

        {/* Mini receipt card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full rounded-2xl bg-[var(--fp-card)] border border-[var(--fp-border)] overflow-hidden mb-5"
        >
          <div className="flex items-center gap-3 p-4 border-b border-white/6">
            <NamedAvatar name={recipient.full_name} avatarUrl={recipient.avatar_url} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{recipient.full_name}</p>
              <p className="text-[#6B7280] text-xs mono-num">···{recipient.account_number.slice(-4)}</p>
            </div>
            <p className="text-[#00D68F] font-bold text-xl mono-num">{formatCurrency(txn.amount)}</p>
          </div>
          <div className="divide-y divide-white/5 text-sm">
            {[
              { label: 'Reference', value: txn.reference, mono: true },
              { label: 'Status',    value: <span className="flex items-center gap-1.5 text-[#00D68F] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-[#00D68F] inline-block" />Completed</span> },
              txn.narration ? { label: 'Note', value: txn.narration } : null,
              { label: 'Date',      value: formatTransactionDate(txn.completed_at) },
              { label: 'Fee',       value: <span className="text-[#00D68F] font-medium">Free</span> },
            ].filter(Boolean).map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-[#6B7280]">{row!.label}</span>
                {typeof row!.value === 'string'
                  ? <span className={`text-white/80 ${(row as { mono?: boolean }).mono ? 'mono-num text-xs' : ''} text-right max-w-[55%] truncate`}>{row!.value}</span>
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
          className="mb-5 text-center"
        >
          <p className="text-[#6B7280] text-xs">Your new balance</p>
          <p className="text-white/80 font-bold text-xl mono-num">{formatCurrency(result.sender_balance)}</p>
        </motion.div>

        {/* Save contact */}
        <AnimatePresence>
          {!saved ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.55 }}
              onClick={handleSaveContact}
              disabled={saving}
              className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-[#6C5CE7]/12 border border-[#6C5CE7]/22 text-[#A29BFE] text-sm font-medium hover:bg-[#6C5CE7]/22 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Save {recipient.full_name.split(' ')[0]} as contact
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-[#00D68F]/12 border border-[#00D68F]/22 text-[#00D68F] text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Contact saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
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
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleSendAgain}>
              <Send className="w-3.5 h-3.5" />
              Again
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowReceipt(true)} className="col-span-2">
              <Download className="w-3.5 h-3.5" />
              View Receipt
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Receipt modal */}
      <AnimatePresence>
        {showReceipt && (
          <ReceiptModal
            txn={txn}
            recipient={recipient}
            senderName="You"
            newBalance={result.sender_balance}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
