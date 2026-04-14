import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (ids?: string[]) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
        }),

      addNotification: (notification) =>
        set((state) => {
          // Prevent duplicate notifications
          if (state.notifications.some((n) => n.id === notification.id)) {
            return state;
          }
          const notifications = [notification, ...state.notifications];
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
          };
        }),

      markAsRead: (ids) =>
        set((state) => {
          const notifications = state.notifications.map((n) => {
            if (!ids || ids.includes(n.id)) {
              return { ...n, is_read: true };
            }
            return n;
          });
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
          };
        }),

      removeNotification: (id) =>
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
          };
        }),
    }),
    { name: 'ndpay-notifications' }
  )
);
