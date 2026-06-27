-- Миграция для pgvector (выполняется один раз)
-- Запускать: psql $DATABASE_URL -f migrate.sql

-- Расширение для векторного поиска
CREATE EXTENSION IF NOT EXISTS vector;

-- Добавляем колонку embedding к user_memory
ALTER TABLE user_memory
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Индекс для косинусного поиска (IVFFlat)
CREATE INDEX IF NOT EXISTS user_memory_embedding_idx
  ON user_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Функция семантического поиска похожих фактов
CREATE OR REPLACE FUNCTION search_memory(
  p_friend_id TEXT,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 10
)
RETURNS TABLE(id TEXT, key TEXT, value TEXT, confidence REAL, updated_at TIMESTAMP)
LANGUAGE SQL STABLE AS $$
  SELECT id, key, value, confidence, updated_at
  FROM user_memory
  WHERE friend_id = p_friend_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
$$;
