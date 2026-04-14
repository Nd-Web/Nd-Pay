'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlowPayLogo } from '@/components/shared/FlowPayLogo';

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPass] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? 'Something went wrong';
        if (msg.toLowerCase().includes('invalid')) {
          toast.error('Invalid email or password');
        } else if (msg.toLowerCase().includes('confirm')) {
          toast.error('Please confirm your email before signing in');
        } else {
          toast.error(msg);
        }
        return;
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Wordmark */}
      <div className="flex justify-center mb-10">
        <FlowPayLogo size="md" showIcon />
      </div>

      {/* Card */}
      <div className="glass rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-[#6B7280] text-sm">Sign in to your FlowPay account</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
            autoFocus
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
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
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#6B7280] text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/sign-up"
              className="text-[#A29BFE] hover:text-[#6C5CE7] font-medium transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <p className="text-white/25 text-xs">
          Demo app · All money is simulated · No real transactions
        </p>
      </motion.div>
    </motion.div>
  );
}
