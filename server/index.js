// Мой Друг — Fastify 5 AI-прокси сервер (ESM, Node.js 20+)
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, unlink } from 'fs/promises';

// ─── Валидация окружения ────────────────────────────────────────────────────
const REQUIRED_ENV = ['ANTHROPIC_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Отсутствует переменная окружения: ${key}`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? [];

// ─── Anthropic клиент ───────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Fastify ────────────────────────────────────────────────────────────────
const fastify = Fastify({
  logger: IS_PROD
    ? { level: 'warn' }
    : { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } },
});

// ─── CORS ───────────────────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: IS_PROD ? ALLOWED_ORIGINS : true,
  credentials: true,
});

// ─── Rate limiting (глобально) ──────────────────────────────────────────────
await fastify.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Слишком много запросов, подожди немного' }),
});

// ─── Хелсчек ────────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

// ─── POST /chat ─────────────────────────────────────────────────────────────
// Принимает: { friendId, content, mode, history, systemPrompt }
// Возвращает: { content, tokensUsed }
fastify.post('/chat', {
  config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
}, async (request, reply) => {
  const { friendId, content, mode, history, systemPrompt } = request.body ?? {};

  // Базовая валидация
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return reply.status(400).send({ error: 'content обязателен' });
  }
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return reply.status(400).send({ error: 'systemPrompt обязателен' });
  }
  if (!Array.isArray(history)) {
    return reply.status(400).send({ error: 'history должен быть массивом' });
  }
  if (content.length > 4000) {
    return reply.status(400).send({ error: 'content слишком длинный (макс 4000)' });
  }

  const maxTokens = mode === 'voice' ? 500 : 1000;

  // Формируем историю для Anthropic API (макс 30 сообщений)
  const apiMessages = [
    ...history.slice(-30).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content),
    })),
    { role: 'user', content: content.trim() },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      temperature: 0.85,
      system: systemPrompt,
      messages: apiMessages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) {
      return reply.status(500).send({ error: 'Пустой ответ от AI' });
    }

    return reply.send({
      content: textBlock.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch (err) {
    fastify.log.error({ err, friendId }, 'Anthropic /chat ошибка');

    if (err?.status === 429) {
      return reply.status(429).send({ error: 'AI перегружен, попробуй позже' });
    }
    if (err?.status === 401) {
      return reply.status(500).send({ error: 'Ошибка авторизации AI' });
    }
    return reply.status(503).send({ error: 'AI временно недоступен' });
  }
});

// ─── POST /memory/extract ────────────────────────────────────────────────────
// Принимает: { friendId, messages: [{role, content}] }
// Возвращает: { facts: [{key, value, confidence}] }
fastify.post('/memory/extract', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (request, reply) => {
  const { friendId, messages } = request.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return reply.send({ facts: [] });
  }

  const dialogue = messages
    .slice(-20)
    .map((m) => `${m.role === 'user' ? 'Пользователь' : 'Друг'}: ${m.content}`)
    .join('\n');

  const prompt = `Извлеки факты о ПОЛЬЗОВАТЕЛЕ из диалога.
Верни JSON массив: [{"key": "ключ", "value": "значение", "confidence": 0.0-1.0}]
Ключи: имя, работа, хобби, настроение, возраст, город, питомец, интересы, отношения, цели.
Извлекай только явно упомянутые факты. Без домыслов. Confidence < 0.5 — не включай.

Диалог:
${dialogue}

Верни ТОЛЬКО JSON массив, без пояснений.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return reply.send({ facts: [] });

    const jsonMatch = textBlock.text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch?.[0]) return reply.send({ facts: [] });

    const raw = JSON.parse(jsonMatch[0]);
    const facts = raw.filter(
      (f) =>
        typeof f.key === 'string' &&
        typeof f.value === 'string' &&
        typeof f.confidence === 'number' &&
        f.confidence >= 0.5
    );

    return reply.send({ facts });
  } catch (err) {
    fastify.log.error({ err, friendId }, '/memory/extract ошибка');
    return reply.send({ facts: [] }); // тихая ошибка — не роняем клиента
  }
});

// ─── POST /tts ───────────────────────────────────────────────────────────────
// Принимает: { text, voice? }
// Возвращает: { audio: base64mp3 }
const ALLOWED_VOICES = [
  'ru-RU-DmitryNeural', 'ru-RU-SvetlanaNeural',
  'en-US-AriaNeural', 'en-US-GuyNeural',
];

fastify.post('/tts', {
  config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
}, async (request, reply) => {
  const { text, voice = 'ru-RU-SvetlanaNeural' } = request.body ?? {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return reply.status(400).send({ error: 'text обязателен' });
  }
  if (text.length > 1000) {
    return reply.status(400).send({ error: 'text слишком длинный (макс 1000)' });
  }
  if (!ALLOWED_VOICES.includes(voice)) {
    return reply.status(400).send({ error: 'Недопустимый голос' });
  }

  const tmpFile = join(tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

  try {
    await new Promise((resolve, reject) => {
      const proc = spawn('edge-tts', [
        '--voice', voice,
        '--text', text.trim(),
        '--write-media', tmpFile,
      ]);

      let stderr = '';
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`edge-tts code ${code}: ${stderr}`));
      });
      proc.on('error', (err) => reject(new Error(`edge-tts spawn: ${err.message}`)));
    });

    const audioBuffer = await readFile(tmpFile);
    return reply.send({ audio: audioBuffer.toString('base64'), format: 'mp3' });
  } catch (err) {
    fastify.log.error({ err }, '/tts ошибка');
    return reply.status(503).send({ error: 'TTS временно недоступен' });
  } finally {
    unlink(tmpFile).catch(() => {});
  }
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal) => {
  fastify.log.info(`${signal} — завершаю сервер...`);
  await fastify.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Запуск ──────────────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Мой Друг сервер запущен на http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
