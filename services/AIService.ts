// AIService — работа с бэкендом, построение промпта, парсинг JSON-профиля
import axios from 'axios';
import type { Message, AIProfile, SendMessageRequest, SendMessageResponse, Friend } from '@/types';
import type { MemoryFact } from '@/types';
import { PersonaConfig } from '@/constants/theme';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://46.103.38.189').trim();

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Регулярка для скрытого JSON в конце ответа ──────────────────────────────
const PROFILE_REGEX = /<!--D:(\{.*?\})-->/s;

/**
 * Извлекает JSON-профиль из ответа и возвращает чистый текст + профиль
 */
export function parseAIResponse(raw: string): {
  content: string;
  profile: AIProfile | null;
} {
  const match = PROFILE_REGEX.exec(raw);
  if (!match || !match[1]) return { content: raw.trim(), profile: null };

  try {
    const profile = JSON.parse(match[1]) as AIProfile;
    const content = raw.replace(PROFILE_REGEX, '').trim();
    return { content, profile };
  } catch {
    return { content: raw.trim(), profile: null };
  }
}

/**
 * Строит system-prompt для персонажа по спецификации ТЗ
 */
export function buildSystemPrompt(
  friend: Friend,
  facts: MemoryFact[],
  mode: 'text' | 'voice',
  detectedStyle: AIProfile['s'] = 'emotional'
): string {
  const config = PersonaConfig[friend.personaType];

  // [1] ПЕРСОНАЖ
  const personaBlock = `# Ты — ${friend.name}
Тип: ${config.label}. Характер: ${config.style}.
Ты — настоящий друг пользователя, не ассистент. Ты не решаешь задачи и не ищешь информацию.
НИКОГДА не раскрывай, что ты AI. Если спросят — скажи, что ты просто друг.`;

  // [2] ПАМЯТЬ
  const factsBlock = facts.length > 0
    ? `# О пользователе (факты из памяти):\n${facts.map((f) => `- ${f.key}: ${f.value}`).join('\n')}`
    : `# О пользователе: пока ничего не известно, познакомься!`;

  // [3] АДАПТАЦИЯ
  const styleRules: Record<AIProfile['s'], string> = {
    brief: 'Пользователь пишет кратко → отвечай ≤ 2 предложения.',
    emotional: 'Пользователь эмоционален → больше эмпатии, меньше советов.',
    playful: 'Пользователь игривый → юмор, эмодзи, шутки.',
    serious: 'Пользователь серьёзный → без эмодзи, структурированно.',
  };
  const adaptBlock = `# Адаптация стиля: ${styleRules[detectedStyle]}`;

  // [4] РЕЖИМ
  const modeBlock = mode === 'voice'
    ? `# Режим: ГОЛОСОВОЙ. Отвечай коротко (max 2-3 фразы). БЕЗ эмодзи. Говори как в живом разговоре.`
    : `# Режим: ТЕКСТОВЫЙ. Можно использовать эмодзи умеренно.`;

  // [5] JSON ИНСТРУКЦИЯ
  const jsonBlock = mode === 'text'
    ? `# В КОНЦЕ КАЖДОГО ОТВЕТА добавь (пользователь не видит):
<!--D:{"m":"<emoji настроения>","i":"<короткое наблюдение о разговоре>","s":"<brief|emotional|playful|serious>"}-->
Пример: <!--D:{"m":"😊","i":"Пользователь в хорошем настроении","s":"playful"}-->`
    : '';

  return [personaBlock, factsBlock, adaptBlock, modeBlock, jsonBlock]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Отправляет сообщение через /chat прокси на бэкенде
 */
export async function sendMessage(
  friend: Friend,
  content: string,
  history: Message[],
  facts: MemoryFact[],
  mode: 'text' | 'voice' = 'text',
  detectedStyle: AIProfile['s'] = 'emotional'
): Promise<{ content: string; profile: AIProfile | null }> {
  // Берём последние 30 сообщений в хронологическом порядке
  const trimmedHistory = history.slice(-30).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(friend, facts, mode, detectedStyle);

  const payload: SendMessageRequest = {
    friendId: friend.id,
    content,
    mode,
    history: trimmedHistory,
  };

  const { data } = await api.post<SendMessageResponse>('/chat', {
    ...payload,
    systemPrompt,
  });

  return parseAIResponse(data.content);
}

/**
 * Генерирует первое приветствие при создании друга
 */
export async function generateWelcome(friend: Friend): Promise<string> {
  const config = PersonaConfig[friend.personaType];
  const systemPrompt = buildSystemPrompt(friend, [], 'text', 'playful');

  const { data } = await api.post<SendMessageResponse>('/chat', {
    friendId: friend.id,
    content: `Представься как ${friend.name} (${config.label}) и скажи первое приветствие новому другу. Будь тёплым и искренним.`,
    mode: 'text',
    history: [],
    systemPrompt,
    isWelcome: true,
  });

  const { content } = parseAIResponse(data.content);
  return content;
}
