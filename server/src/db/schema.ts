// Drizzle ORM — схема PostgreSQL 17
import {
  pgTable, text, integer, real, timestamp, boolean,
  index, uniqueIndex, pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Энумы ────────────────────────────────────────────────────────────────────

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free', 'premium', 'premium_plus',
]);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'expired', 'cancelled',
]);
export const subscriptionProviderEnum = pgEnum('subscription_provider', [
  'apple', 'google',
]);

// ─── Таблицы ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  subscriptionTier: subscriptionTierEnum('subscription_tier').default('free').notNull(),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  locale: text('locale').default('ru').notNull(),
});

export const friends = pgTable('friends', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  personaType: text('persona_type').notNull(), // girlfriend|friend|spark|sage
  name: text('name').notNull(),
  colorTheme: text('color_theme').notNull(),
  voiceConfig: text('voice_config').notNull(), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('friends_user_idx').on(table.userId),
}));

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  friendId: text('friend_id').references(() => friends.id, { onDelete: 'cascade' }).notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isVoice: boolean('is_voice').default(false),
  quotedMessageId: text('quoted_message_id'),
}, (table) => ({
  friendCreatedIdx: index('messages_friend_created_idx').on(table.friendId, table.createdAt),
}));

export const userMemory = pgTable('user_memory', {
  id: text('id').primaryKey(),
  friendId: text('friend_id').references(() => friends.id, { onDelete: 'cascade' }).notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  // embedding хранится как vector(1536) — добавляется через SQL миграцию
  confidence: real('confidence').default(1.0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  friendKeyUniq: uniqueIndex('user_memory_friend_key').on(table.friendId, table.key),
  friendUpdatedIdx: index('user_memory_friend_updated_idx').on(table.friendId, table.updatedAt),
}));

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  deviceId: text('device_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tier: subscriptionTierEnum('tier').notNull(),
  provider: subscriptionProviderEnum('provider'),
  receipt: text('receipt'),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdx: index('subscriptions_user_idx').on(table.userId),
}));

export const iapPurchases = pgTable('iap_purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  receipt: text('receipt'),
});

// SQL для pgvector (выполнить отдельной миграцией):
// CREATE EXTENSION IF NOT EXISTS vector;
// ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS embedding vector(1536);
// CREATE INDEX ON user_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
