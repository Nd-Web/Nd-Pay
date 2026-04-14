'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, ArrowLeftRight, Bell, User } from 'lucide-react';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',     icon: Home,            label: 'Home'    },
  { href: '/transactions',  icon: ArrowLeftRight,  label: 'History' },
  { href: '/notifications', icon: Bell,            label: 'Alerts'  },
  { href: '/profile',       icon: User,            label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationStore();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe">
      <div className="mx-auto max-w-lg">
        <div className="mx-4 mb-4 rounded-2xl glass border border-[var(--fp-border-mid,rgba(255,255,255,0.10))] shadow-2xl px-2 py-2">
          <div className="flex items-center justify-around">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive  = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              const showBadge = href === '/notifications' && unreadCount > 0;

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-[#A29BFE]'
                      : 'text-[#6B7280] hover:text-white/70'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-xl bg-[#6C5CE7]/12"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <div className="relative">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF6B6B] text-white text-[9px] font-bold flex items-center justify-center"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium relative z-10">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
