'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Send, Download, Plus, Scan } from 'lucide-react';

const actions = [
  {
    href: '/send',
    icon: Send,
    label: 'Send',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/30',
  },
  {
    href: '/dashboard',
    icon: Download,
    label: 'Request',
    gradient: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/30',
  },
  {
    href: '/dashboard',
    icon: Plus,
    label: 'Top Up',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/30',
  },
  {
    href: '/dashboard',
    icon: Scan,
    label: 'Scan',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/30',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3 px-4">
      {actions.map(({ href, icon: Icon, label, gradient, shadow }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
        >
          <Link href={href} className="flex flex-col items-center gap-2 group">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} transition-all duration-200 group-hover:scale-105 group-active:scale-95`}
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-white/60 text-xs font-medium group-hover:text-white/80 transition-colors">
              {label}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
