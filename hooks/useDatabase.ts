// Хук для ленивой инициализации SQLite базы
import { useEffect, useRef } from 'react';
import type * as SQLite from 'expo-sqlite';
import { initDatabase } from '@/services/MemoryService';

export function useDatabase() {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const isInitRef = useRef(false);

  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;

    initDatabase().then((db) => {
      dbRef.current = db;
    }).catch((e) => {
      console.error('Ошибка инициализации БД:', e);
    });
  }, []);

  return dbRef;
}
