// /chat — AI прокси с rate limiting и стримингом
import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const ChatBodySchema = z.object({
  friendId: z.string(),
  content: z.string().min(1).max(4000),
  mode: z.enum(['text', 'voice']),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(30),
  systemPrompt: z.string(),
  isWelcome: z.boolean().optional(),
});

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/chat', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = ChatBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: body.error.flatten() });
    }

    const { content, mode, history, systemPrompt } = body.data;

    // Формируем историю для Anthropic API
    const apiMessages: Anthropic.MessageParam[] = [
      ...history.map((m): Anthropic.MessageParam => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content },
    ];

    const maxTokens = mode === 'voice' ? 500 : 1000;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature: 0.85,
        system: systemPrompt,
        messages: apiMessages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return reply.status(500).send({ error: 'Пустой ответ от AI' });
      }

      return reply.send({
        content: textBlock.text,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (err) {
      fastify.log.error('Anthropic API ошибка:', err);
      return reply.status(503).send({ error: 'AI временно недоступен' });
    }
  });
}
