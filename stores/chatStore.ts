// Zustand store — чат и сообщения
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Message, AIProfile } from '@/types';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isOnline: boolean;
  currentProfile: AIProfile | null;
  currentMood: string; // emoji настроения
  currentInsight: string; // наблюдение AI
  pendingMessages: Message[]; // сообщения в оффлайне

  // Действия
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  setOnline: (online: boolean) => void;
  updateProfile: (profile: AIProfile) => void;
  setMessages: (messages: Message[]) => void;
  addPendingMessage: (message: Message) => void;
  clearPending: () => void;
  quoteMessage: (messageId: string | null) => void;
  quotedMessageId: string | null;
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: [],
    isTyping: false,
    isOnline: true,
    currentProfile: null,
    currentMood: '😊',
    currentInsight: '',
    pendingMessages: [],
    quotedMessageId: null,

    addMessage: (message) => {
      set((state) => {
        state.messages.unshift(message); // FlashList inverted
        // Лимит: 500 сообщений в памяти
        if (state.messages.length > 500) {
          state.messages = state.messages.slice(0, 500);
        }
      });
    },

    setTyping: (typing) => {
      set((state) => { state.isTyping = typing; });
    },

    setOnline: (online) => {
      set((state) => { state.isOnline = online; });
    },

    updateProfile: (profile) => {
      set((state) => {
        state.currentProfile = profile;
        state.currentMood = profile.m;
        state.currentInsight = profile.i;
      });
    },

    setMessages: (messages) => {
      set((state) => {
        // SQLite возвращает ORDER BY created_at DESC — уже новые первыми.
        // FlashList inverted: index 0 = низ экрана = самое новое. Reverse НЕ нужен.
        state.messages = [...messages];
      });
    },

    addPendingMessage: (message) => {
      set((state) => {
        state.pendingMessages.push(message);
      });
    },

    clearPending: () => {
      set((state) => { state.pendingMessages = []; });
    },

    quoteMessage: (messageId) => {
      set((state) => { state.quotedMessageId = messageId; });
    },
  }))
);
