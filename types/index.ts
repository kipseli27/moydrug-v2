// Общие типы приложения

import type { PersonaType, ColorThemeId } from '@/constants/theme';

// ─── Пользователь и друг ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email?: string;
  createdAt: number;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  subscriptionExpiresAt?: number;
}

export interface Friend {
  id: string;
  userId: string;
  personaType: PersonaType;
  name: string;
  colorTheme: ColorThemeId;
  voiceConfig: VoiceConfig;
  createdAt: number;
}

export interface VoiceConfig {
  pitch: number;
  rate: number;
  language: string;
}

// ─── Сообщения ───────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  friendId: string;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  createdAt: number;
  isVoice?: boolean;
  quotedMessageId?: string;
}

// ─── AI профиль — скрытый JSON в ответе ─────────────────────────────────────

export interface AIProfile {
  m: string; // mood (настроение) — emoji
  i: string; // insight (наблюдение о разговоре)
  s: 'brief' | 'emotional' | 'playful' | 'serious'; // style
}

// ─── Память ──────────────────────────────────────────────────────────────────

export interface MemoryFact {
  id: string;
  friendId: string;
  key: string;
  value: string;
  confidence: number; // 0.0 – 1.0
  updatedAt: number;
}

// ─── Подписка ────────────────────────────────────────────────────────────────

export interface Subscription {
  tier: 'free' | 'premium' | 'premium_plus';
  provider?: 'apple' | 'google';
  expiresAt?: number;
  status: 'active' | 'expired' | 'cancelled';
}

// ─── Запросы к API ───────────────────────────────────────────────────────────

export interface SendMessageRequest {
  friendId: string;
  content: string;
  mode: 'text' | 'voice';
  history: Array<{ role: MessageRole; content: string }>;
}

export interface SendMessageResponse {
  content: string;
  profile: AIProfile;
  tokensUsed: number;
}
