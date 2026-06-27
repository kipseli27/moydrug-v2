// Fastify 5 — точка входа сервера
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import 'dotenv/config';

import { chatRoutes } from './routes/chat.js';
import { memoryRoutes } from './routes/memory.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function build() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info',
      transport: process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Плагины
  await fastify.register(cors, {
    origin: process.env['NODE_ENV'] === 'production'
      ? ['https://app.moydrug.com']
      : true,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Слишком много запросов, подожди немного',
    }),
  });

  // Маршруты
  await fastify.register(chatRoutes);
  await fastify.register(memoryRoutes);

  // Хелсчек
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  }));

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    fastify.log.info('SIGTERM — завершаю сервер...');
    await fastify.close();
    process.exit(0);
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await build();
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`🚀 Сервер запущен на http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Ошибка запуска сервера:', err);
    process.exit(1);
  }
}

start();
