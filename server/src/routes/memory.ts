// /memory — извлечение фактов через claude-haiku
import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const ExtractBodySchema = z.object({
  friendId: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1).max(20),
});

type Fact = {
  key: string;
  value: string;
  confidence: number;
};

export async function memoryRoutes(fastify: FastifyInstance) {
  // Извлечение фактов о пользователе
  fastify.post('/memory/extract', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = ExtractBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Неверные данные' });
    }

    const { messages } = body.data;
    const dialogue = messages
      .map((m) => `${m.role === 'user' ? 'Пользователь' : 'Друг'}: ${m.content}`)
      .join('\n');

    const prompt = `Извлеки факты о ПОЛЬЗОВАТЕЛЕ из диалога.
Верни JSON массив: [{"key": "ключ", "value": "значение", "confidence": 0.0-1.0}]
Ключи: имя, работа, хобби, настроение, возраст, город, питомец, интересы, отношения, цели.
Извлекай только явно упомянутые факты. Без домыслов.

Диалог:
${dialogue}

Верни ТОЛЬКО JSON, без пояснений.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', // дешевле для фоновых задач
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return reply.send({ facts: [] });
      }

      // Парсим JSON ответ
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch || !jsonMatch[0]) {
        return reply.send({ facts: [] });
      }

      const facts: Fact[] = JSON.parse(jsonMatch[0]);

      // Фильтруем невалидные
      const validFacts = facts.filter(
        (f): f is Fact =>
          typeof f.key === 'string' &&
          typeof f.value === 'string' &&
          typeof f.confidence === 'number' &&
          f.confidence >= 0.5 // только уверенные факты
      );

      return reply.send({ facts: validFacts });
    } catch (err) {
      fastify.log.error('Memory extract ошибка:', err);
      return reply.send({ facts: [] }); // тихая ошибка
    }
  });
}
