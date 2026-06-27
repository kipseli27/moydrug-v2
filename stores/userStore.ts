// Zustand store — пользователь и друг
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MMKV } from 'react-native-mmkv';
import type { UserProfile, Friend } from '@/types';
import { PersonaConfig } from '@/constants/theme';
import type { ColorThemeId, PersonaType } from '@/constants/theme';

const storage = new MMKV({ id: 'user-storage' });

// Сохранение/загрузка из MMKV
function persist<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
function restore<T>(key: string): T | null {
  const raw = storage.getString(key);
  return raw ? (JSON.parse(raw) as T) : null;
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
      // Сохраняем тему мгновенно (MMKV)
      storage.set('colorTheme', theme);
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
      storage.clearAll();
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
