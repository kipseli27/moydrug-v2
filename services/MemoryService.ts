// MemoryService — долгосрочная память через expo-sqlite
import * as SQLite from 'expo-sqlite';
import type { MemoryFact, Message } from '@/types';

const DB_NAME = 'moydrug.db';

// Инициализация базы (WAL режим)
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      friend_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      is_voice INTEGER DEFAULT 0,
      quoted_message_id TEXT
    );

    CREATE TABLE IF NOT EXISTS user_memory (
      id TEXT PRIMARY KEY,
      friend_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      updated_at INTEGER NOT NULL,
      UNIQUE(friend_id, key)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_friend ON messages(friend_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_friend ON user_memory(friend_id, updated_at DESC);
  `);

  return db;
}

// ─── Сообщения ───────────────────────────────────────────────────────────────

export async function saveMessage(
  db: SQLite.SQLiteDatabase,
  message: Message
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO messages
      (id, friend_id, role, content, tokens_used, created_at, is_voice, quoted_message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    message.id,
    message.friendId,
    message.role,
    message.content,
    message.tokensUsed ?? 0,
    message.createdAt,
    message.isVoice ? 1 : 0,
    message.quotedMessageId ?? null
  );
}

export async function loadMessages(
  db: SQLite.SQLiteDatabase,
  friendId: string,
  limit = 100
): Promise<Message[]> {
  const rows = await db.getAllAsync<{
    id: string;
    friend_id: string;
    role: string;
    content: string;
    tokens_used: number;
    created_at: number;
    is_voice: number;
    quoted_message_id: string | null;
  }>(
    `SELECT * FROM messages WHERE friend_id = ? ORDER BY created_at DESC LIMIT ?`,
    friendId,
    limit
  );

  return rows.map((r) => ({
    id: r.id,
    friendId: r.friend_id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    tokensUsed: r.tokens_used,
    createdAt: r.created_at,
    isVoice: r.is_voice === 1,
    quotedMessageId: r.quoted_message_id ?? undefined,
  }));
}

export async function clearMessages(
  db: SQLite.SQLiteDatabase,
  friendId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM messages WHERE friend_id = ?`, friendId);
}

// ─── Память (факты) ──────────────────────────────────────────────────────────

export async function upsertMemoryFact(
  db: SQLite.SQLiteDatabase,
  fact: Omit<MemoryFact, 'id'>
): Promise<void> {
  const id = `mem_${fact.friendId}_${fact.key}_${Date.now()}`;
  await db.runAsync(
    `INSERT INTO user_memory (id, friend_id, key, value, confidence, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(friend_id, key) DO UPDATE SET
       value = excluded.value,
       confidence = excluded.confidence,
       updated_at = excluded.updated_at`,
    id,
    fact.friendId,
    fact.key,
    fact.value,
    fact.confidence,
    fact.updatedAt
  );

  // FIFO: оставляем только 50 последних фактов
  await db.runAsync(
    `DELETE FROM user_memory WHERE friend_id = ? AND id NOT IN (
       SELECT id FROM user_memory WHERE friend_id = ?
       ORDER BY updated_at DESC LIMIT 50
     )`,
    fact.friendId,
    fact.friendId
  );
}

export async function getTopFacts(
  db: SQLite.SQLiteDatabase,
  friendId: string,
  limit = 10
): Promise<MemoryFact[]> {
  const rows = await db.getAllAsync<{
    id: string;
    friend_id: string;
    key: string;
    value: string;
    confidence: number;
    updated_at: number;
  }>(
    `SELECT * FROM user_memory WHERE friend_id = ?
     ORDER BY confidence DESC, updated_at DESC LIMIT ?`,
    friendId,
    limit
  );

  return rows.map((r) => ({
    id: r.id,
    friendId: r.friend_id,
    key: r.key,
    value: r.value,
    confidence: r.confidence,
    updatedAt: r.updated_at,
  }));
}

/**
 * Вызывается каждые 10 сообщений — извлекаем факты через AI (бэкенд)
 */
export async function extractAndSaveFacts(
  db: SQLite.SQLiteDatabase,
  friendId: string,
  messages: Message[]
): Promise<void> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const resp = await fetch(`${apiUrl}/memory/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        friendId,
        messages: messages.slice(0, 20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!resp.ok) return;

    const { facts } = await resp.json() as {
      facts: Array<{ key: string; value: string; confidence: number }>;
    };

    const now = Date.now();
    for (const fact of facts) {
      await upsertMemoryFact(db, {
        friendId,
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        updatedAt: now,
      });
    }
  } catch (e) {
    // Тихая ошибка — оффлайн
    console.warn('Не удалось извлечь факты:', e);
  }
}
