'use client';

import { isToday, isYesterday, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, ArrowDownLeft, ArrowUpRight, Shield, Info, CheckCheck, HandCoins,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useSendStore } from '@/lib/stores/sendStore';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';
import type { Notification } from '@/types';

// ── Icon by type ──────────────────────────────────────────────────────────────
function NotifIcon({ type }: { type: Notification['type'] }) {
  const cfg = {
    credit:          { Icon: ArrowDownLeft, bg: 'bg-[#00D68F]/15', text: 'text-[#00D68F]', ring: 'border-[#00D68F]/20'  },
    debit:           { Icon: ArrowUpRight,  bg: 'bg-[#FF6B6B]/12', text: 'text-[#FF6B6B]', ring: 'border-[#FF6B6B]/20'  },
    security:        { Icon: Shield,        bg: 'bg-[#F59E0B]/15',  text: 'text-[#F59E0B]', ring: 'border-[#F59E0B]/20'  },
    system:          { Icon: Info,          bg: 'bg-[#A29BFE]/12',  text: 'text-[#A29BFE]', ring: 'border-[#6C5CE7]/20' },
    payment_request: { Icon: HandCoins,     bg: 'bg-[#6C5CE7]/12',  text: 'text-[#A29BFE]', ring: 'border-[#6C5CE7]/20' },
  } as const;

  const { Icon, bg, text, ring } = cfg[type] ?? cfg.system;
  return (
    <div className={`w-10 h-10 rounded-2xl ${bg} border ${ring} flex items-center justify-center shrink-0`}>
      <Icon className={`w-4.5 h-4.5 ${text}`} />
    </div>
  );
}

// ── Accept & Pay button (payment_request notifications) ──────────────────────
function AcceptPayButton({ notification }: { notification: Notification }) {
  const router      = useRouter();
  const { setRecipient, setStep } = useSendStore();
  const meta = notification.metadata;

  if (!meta?.is_payment_request || !meta.requester_id) return null;

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecipient({
      id:             meta.requester_id!,
      full_name:      meta.requester_name ?? 'Unknown',
      email:          '',
      account_number: meta.requester_account ?? '',
      avatar_url:     null,
    });
    setStep('amount');
    router.push('/send');
  };

  return (
    <button
      type="button"
      onClick={handleAccept}
      className="btn-accept-pay mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
    >
      <HandCoins className="w-3.5 h-3.5" />
      Accept &amp; Pay {meta.amount ? formatCurrency(meta.amount) : ''}
    </button>
  );
}

// ── Single notification card ──────────────────────────────────────────────────
function NotifCard({
  notification,
  index,
  isNew = false,
}: {
  notification: Notification;
  index: number;
  isNew?: boolean;
}) {
  const markAsRead = useMarkNotificationsRead();

  const handleClick = () => {
    if (!notification.is_read) markAsRead.mutate([notification.id]);
  };

  const isRequest = notification.type === 'payment_request';

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -16, height: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 300, damping: 28 }
          : { delay: index * 0.035 }
      }
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.is_read
          ? 'bg-white/3 border border-transparent hover:bg-white/6'
          : isRequest
            ? 'bg-[#6C5CE7]/8 border border-[#6C5CE7]/20 hover:bg-[#6C5CE7]/12'
            : 'bg-white/7 border border-[#6C5CE7]/15 hover:bg-white/10'
      }`}
    >
      <NotifIcon type={notification.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={`text-sm font-semibold leading-tight ${
            notification.is_read ? 'text-white/65' : 'text-white'
          }`}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-[#A29BFE] mt-0.5" />
            )}
          </div>
        </div>
        <p className="text-white/40 text-xs leading-relaxed">{notification.body}</p>
        <p className="text-white/22 text-[10px] mt-1">{formatTimeAgo(notification.created_at)}</p>
        <AcceptPayButton notification={notification} />
      </div>
    </motion.div>
  );
}

// ── Date-group header ─────────────────────────────────────────────────────────
function GroupHeader({ dateKey }: { dateKey: string }) {
  const date = new Date(dateKey);
  let label: string;
  if (isToday(date))     label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else                   label = format(date, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 py-2 mt-1">
      <span className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

// ── Group by date ─────────────────────────────────────────────────────────────
function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const key = format(new Date(n.created_at), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-2 px-4">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-[76px] rounded-2xl" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { isLoading } = useNotifications();
  const { notifications, unreadCount } = useNotificationStore();
  const { mutate: markAllRead, isPending } = useMarkNotificationsRead();

  const groups  = groupByDate(notifications);
  const sorted  = Object.keys(groups).sort((a, b) => (b > a ? 1 : -1));

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 ? (
            <p className="text-[#A29BFE] text-sm">{unreadCount} unread</p>
          ) : (
            <p className="text-white/30 text-sm">All caught up</p>
          )}
        </div>

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => markAllRead(undefined)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-medium hover:bg-white/10 transition-all disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 px-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-white/15" />
          </div>
          <p className="text-white/40 text-sm font-medium mb-1">No notifications yet</p>
          <p className="text-white/25 text-xs">Transfer alerts and updates will appear here</p>
        </motion.div>
      ) : (
        <div className="px-4 space-y-0.5">
          <AnimatePresence mode="popLayout">
            {sorted.map((dateKey) => (
              <div key={dateKey}>
                <GroupHeader dateKey={dateKey} />
                <div className="space-y-1.5">
                  {groups[dateKey].map((n, i) => (
                    <NotifCard key={n.id} notification={n} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
