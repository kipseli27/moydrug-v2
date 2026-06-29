// Главный экран — голосовой собеседник
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useUserStore } from '@/stores/userStore';
import { sendMessage, generateWelcome } from '@/services/AIService';
import {
  speak, stopSpeaking, requestSpeechPermission,
  startListening, stopListening, useSTTEvents,
} from '@/services/VoiceService';
import { Colors, ColorThemes, Spacing, Typography, Radius, PersonaConfig } from '@/constants/theme';
import {
  initDatabase, loadMessages, saveMessage, getTopFacts,
} from '@/services/MemoryService';
import type { Message } from '@/types';
import type * as SQLite from 'expo-sqlite';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const friend = useUserStore((s) => s.friend);

  const [status, setStatus] = useState<Status>('idle');
  const [lastUserText, setLastUserText] = useState('');
  const [lastAIText, setLastAIText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const isListeningRef = useRef(false);

  const colorTheme = friend?.colorTheme ?? 'violet';
  const theme = ColorThemes.find((t) => t.id === colorTheme) ?? ColorThemes[0]!;
  const config = friend ? PersonaConfig[friend.personaType] : null;

  // ─── Инициализация ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      if (!friend) return;
      const db = await initDatabase();
      dbRef.current = db;
      const history = await loadMessages(db, friend.id);
      setMessages(history);

      if (history.length === 0) {
        await sendWelcome(db);
      } else {
        const lastAI = [...history].reverse().find((m) => m.role === 'assistant');
        if (lastAI) setLastAIText(lastAI.content);
      }
    }
    init();
    return () => { stopSpeaking(); };
  }, [friend?.id]); // eslint-disable-line

  // ─── Голосовые события (STT) ──────────────────────────────────────────────

  useSTTEvents(
    async (transcript) => {
      isListeningRef.current = false;
      if (!transcript.trim()) { setStatus('idle'); return; }
      setLastUserText(transcript);
      await handleAI(transcript);
    },
    (error) => {
      console.warn('STT ошибка:', error);
      setStatus('idle');
    }
  );

  // ─── Приветствие ──────────────────────────────────────────────────────────

  async function sendWelcome(db: SQLite.SQLiteDatabase) {
    if (!friend) return;
    setStatus('thinking');
    try {
      const content = await generateWelcome(friend);
      const msg: Message = {
        id: `msg_${Date.now()}`,
        friendId: friend.id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
      };
      setMessages([msg]);
      await saveMessage(db, msg);
      setLastAIText(content);
      setStatus('speaking');
      await speak(content, friend.voiceConfig, () => setStatus('idle'));
    } catch {
      setLastAIText('Привет! Нажми кнопку и поговори со мной 🎤');
      setStatus('idle');
    }
  }

  // ─── Обработка AI ─────────────────────────────────────────────────────────

  const handleAI = useCallback(async (text: string) => {
    if (!friend || !dbRef.current) return;
    const db = dbRef.current;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      friendId: friend.id,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      isVoice: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(db, userMsg);

    setStatus('thinking');
    try {
      const facts = await getTopFacts(db, friend.id);
      const { content } = await sendMessage(friend, text, messages, facts, 'voice', 'emotional');

      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        friendId: friend.id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        isVoice: true,
      };
      setMessages((prev) => [...prev, aiMsg]);
      await saveMessage(db, aiMsg);
      setLastAIText(content);

      setStatus('speaking');
      await speak(content, friend.voiceConfig, () => setStatus('idle'));
    } catch (e) {
      console.error('AI ошибка:', e);
      const errText = 'Не удалось подключиться к серверу. Попробуй ещё раз.';
      setLastAIText(errText);
      setStatus('speaking');
      await speak(errText, friend!.voiceConfig, () => setStatus('idle'));
    }
  }, [friend, messages]);

  // ─── Нажатие микрофона ────────────────────────────────────────────────────

  const handleMicPress = useCallback(async () => {
    if (status === 'speaking') {
      stopSpeaking();
      setStatus('idle');
      return;
    }
    if (status === 'listening') {
      stopListening();
      isListeningRef.current = false;
      setStatus('idle');
      return;
    }
    if (status === 'thinking') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const granted = await requestSpeechPermission();
    if (!granted) {
      setLastAIText('Нет разрешения на микрофон. Проверь настройки.');
      return;
    }
    isListeningRef.current = true;
    setStatus('listening');
    startListening('ru-RU');
  }, [status]);

  // ─── Статус-текст ─────────────────────────────────────────────────────────

  const statusLabel: Record<Status, string> = {
    idle: 'Нажми и говори',
    listening: 'Слушаю...',
    thinking: 'Думает...',
    speaking: 'Говорит... (нажми чтобы остановить)',
  };

  if (!friend || !config) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textPrimary }}>Собеседник не найден</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={{ color: Colors.primary, marginTop: 12 }}>← Начать заново</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Хедер */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{friend.name}</Text>
          <Text style={styles.headerEmoji}>{config.emoji}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.headerBtn}>
          <Text style={styles.headerIcon}>⚙️</Text>
        </Pressable>
      </View>

      {/* Центральная зона */}
      <View style={styles.main}>
        {/* Аватар */}
        <LinearGradient
          colors={[...theme.colors]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarEmoji}>{config.emoji}</Text>
        </LinearGradient>

        {/* Последний ответ AI */}
        <ScrollView style={styles.textScroll} contentContainerStyle={styles.textScrollContent}>
          {lastUserText ? (
            <Text style={styles.userText}>Ты: {lastUserText}</Text>
          ) : null}
          {lastAIText ? (
            <Text style={styles.aiText}>{lastAIText}</Text>
          ) : null}
        </ScrollView>

        {/* Статус */}
        <Text style={styles.statusText}>{statusLabel[status]}</Text>

        {/* Кнопка микрофона */}
        <Pressable
          onPress={handleMicPress}
          style={({ pressed }) => [
            styles.micBtn,
            status === 'listening' && styles.micBtnActive,
            status === 'speaking' && styles.micBtnSpeaking,
            pressed && styles.micBtnPressed,
          ]}
        >
          <LinearGradient
            colors={
              status === 'listening'
                ? ['#FF6B35', '#FF4500']
                : status === 'speaking'
                ? ['#52B788', '#40916C']
                : [...theme.colors]
            }
            style={styles.micBtnGradient}
          >
            {status === 'thinking' ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.micIcon}>
                {status === 'listening' ? '⏹' : status === 'speaking' ? '⏸' : '🎤'}
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* История */}
        <Pressable
          style={styles.historyBtn}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.historyBtnText}>
            {showHistory ? 'Скрыть историю' : 'История'}
          </Text>
        </Pressable>
      </View>

      {/* История сообщений (опционально) */}
      {showHistory && (
        <View style={styles.history}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[...messages].reverse().map((m) => (
              <View key={m.id} style={[
                styles.historyItem,
                m.role === 'user' && styles.historyItemUser,
              ]}>
                <Text style={styles.historyRole}>
                  {m.role === 'user' ? 'Ты' : friend.name}
                </Text>
                <Text style={styles.historyContent}>{m.content}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { padding: Spacing.sm, width: 44, alignItems: 'center' },
  headerIcon: { color: Colors.textPrimary, fontSize: 22 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  headerName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  headerEmoji: { fontSize: 20 },

  main: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  avatarEmoji: { fontSize: 72 },

  textScroll: { width: '100%', maxHeight: 160, marginBottom: Spacing.lg },
  textScrollContent: { paddingHorizontal: Spacing.sm },
  userText: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  aiText: {
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },

  statusText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  micBtn: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  micBtnActive: { transform: [{ scale: 1.1 }] },
  micBtnSpeaking: { opacity: 0.85 },
  micBtnPressed: { opacity: 0.7 },
  micBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 40 },

  historyBtn: { paddingVertical: Spacing.sm },
  historyBtnText: { color: Colors.textMuted, fontSize: Typography.size.sm },

  history: {
    height: 200,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyItem: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  historyItemUser: { backgroundColor: Colors.surfaceSecondary },
  historyRole: { fontSize: Typography.size.xs, color: Colors.textMuted, marginBottom: 2 },
  historyContent: { fontSize: Typography.size.sm, color: Colors.textPrimary },
});
