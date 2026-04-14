'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import type { Notification } from '@/types';

export function useNotifications() {
  const supabase = createClient();
  const { setNotifications } = useNotificationStore();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications = data as Notification[];
      setNotifications(notifications);
      return notifications;
    },
    staleTime: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { markAsRead } = useNotificationStore();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: ids ?? null,
      } as never);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, ids) => {
      markAsRead(ids);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
