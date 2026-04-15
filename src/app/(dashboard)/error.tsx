'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-[#FF6B6B]/15 border border-[#FF6B6B]/25 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-9 h-9 text-[#FF6B6B]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-white font-bold text-xl">Something went wrong</h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            An unexpected error occurred. Please try again or return to the dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
          <Button className="w-full" size="lg" onClick={reset}>
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Link href="/dashboard">
            <button
              type="button"
              className="flex items-center justify-center gap-2 text-white/40 text-sm hover:text-white/60 transition-colors w-full"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
