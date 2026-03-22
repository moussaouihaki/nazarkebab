import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, message: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

// Stockage compatible Web (localStorage) ET Mobile (AsyncStorage)
const webStorage = {
  getItem: (name: string) => {
    try { return Promise.resolve(localStorage.getItem(name)); } catch { return Promise.resolve(null); }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch {}
    return Promise.resolve();
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch {}
    return Promise.resolve();
  },
};

const getStorage = () => {
  if (Platform.OS === 'web') return webStorage;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch {
    return webStorage;
  }
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (title, message) => {
        const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          message,
          time: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: 'nazar-notifications-storage',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);
