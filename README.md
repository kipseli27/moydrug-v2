# Мой Друг — Персональный AI-собеседник

React Native 0.76 + Expo SDK 52 + Fastify 5 + Claude claude-sonnet-4-5

## Быстрый старт

### 1. Мобильное приложение

```bash
# Установка зависимостей
npm install

# Копируем конфиг
cp .env.example .env
# Заполни EXPO_PUBLIC_API_URL в .env

# Запуск
npx expo start
```

### 2. Backend сервер

```bash
cd server
npm install

# Копируем конфиг
cp ../.env.example .env
# Заполни ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL

# База данных
createdb moydrug
npm run db:generate
npm run db:migrate

# pgvector (после drizzle migrate)
psql $DATABASE_URL -f src/db/migrate.sql

# Запуск в dev режиме
npm run dev
```

## Архитектура

```
RN App → Fastify API → [Rate Limiter] → Anthropic API (claude-sonnet-4-5)
                     ↓
             PostgreSQL 17 + pgvector
             Redis (сессии, rate limit)
```

## Структура проекта

```
/app           — Expo Router экраны
  /_auth       — Онбординг (3 экрана)
  /_tabs       — Профиль
  /chat/[id]   — Экран чата
/components    — UI компоненты
  /chat        — MessageBubble, TypingIndicator, VoiceSheet, ChatInputBar
/stores        — Zustand (userStore, chatStore, subscriptionStore)
/services      — AIService, MemoryService, VoiceService
/constants     — theme.ts (цвета, шрифты, персонажи)
/types         — TypeScript типы
/server        — Fastify backend
  /src/routes  — /chat, /memory
  /src/db      — Drizzle схема PostgreSQL
```

## Технологии

| Компонент | Технология |
|-----------|------------|
| Framework | React Native 0.76 + New Architecture |
| Навигация | Expo Router 4 (file-based) |
| Список | @shopify/flash-list |
| Анимации | Reanimated 3 + Skia |
| STT | expo-speech-recognition |
| TTS | expo-speech |
| Хранилище | MMKV + expo-sqlite |
| Стейт | Zustand 5 + Immer |
| AI | Claude claude-sonnet-4-5 (через /server) |
| Backend | Fastify 5 + Drizzle + PostgreSQL 17 |
| Векторный поиск | pgvector 0.8 |

## Переменные окружения

```env
# Приложение
EXPO_PUBLIC_API_URL=http://localhost:3000

# Сервер
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BETTER_AUTH_SECRET=...
```
