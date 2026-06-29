// Zustand store — пользователь и друг
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UserProfile, Friend } from '@/types';
import { PersonaConfig } from '@/constants/theme';
import type { ColorThemeId, PersonaType } from '@/constants/theme';

// Простое хранилище — MMKV в нативном APK, fallback в Expo Go
const memCache: Record<string, string> = {};

interface Storage {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
  clearAll(): void;
}

let _storage: Storage | null = null;
function getStorage(): Storage {
  if (_storage) return _storage;
  try {
    const { MMKV } = require('react-native-mmkv');
    _storage = new MMKV({ id: 'user-storage' });
  } catch {
    // Expo Go — используем in-memory
    _storage = {
      set: (key, value) => { memCache[key] = value; },
      getString: (key) => memCache[key],
      clearAll: () => { Object.keys(memCache).forEach(k => delete memCache[k]); },
    };
  }
  return _storage!;
}

function persist<T>(key: string, value: T): void {
  try { getStorage().set(key, JSON.stringify(value)); } catch {}
}
function restore<T>(key: string): T | null {
  try {
    const raw = getStorage().getString(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

interface OnboardingState {
  personaType: PersonaType | null;
  friendName: string;
  colorTheme: ColorThemeId;
  isComplete: boolean;
}

interface UserState {
  user: UserProfile | null;
  friend: Friend | null;
  onboarding: OnboardingState;

  // Действия онбординга
  setPersonaType: (type: PersonaType) => void;
  setFriendName: (name: string) => void;
  setColorTheme: (theme: ColorThemeId) => void;
  completeOnboarding: () => Friend;

  // Действия пользователя
  setUser: (user: UserProfile) => void;
  updateFriend: (updates: Partial<Friend>) => void;
  resetAll: () => void;
  loadFromStorage: () => void;
}

const DEFAULT_ONBOARDING: OnboardingState = {
  personaType: null,
  friendName: '',
  colorTheme: 'violet',
  isComplete: false,
};

export const useUserStore = create<UserState>()(
  immer((set, get) => ({
    user: restore<UserProfile>('user') ?? null,
    friend: restore<Friend>('friend') ?? null,
    onboarding: DEFAULT_ONBOARDING,

    setPersonaType: (type) => {
      set((state) => {
        state.onboarding.personaType = type;
        // Дефолтное имя по персонажу
        const defaults: Record<PersonaType, string> = {
          girlfriend: 'Саша',
          friend: 'Макс',
          spark: 'Рита',
          sage: 'Дима',
        };
        if (!state.onboarding.friendName) {
          state.onboarding.friendName = defaults[type] ?? '';
        }
      });
    },

    setFriendName: (name) => {
      set((state) => {
        state.onboarding.friendName = name.slice(0, 18);
      });
    },

    setColorTheme: (theme) => {
      set((state) => {
        state.onboarding.colorTheme = theme;
      });
      getStorage().set('colorTheme', theme);
    },

    completeOnboarding: () => {
      const { onboarding } = get();
      if (!onboarding.personaType) throw new Error('Персонаж не выбран');

      const config = PersonaConfig[onboarding.personaType];

      const friend: Friend = {
        id: `friend_${Date.now()}`,
        userId: 'local',
        personaType: onboarding.personaType,
        name: onboarding.friendName || config.label,
        colorTheme: onboarding.colorTheme,
        voiceConfig: {
          pitch: config.pitchRate,
          rate: config.speechRate,
          language: 'ru-RU',
        },
        createdAt: Date.now(),
      };

      set((state) => {
        state.friend = friend;
        state.onboarding.isComplete = true;
      });

      persist('friend', friend);
      return friend;
    },

    setUser: (user) => {
      set((state) => { state.user = user; });
      persist('user', user);
    },

    updateFriend: (updates) => {
      set((state) => {
        if (state.friend) {
          Object.assign(state.friend, updates);
        }
      });
      persist('friend', get().friend);
    },

    resetAll: () => {
      getStorage().clearAll();
      set((state) => {
        state.user = null;
        state.friend = null;
        state.onboarding = DEFAULT_ONBOARDING;
      });
    },

    loadFromStorage: () => {
      const user = restore<UserProfile>('user');
      const friend = restore<Friend>('friend');
      set((state) => {
        if (user) state.user = user;
        if (friend) state.friend = friend;
        if (friend) state.onboarding.isComplete = true;
      });
    },
  }))
);
