// AIService — работа с бэкендом, построение промпта, парсинг JSON-профиля
import type { Message, AIProfile, SendMessageRequest, SendMessageResponse, Friend } from '@/types';
import type { MemoryFact } from '@/types';
import { PersonaConfig } from '@/constants/theme';

const API_URL = 'http://46.103.38.189';

async function postJSON(path: string, body: object): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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
    ? `# ГОЛОСОВОЙ режим: 1-2 коротких фразы. БЕЗ эмодзи. Разговорный стиль.`
    : `# Режим: ТЕКСТОВЫЙ. Можно использовать эмодзи умеренно.`;

  // [5] JSON ИНСТРУКЦИЯ (только в текстовом режиме)
  const jsonBlock = mode === 'text'
    ? `# В КОНЦЕ КАЖДОГО ОТВЕТА добавь (пользователь не видит):
<!--D:{"m":"<emoji настроения>","i":"<короткое наблюдение о разговоре>","s":"<brief|emotional|playful|serious>"}-->
Пример: <!--D:{"m":"😊","i":"Пользователь в хорошем настроении","s":"playful"}-->`
    : '';

  // В voice режиме — минимальный prompt (скорость важнее)
  if (mode === 'voice') {
    return [personaBlock, modeBlock].join('\n\n');
  }

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
  // В voice режиме берём только 5 последних (меньше токенов = быстрее)
  const historyLimit = mode === 'voice' ? 5 : 30;
  const trimmedHistory = history.slice(-historyLimit).map((m) => ({
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

  const data = await postJSON('/chat', { ...payload, systemPrompt });

  return parseAIResponse(data.content);
}

/**
 * Генерирует первое приветствие при создании друга
 */
export async function generateWelcome(friend: Friend): Promise<string> {
  const config = PersonaConfig[friend.personaType];
  const systemPrompt = buildSystemPrompt(friend, [], 'text', 'playful');

  const data = await postJSON('/chat', {
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
