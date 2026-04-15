'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSendStore } from '@/lib/stores/sendStore';
import { NamedAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Contact, PublicProfile } from '@/types';

export function SavedContacts() {
  const supabase = createClient();
  const router = useRouter();
  const { setRecipient, setStep } = useSendStore();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact:profiles!contacts_contact_user_id_fkey(id, full_name, email, account_number, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as (Contact & { contact: PublicProfile })[];
    },
    staleTime: 60_000,
  });

  const handleQuickSend = (contact: PublicProfile) => {
    setRecipient(contact);
    setStep('amount');
    router.push('/send');
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 px-4 overflow-x-auto pb-2 scrollbar-none">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <Skeleton className="w-14 h-14 rounded-full" />
            <Skeleton className="w-10 h-2.5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex gap-4 px-4 overflow-x-auto pb-2 scrollbar-none">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={() => router.push('/send')}
            className="w-14 h-14 rounded-full bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center hover:bg-white/10 hover:border-white/25 transition-all"
          >
            <Plus className="w-5 h-5 text-white/30" />
          </button>
          <span className="text-white/30 text-[10px] text-center w-16">Add contact</span>
        </motion.div>

        <div className="flex items-center">
          <p className="text-white/25 text-xs italic">
            Send money to save contacts here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 px-4 overflow-x-auto pb-2 scrollbar-none">
      {/* Quick-add new */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => router.push('/send')}
          className="w-14 h-14 rounded-full bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center hover:bg-white/10 hover:border-[#6C5CE7]/40 transition-all group"
        >
          <Plus className="w-5 h-5 text-white/30 group-hover:text-[#A29BFE] transition-colors" />
        </button>
        <span className="text-white/30 text-[10px] text-center w-14">New</span>
      </motion.div>

      {contacts.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={() => handleQuickSend(item.contact)}
            className="group relative"
            aria-label={`Quick send to ${item.contact.full_name}`}
          >
            <div className="transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
              <NamedAvatar
                name={item.nickname ?? item.contact.full_name}
                avatarUrl={item.contact.avatar_url}
                size="lg"
              />
            </div>
            {/* Send pulse indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#6C5CE7] border-2 border-[#0f0a1e] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <span className="text-white/50 text-[10px] text-center w-16 truncate">
            {item.nickname ?? item.contact.full_name.split(' ')[0]}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
