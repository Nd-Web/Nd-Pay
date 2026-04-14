'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'fp_onboarded_v1';

const slides = [
  {
    id: 0,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
        <defs>
          <linearGradient id="ob-grad-0" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6C5CE7" />
            <stop offset="1" stopColor="#A29BFE" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#ob-grad-0)" opacity="0.15" />
        <path
          d="M14 24L20 30L34 18"
          stroke="url(#ob-grad-0)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="10" stroke="url(#ob-grad-0)" strokeWidth="2" opacity="0.5" />
      </svg>
    ),
    title: 'Welcome to FlowPay',
    body: 'A demo money app where every penny is pretend — but the experience is real. Explore, send, and receive without worrying about a thing.',
    accent: '#6C5CE7',
  },
  {
    id: 1,
    icon: <Zap className="w-12 h-12 text-[#A29BFE]" strokeWidth={1.5} />,
    title: 'Send Money Instantly',
    body: 'Search any user by name, set an amount, add a note, and confirm with your 4-digit PIN. Funds arrive in under a second.',
    accent: '#A29BFE',
  },
  {
    id: 2,
    icon: <Shield className="w-12 h-12 text-[#00D68F]" strokeWidth={1.5} />,
    title: 'Bank-Grade Security',
    body: 'Your PIN is bcrypt-hashed and never stored in plain text. After 5 wrong attempts, the account locks for 15 minutes automatically.',
    accent: '#00D68F',
  },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function OnboardingCarousel() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const [dir, setDir]         = useState(1);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (SSR guard)
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    setVisible(false);
  };

  const next = () => {
    if (step === slides.length - 1) { dismiss(); return; }
    setDir(1);
    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step === 0) return;
    setDir(-1);
    setStep((s) => s - 1);
  };

  const goTo = (i: number) => {
    setDir(i > step ? 1 : -1);
    setStep(i);
  };

  const current = slides[step];
  const isLast  = step === slides.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ob-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="ob-modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm bg-[var(--fp-card)] border border-[var(--fp-border-mid)] rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.55)] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[var(--fp-text-muted)] hover:text-white transition-colors z-10"
                aria-label="Skip onboarding"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Slide content */}
              <div className="relative overflow-hidden min-h-[280px] flex items-center">
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.32, 0, 0.18, 1] }}
                    className="w-full px-8 pt-10 pb-6 text-center"
                  >
                    {/* Icon */}
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}
                    >
                      {current.icon}
                    </div>

                    {/* Text */}
                    <h2 className="text-xl font-bold text-white mb-3 leading-snug">
                      {current.title}
                    </h2>
                    <p className="text-[var(--fp-text-muted)] text-sm leading-relaxed">
                      {current.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 flex flex-col items-center gap-5">
                {/* Dot indicators */}
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className="transition-all duration-300"
                    >
                      <motion.div
                        animate={{
                          width: i === step ? 24 : 8,
                          background: i === step ? current.accent : 'rgba(255,255,255,0.18)',
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-2 rounded-full"
                      />
                    </button>
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-3 w-full">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="flex-1 h-11 rounded-2xl border border-[var(--fp-border-mid)] text-[var(--fp-text-muted)] hover:text-white hover:border-white/20 text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                    >
                      Back
                    </button>
                  )}

                  <motion.button
                    onClick={next}
                    whileTap={{ scale: 0.96 }}
                    className="btn-fp-primary flex-1 h-11 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    {isLast ? 'Get Started' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Skip hint */}
                {!isLast && (
                  <button
                    onClick={dismiss}
                    className="text-[var(--fp-text-muted)] text-xs hover:text-white/50 transition-colors"
                  >
                    Skip intro
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
