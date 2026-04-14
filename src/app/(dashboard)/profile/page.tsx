'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Check, Copy, LogOut, Shield, ChevronRight,
  Sun, Moon, Bell, Lock, Pencil, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { useThemeStore } from '@/lib/stores/themeStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useUpdateProfile, useSetPin } from '@/hooks/useProfile';
import { NamedAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-4 pb-2 text-white/30 text-[10px] font-semibold uppercase tracking-widest">
      {children}
    </p>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  onClick,
  danger = false,
  trailing,
  type = 'button',
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
  type?: 'button' | 'div';
}) {
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
        danger ? 'bg-red-500/15' : 'bg-white/8'
      }`}>
        <Icon className={`w-4 h-4 ${danger ? 'text-red-400' : 'text-white/60'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
        {sub && <p className="text-white/35 text-xs mt-0.5">{sub}</p>}
      </div>
      {trailing ?? (onClick && (
        <ChevronRight className={`w-4 h-4 shrink-0 ${danger ? 'text-red-400/40' : 'text-white/20'}`} />
      ))}
    </>
  );

  if (type === 'div' || !onClick) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
    >
      {inner}
    </button>
  );
}

// ── PIN input dots ────────────────────────────────────────────────────────────
function PinDots({ value, max = 4 }: { value: string; max?: number }) {
  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ scale: i === value.length - 1 ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.15 }}
          className={`w-3 h-3 rounded-full transition-colors ${
            i < value.length ? 'bg-[#A29BFE]' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  );
}

// ── Mini numpad ───────────────────────────────────────────────────────────────
const MINI_NUMPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

function MiniNumpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {MINI_NUMPAD.flat().map((key, idx) => {
        if (!key) return <div key={idx} />;
        return (
          <button
            key={idx}
            type="button"
            aria-label={key === 'del' ? 'Delete' : key}
            onClick={() => onKey(key)}
            className="h-12 rounded-2xl bg-white/8 border border-white/8 text-white font-semibold text-lg
                       hover:bg-white/14 active:scale-90 transition-all duration-75"
          >
            {key === 'del' ? '⌫' : key}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawers / modals
// ─────────────────────────────────────────────────────────────────────────────

// ── Edit Name ─────────────────────────────────────────────────────────────────
function EditNameDrawer({ onClose }: { onClose: () => void }) {
  const { profile } = useAuthStore();
  const { mutateAsync, isPending } = useUpdateProfile();
  const [name, setName] = useState(profile?.full_name ?? '');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.full_name) { onClose(); return; }
    try {
      await mutateAsync({ full_name: trimmed });
      toast.success('Name updated');
      onClose();
    } catch {
      toast.error('Could not update name');
    }
  };

  return (
    <DrawerShell title="Edit Name" onClose={onClose}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="Your full name"
        className="w-full h-12 px-4 rounded-2xl bg-white/6 border border-white/12 text-white placeholder:text-white/30
                   text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
        autoFocus
      />
      <Button className="w-full mt-4" onClick={handleSave} loading={isPending}>
        Save changes
      </Button>
    </DrawerShell>
  );
}

// ── Change PIN ────────────────────────────────────────────────────────────────
type PinStep = 'new' | 'confirm';

function ChangePinDrawer({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useSetPin();
  const [step, setStep] = useState<PinStep>('new');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleKey = (k: string) => {
    setError('');
    const current = step === 'new' ? newPin : confirmPin;
    const setter  = step === 'new' ? setNewPin : setConfirmPin;

    if (k === 'del') { setter(current.slice(0, -1)); return; }
    if (current.length >= 4) return;
    const next = current + k;
    setter(next);

    if (next.length === 4) {
      if (step === 'new') {
        setTimeout(() => setStep('confirm'), 150);
      } else {
        // Confirm step
        setTimeout(async () => {
          if (next !== newPin) {
            setError("PINs don't match");
            setConfirmPin('');
            setStep('new');
            setNewPin('');
            return;
          }
          try {
            await mutateAsync(next);
            toast.success('PIN updated successfully');
            onClose();
          } catch {
            toast.error('Could not update PIN');
            setConfirmPin('');
            setStep('new');
            setNewPin('');
          }
        }, 150);
      }
    }
  };

  const pinValue = step === 'new' ? newPin : confirmPin;

  return (
    <DrawerShell title="Change PIN" onClose={onClose}>
      <p className="text-white/40 text-sm text-center mb-6">
        {step === 'new' ? 'Enter your new 4-digit PIN' : 'Confirm your new PIN'}
      </p>

      <PinDots value={pinValue} />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center mt-3"
        >
          {error}
        </motion.p>
      )}

      <MiniNumpad onKey={handleKey} />

      {isPending && (
        <p className="text-white/40 text-xs text-center mt-4">Saving…</p>
      )}
    </DrawerShell>
  );
}

// ── Generic bottom drawer shell ───────────────────────────────────────────────
function DrawerShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[var(--fp-card)] border-t border-[var(--fp-border-mid)] rounded-t-3xl p-6 pb-10"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar upload
// ─────────────────────────────────────────────────────────────────────────────
function useAvatarUpload() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!profile) return;
      setUploading(true);
      try {
        const ext  = file.name.split('.').pop() ?? 'jpg';
        const path = `avatars/${profile.id}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadErr) throw uploadErr;

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

        await updateProfile({ avatar_url: avatarUrl });
        toast.success('Avatar updated');
      } catch (err) {
        console.error(err);
        toast.error('Could not upload avatar');
      } finally {
        setUploading(false);
      }
    },
    [profile, supabase, updateProfile]
  );

  return { upload, uploading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
type Drawer = 'editName' | 'changePin' | null;

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, wallet, isLoading, reset: resetAuth } = useAuthStore();
  const { setNotifications } = useNotificationStore();
  const { theme, toggleTheme } = useThemeStore();
  const { upload, uploading } = useAvatarUpload();

  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<Drawer>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopyAccount = () => {
    if (!profile?.account_number) return;
    navigator.clipboard.writeText(profile.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
      resetAuth();
      setNotifications([]);
      toast.success('Signed out');
      router.push('/sign-in');
      router.refresh();
    } catch {
      toast.error('Failed to sign out');
      setSigningOut(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    await upload(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="min-h-screen pb-8">
        {/* Header */}
        <div className="px-4 pt-14 pb-6">
          <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

          {isLoading ? (
            <Skeleton className="h-40 rounded-3xl" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-gradient-to-br from-[#6C5CE7]/20 via-[#6C5CE7]/10 to-transparent border border-[#6C5CE7]/20 p-5"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                {/* Avatar with upload button */}
                <div className="relative shrink-0">
                  <NamedAvatar
                    name={profile?.full_name ?? 'User'}
                    avatarUrl={profile?.avatar_url}
                    size="xl"
                  />
                  <button
                    type="button"
                    aria-label="Change avatar"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#6C5CE7] border-2 border-[#0A0A0F]
                               flex items-center justify-center hover:bg-[#7D6EEF] transition-colors disabled:opacity-50"
                  >
                    {uploading
                      ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-3 h-3 text-white" />
                    }
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload avatar image"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Name / email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg leading-tight truncate">
                      {profile?.full_name}
                    </h2>
                    <button
                      type="button"
                      aria-label="Edit name"
                      onClick={() => setActiveDrawer('editName')}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5 text-white/35 hover:text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/45 text-sm truncate">{profile?.email}</p>

                  {/* Account number */}
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="flex items-center gap-1.5 mt-1.5 group"
                  >
                    <span className="text-white/30 text-xs font-mono group-hover:text-white/50 transition-colors">
                      {profile?.account_number}
                    </span>
                    {copied
                      ? <Check className="w-3 h-3 text-[#00D68F]" />
                      : <Copy className="w-3 h-3 text-white/25 group-hover:text-white/50 transition-colors" />
                    }
                  </button>
                </div>
              </div>

              {/* Balance pill */}
              <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between">
                <div>
                  <p className="text-white/35 text-xs mb-0.5">Wallet Balance</p>
                  <p className="text-white font-bold text-xl">
                    {wallet ? formatCurrency(wallet.balance) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00D68F]/12 border border-[#00D68F]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D68F] animate-pulse" />
                  <span className="text-[#00D68F] text-xs font-medium">Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Settings sections */}
        <div className="px-4 space-y-3">
          {/* Security */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden"
          >
            <SectionLabel>Security</SectionLabel>
            <div className="divide-y divide-white/5">
              <Row
                icon={Lock}
                label="Change Transaction PIN"
                sub="Update your 4-digit transfer PIN"
                onClick={() => setActiveDrawer('changePin')}
              />
              <Row
                icon={Shield}
                label="Two-Factor Authentication"
                sub="Coming soon"
                trailing={
                  <span className="px-2 py-0.5 rounded-full bg-white/8 text-white/30 text-[10px] font-medium">
                    Soon
                  </span>
                }
              />
            </div>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden"
          >
            <SectionLabel>Appearance</SectionLabel>
            <div className="divide-y divide-white/5">
              <Row
                icon={theme === 'dark' ? Moon : Sun}
                label="Theme"
                sub={theme === 'dark' ? 'Dark mode' : 'Light mode'}
                onClick={toggleTheme}
                trailing={
                  <div
                    className={`w-11 h-6 rounded-full border transition-colors relative ${
                      theme === 'light'
                        ? 'bg-[#6C5CE7] border-[#6C5CE7]'
                        : 'bg-white/10 border-white/15'
                    }`}
                  >
                    <motion.div
                      animate={{ x: theme === 'light' ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    />
                  </div>
                }
              />
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden"
          >
            <SectionLabel>Notifications</SectionLabel>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Received money',  sub: 'Alert when funds arrive'       },
                { label: 'Sent money',       sub: 'Confirm successful transfers'  },
                { label: 'Security alerts',  sub: 'Sign-in and account activity'  },
              ].map(({ label, sub }, i) => (
                <Row
                  key={i}
                  icon={Bell}
                  label={label}
                  sub={sub}
                  type="div"
                  trailing={
                    <div className="w-11 h-6 rounded-full bg-[#6C5CE7] border border-[#6C5CE7] relative">
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  }
                />
              ))}
            </div>
          </motion.div>

          {/* App / logout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden"
          >
            <div className="divide-y divide-white/5">
              {/* App info */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" fill="white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">FlowPay</p>
                  <p className="text-white/30 text-xs">Version 1.0.0 · Demo Mode</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
                  Simulated
                </span>
              </div>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/8 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
                  {signingOut
                    ? <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                    : <LogOut className="w-4 h-4 text-red-400" />
                  }
                </div>
                <span className="flex-1 text-sm font-medium text-red-400">
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </span>
                <ChevronRight className="w-4 h-4 text-red-400/40" />
              </button>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-white/20 text-[11px] pb-2"
          >
            FlowPay is a demo app. All money is simulated. No real transactions occur.
          </motion.p>
        </div>
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {activeDrawer === 'editName' && (
          <EditNameDrawer key="editName" onClose={() => setActiveDrawer(null)} />
        )}
        {activeDrawer === 'changePin' && (
          <ChangePinDrawer key="changePin" onClose={() => setActiveDrawer(null)} />
        )}
      </AnimatePresence>

    </>
  );
}
