// Дизайн-токены приложения «Мой Друг»

export const Colors = {
  // Базовые
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceSecondary: '#252540',
  border: '#2E2E50',

  // Текст
  textPrimary: '#F0F0FF',
  textSecondary: '#8888AA',
  textMuted: '#555570',

  // Акценты
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  success: '#4CAF82',
  warning: '#FFB347',
  error: '#FF6B6B',

  // Персонажи
  persona: {
    girlfriend: '#FF8FAB', // Подруга 🌸
    friend: '#4A9EFF',    // Друг 🤙
    spark: '#FF6B35',     // Зажигалка 🔥
    sage: '#52B788',      // Мудрец 🌿
  },
} as const;

// 6 цветовых градиентов для тем
export const ColorThemes = [
  { id: 'violet', name: 'Фиолетовый', colors: ['#6C63FF', '#9D50BB'] as const },
  { id: 'rose', name: 'Розовый', colors: ['#FF6CAE', '#FF8FAB'] as const },
  { id: 'ocean', name: 'Океан', colors: ['#2193B0', '#6DD5FA'] as const },
  { id: 'sunset', name: 'Закат', colors: ['#FF6B35', '#F7C59F'] as const },
  { id: 'forest', name: 'Лес', colors: ['#52B788', '#40916C'] as const },
  { id: 'midnight', name: 'Полночь', colors: ['#2C3E50', '#4CA1AF'] as const },
] as const;

export type ColorThemeId = typeof ColorThemes[number]['id'];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const Typography = {
  // Размеры
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 32,
  },
  // Насыщенность
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Межстрочный
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// Тип персонажа
export type PersonaType = 'girlfriend' | 'friend' | 'spark' | 'sage';

export const PersonaConfig: Record<PersonaType, {
  label: string;
  emoji: string;
  description: string;
  color: string;
  pitchRate: number;
  speechRate: number;
  style: string;
}> = {
  girlfriend: {
    label: 'Подруга',
    emoji: '🌸',
    description: 'Тёплая, чуткая, всегда поддержит',
    color: Colors.persona.girlfriend,
    pitchRate: 1.3,
    speechRate: 1.0,
    style: 'Тёплая, эмпатичная, использует эмодзи умеренно',
  },
  friend: {
    label: 'Друг',
    emoji: '🤙',
    description: 'Надёжный, ироничный, говорит прямо',
    color: Colors.persona.friend,
    pitchRate: 0.9,
    speechRate: 1.05,
    style: 'Лаконичный, с юмором, без сантиментов',
  },
  spark: {
    label: 'Зажигалка',
    emoji: '🔥',
    description: 'Дерзкая, энергичная, заряжает на действие',
    color: Colors.persona.spark,
    pitchRate: 1.1,
    speechRate: 1.15,
    style: 'Динамичный, много эмодзи, позитивная энергия',
  },
  sage: {
    label: 'Мудрец',
    emoji: '🌿',
    description: 'Спокойный, глубокий, философский',
    color: Colors.persona.sage,
    pitchRate: 0.8,
    speechRate: 0.92,
    style: 'Развёрнутые ответы, без эмодзи, глубокий смысл',
  },
};
