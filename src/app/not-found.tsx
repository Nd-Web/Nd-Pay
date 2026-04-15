'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-[#6C5CE7]/15 border border-[#6C5CE7]/25 flex items-center justify-center mx-auto">
          <span className="text-4xl font-bold text-[#A29BFE]">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-white font-bold text-2xl">Page not found</h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
          <Link href="/dashboard">
            <Button className="w-full" size="lg">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
