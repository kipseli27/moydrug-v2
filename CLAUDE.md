# МОЙ ДРУГ — Claude Code Config

## Проект
React Native 0.76 + Expo SDK 52. Персональный AI-собеседник.
Старт: 10.05.2026. Релиз: сентябрь 2026.

## Стек (не менять без согласования)
- React Native 0.76, New Architecture (Bridgeless)
- Expo SDK 52, Expo Router 4 (file-based routing)
- TypeScript 5.5 strict (noImplicitAny, strictNullChecks)
- Zustand 5 + Immer (стейт)
- MMKV 3 (быстрое хранилище), expo-sqlite 15 (история, память)
- FlashList 1.7 (чат-список, НИКОГДА не FlatList)
- Reanimated 3.x + Skia (анимации, НИКОГДА не Animated)
- expo-speech-recognition 0.4 (STT)
- expo-speech 13 (TTS)
- react-native-purchases (RevenueCat) — подписки
- Fastify 5 бэкенд в /server
- Drizzle ORM + PostgreSQL 17 + pgvector

## Структура папок
/app               — экраны (Expo Router)
/app/_auth         — онбординг, вход
/app/_tabs         — основные табы (чат, профиль)
/app/chat/[id]     — экран чата
/components        — UI компоненты
/components/chat   — пузырьки, typing, voice sheet
/stores            — Zustand stores (chat, user, subscription)
/services          — AIService, VoiceService, MemoryService
/server            — Fastify бэкенд
/server/routes     — /chat, /auth, /subscription, /memory
/server/db         — Drizzle схема и миграции

## Правила кода (обязательно)
- TypeScript строгий, никаких any и as unknown
- Компоненты: функциональные + хуки, без классов
- Анимации ТОЛЬКО через Reanimated useAnimatedStyle
- API ключи ТОЛЬКО в .env, никогда в коде
- Тесты Jest + @testing-library/react-native
- Lint: eslint + prettier, проверяй перед коммитом
- Комментарии на русском языке

## AI модель
- claude-sonnet-4-5 (claude-sonnet-4-20250514)
- temperature: 0.85, max_tokens (text): 1000, max_tokens (voice): 500
- История: последние 30 сообщений
- System prompt: ~500 токенов

## Запреты
- НЕ использовать FlatList — только FlashList
- НЕ использовать Animated — только Reanimated
- НЕ хранить Anthropic API key в приложении
- НЕ делать прямые вызовы Anthropic API из RN — только через /server
- НЕ использовать class components
- НЕ коммитить .env файлы
