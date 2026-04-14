'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff,
  CheckCircle2, Copy, Check, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlowPayLogo } from '@/components/shared/FlowPayLogo';
import { playSuccessSound } from '@/lib/sounds';

// ── Password strength ────────────────────────────────────────────────────────
const getStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};
const strengthLabel     = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthBarClass  = ['', 'bg-[#FF6B6B]', 'bg-amber-500', 'bg-yellow-400', 'bg-[#00D68F]'];
const strengthTextClass = ['', 'text-[#FF6B6B]', 'text-amber-400', 'text-yellow-400', 'text-[#00D68F]'];

// ── Confetti ──────────────────────────────────────────────────────────────────
function ConfettiParticle({ i }: { i: number }) {
  const colors = ['#6C5CE7', '#00D68F', '#A29BFE', '#f59e0b', '#ec4899', '#06b6d4'];
  const color  = colors[i % colors.length];
  const angle  = (i / 20) * 360;
  const dist   = 80 + (i % 3) * 40;
  const x = Math.cos((angle * Math.PI) / 180) * dist;
  const y = Math.sin((angle * Math.PI) / 180) * dist;
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{ backgroundColor: color, left: '50%', top: '40%' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0, rotate: 360 }}
      transition={{ duration: 0.9, delay: i * 0.02, ease: 'easeOut' }}
    />
  );
}

// ── Email-confirmation waiting state ─────────────────────────────────────────
function ConfirmEmailCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="glass rounded-3xl p-8 shadow-2xl text-center"
    >
      <div className="w-20 h-20 rounded-full bg-[#6C5CE7]/15 border border-[#6C5CE7]/25 flex items-center justify-center mx-auto mb-5">
        <Mail className="w-10 h-10 text-[#A29BFE]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
      <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
        We&apos;ve sent a confirmation link to your email address.
        Click it to activate your account — then come back and sign in.
      </p>
      <p className="text-white/25 text-xs mb-6">
        Tip: to skip email confirmation, go to Supabase Dashboard →{' '}
        Authentication → Providers → Email → disable &quot;Confirm email&quot;.
      </p>
      <Link href="/sign-in">
        <Button className="w-full" size="lg" variant="outline">
          Go to Sign In
          <ChevronRight className="w-4 h-4" />
        </Button>
      </Link>
    </motion.div>
  );
}

// ── Account number success card ───────────────────────────────────────────────
function SuccessCard({ accountNumber, onContinue }: { accountNumber: string; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="relative"
    >
      {Array.from({ length: 20 }).map((_, i) => <ConfettiParticle key={i} i={i} />)}

      <div className="glass rounded-3xl p-8 shadow-2xl text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D68F] to-[#00B07A] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#00D68F]/40"
        >
          <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={1.5} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-2xl font-bold text-white mb-1">Account Created!</h2>
          <p className="text-[#6B7280] text-sm mb-6">
            Welcome to FlowPay. Your wallet has been funded with{' '}
            <span className="text-[#00D68F] font-semibold">$10,000</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl bg-[#6C5CE7]/8 border border-[#6C5CE7]/15 p-5 mb-6"
        >
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-3">Your Account Number</p>
          <p className="text-3xl font-bold text-white tracking-[0.2em] mono-num mb-3">
            {accountNumber !== '—'
              ? accountNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
              : '—'}
          </p>
          {accountNumber !== '—' && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-[#6C5CE7]/20 border border-[#6C5CE7]/30 text-[#A29BFE] text-sm font-medium hover:bg-[#6C5CE7]/30 transition-all"
            >
              {copied
                ? <><Check className="w-4 h-4 text-[#00D68F]" /><span className="text-[#00D68F]">Copied!</span></>
                : <><Copy className="w-4 h-4" />Copy number</>
              }
            </button>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <p className="text-white/30 text-xs mb-6">
            Save this — others use it to send you money
          </p>
          <Button className="w-full" size="lg" onClick={onContinue}>
            Set Up Your PIN
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Step = 'form' | 'success' | 'confirm_email';

export default function SignUpPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]             = useState<Step>('form');
  const [fullName, setFullName]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPass] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [accountNumber, setAccNum]  = useState('');

  const strength = getStrength(password);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    else if (fullName.trim().length < 2) errs.fullName = 'Name is too short';
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName.trim() }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg: string  = body.error ?? 'Sign up failed';
        const hint: string | undefined = body.hint;

        if (res.status === 503 && hint) {
          toast.error(msg, {
            description: hint,
            duration: 8000,
            action: body.hint?.includes('/setup')
              ? { label: 'Go to /setup', onClick: () => router.push('/setup') }
              : undefined,
          });
        } else if (res.status === 409 || msg.toLowerCase().includes('already registered')) {
          toast.error('Email already in use', {
            description: 'Try signing in instead.',
            action: { label: 'Sign in', onClick: () => router.push('/sign-in') },
          });
        } else {
          toast.error(msg, { duration: 6000 });
        }
        return;
      }

      if (body.session === 'pending_confirmation') {
        setStep('confirm_email');
        return;
      }

      const userId = body.user?.id;
      if (!userId) {
        toast.error('Sign up succeeded but no user ID returned');
        return;
      }

      await supabase.auth.getSession();

      let attempts = 0;
      const poll = async (): Promise<string> => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_number')
          .eq('id', userId)
          .single();
        const p = profile as unknown as { account_number: string } | null;
        if (p?.account_number) return p.account_number;
        if (attempts++ < 10) {
          await new Promise((r) => setTimeout(r, 500));
          return poll();
        }
        return '—';
      };

      const accNum = await poll();
      setAccNum(accNum);
      playSuccessSound();
      setStep('success');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm_email') {
    return (
      <div className="relative">
        <div className="flex justify-center mb-8">
          <FlowPayLogo size="sm" showIcon />
        </div>
        <ConfirmEmailCard />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-[#00D68F]/12 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <FlowPayLogo size="sm" showIcon />
          </div>
          <SuccessCard accountNumber={accountNumber} onContinue={() => router.push('/setup-pin')} />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Wordmark */}
      <div className="flex justify-center mb-8">
        <FlowPayLogo size="md" showIcon />
      </div>

      {/* Free money banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 rounded-2xl bg-[#00D68F]/10 border border-[#00D68F]/20 p-4 flex items-center gap-3"
      >
        <span className="text-2xl">💰</span>
        <div>
          <p className="text-[#00D68F] font-semibold text-sm">Get $10,000 free</p>
          <p className="text-[#00D68F]/50 text-xs">Every new account gets funded instantly</p>
        </div>
      </motion.div>

      <div className="glass rounded-3xl p-7 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-[#6B7280] text-sm">Join FlowPay and start sending money instantly</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            leftIcon={<User className="w-4 h-4" />}
            autoComplete="name"
            autoFocus
          />
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <div className="space-y-2">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPass(!showPassword)}
                  className="hover:text-white/70 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
            />

            <AnimatePresence>
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength >= level ? strengthBarClass[strength] : 'bg-white/8'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Strength:{' '}
                    <span className={`font-medium ${strengthTextClass[strength] ?? 'text-white/30'}`}>
                      {strengthLabel[strength] || 'Very weak'}
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-1 space-y-2">
            {[
              'Free $10,000 simulated balance',
              'Real-time instant transfers',
              'Bank-grade transaction PIN security',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D68F] shrink-0" />
                <span className="text-[#6B7280] text-xs">{f}</span>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full mt-1" size="lg" loading={loading}>
            Create account
          </Button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-[#6B7280] text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-[#A29BFE] hover:text-[#6C5CE7] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
