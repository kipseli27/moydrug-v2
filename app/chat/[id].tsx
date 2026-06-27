// Главный экран чата
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';

import { useChatStore } from '@/stores/chatStore';
import { useUserStore } from '@/stores/userStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { VoiceSheet } from '@/components/chat/VoiceSheet';
import { sendMessage, generateWelcome } from '@/services/AIService';
import { Colors, ColorThemes, Spacing, Typography, Radius } from '@/constants/theme';
import type { Message, AIProfile } from '@/types';
import {
  initDatabase, loadMessages, saveMessage, getTopFacts, extractAndSaveFacts,
} from '@/services/MemoryService';
import type * as SQLite from 'expo-sqlite';

// Быстрые чипы для первого запуска
const QUICK_CHIPS = [
  'Привет! Как дела?',
  'Расскажи о себе',
  'Чем займёмся?',
  'Просто поговорим',
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const friend = useUserStore((s) => s.friend);
  const {
    messages, isTyping, currentMood, currentInsight, quotedMessageId,
    addMessage, setTyping, setMessages, updateProfile, quoteMessage,
  } = useChatStore();

  const [isVoiceOpen, setVoiceOpen] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [detectedStyle, setDetectedStyle] = useState<AIProfile['s']>('emotional');

  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const messageCountRef = useRef(0);

  // Тема и цвет
  const colorTheme = friend?.colorTheme ?? 'violet';
  const theme = ColorThemes.find((t) => t.id === colorTheme) ?? ColorThemes[0]!;

  // Анимация insight строки
  const insightOpacity = useSharedValue(0);
  const insightStyle = useAnimatedStyle(() => ({ opacity: insightOpacity.value }));

  // ─── Инициализация ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const db = await initDatabase();
      dbRef.current = db;

      if (!friend) return;

      // Загружаем историю из SQLite
      const history = await loadMessages(db, friend.id);
      setMessages(history);

      // Если история пустая → приветствие
      if (history.length === 0) {
        setShowChips(true);
        await sendWelcome(db);
      }
    }

    init();
  }, [friend?.id]); // eslint-disable-line

  // Следим за сетью
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsub;
  }, []);

  // Показываем insight
  useEffect(() => {
    if (currentInsight) {
      insightOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [currentInsight, insightOpacity]);

  // ─── Приветствие ──────────────────────────────────────────────────────────

  async function sendWelcome(db: SQLite.SQLiteDatabase) {
    if (!friend) return;
    setTyping(true);

    try {
      const content = await generateWelcome(friend);
      const msg: Message = {
        id: `msg_${Date.now()}`,
        friendId: friend.id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
      };
      addMessage(msg);
      await saveMessage(db, msg);
    } catch (e) {
      console.error('Ошибка приветствия:', e);
    } finally {
      setTyping(false);
    }
  }

  // ─── Отправка сообщения ───────────────────────────────────────────────────

  const handleSend = useCallback(async (
    text: string,
    mode: 'text' | 'voice' = 'text'
  ): Promise<string> => {
    if (!friend || !dbRef.current) return '';

    const db = dbRef.current;
    setShowChips(false);

    // Добавляем сообщение пользователя
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      friendId: friend.id,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      isVoice: mode === 'voice',
      quotedMessageId: quotedMessageId ?? undefined,
    };
    addMessage(userMsg);
    await saveMessage(db, userMsg);
    quoteMessage(null);
    messageCountRef.current += 1;

    setTyping(true);

    try {
      // Загружаем факты памяти
      const facts = await getTopFacts(db, friend.id);

      // Запрос к AI
      const { content, profile } = await sendMessage(
        friend,
        text,
        messages,
        facts,
        mode,
        detectedStyle
      );

      // Обновляем профиль UI
      if (profile) {
        updateProfile(profile);
        setDetectedStyle(profile.s);
      }

      // Сохраняем ответ AI
      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        friendId: friend.id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        isVoice: mode === 'voice',
      };
      addMessage(aiMsg);
      await saveMessage(db, aiMsg);

      // Каждые 10 сообщений → извлекаем факты (фоново)
      if (messageCountRef.current % 10 === 0) {
        extractAndSaveFacts(db, friend.id, messages.slice(0, 20));
      }

      return content;
    } catch (e) {
      console.error('Ошибка AI:', e);
      const errMsg: Message = {
        id: `msg_err_${Date.now()}`,
        friendId: friend.id,
        role: 'assistant',
        content: isOnline
          ? 'Что-то пошло не так, попробуй ещё раз 🙏'
          : 'Нет подключения к сети, проверь интернет',
        createdAt: Date.now(),
      };
      addMessage(errMsg);
      return '';
    } finally {
      setTyping(false);
    }
  }, [
    friend, messages, quotedMessageId, detectedStyle, isOnline,
    addMessage, setTyping, updateProfile, quoteMessage,
  ]);

  const handleVoiceSend = useCallback(async (text: string): Promise<string> => {
    return handleSend(text, 'voice');
  }, [handleSend]);

  // ─── Рендер ───────────────────────────────────────────────────────────────

  if (!friend) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>Друг не найден</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={{ color: Colors.primary }}>← Начать заново</Text>
        </Pressable>
      </View>
    );
  }

  const quotedMsg = quotedMessageId
    ? messages.find((m) => m.id === quotedMessageId)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Хедер */}
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.moodEmoji}>{currentMood}</Text>
        </View>

        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </LinearGradient>

      {/* Оффлайн индикатор */}
      {!isOnline && (
        <Animated.View entering={FadeIn} style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Нет подключения — история доступна</Text>
        </Animated.View>
      )}

      {/* Список сообщений — FlashList inverted */}
      {/* Union-тип: либо маркер typing, либо реальное сообщение */}
      <FlashList<Message | { id: string }>
        data={isTyping ? [{ id: '__typing__' } as { id: string }, ...messages] : messages}
        renderItem={({ item }) => {
          if (item.id === '__typing__') return <TypingIndicator />;
          return (
            <MessageBubble
              message={item as Message}
              colorTheme={colorTheme}
              onSwipe={quoteMessage}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        inverted
        estimatedItemSize={80}
        contentContainerStyle={{ paddingTop: Spacing.md }}
        ListFooterComponent={
          showChips ? (
            <View style={styles.chips}>
              {QUICK_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  style={[styles.chip, { borderColor: theme.colors[0] }]}
                  onPress={() => handleSend(chip)}
                >
                  <Text style={[styles.chipText, { color: theme.colors[0] }]}>{chip}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />

      {/* Insight строка */}
      {currentInsight.length > 0 && (
        <Animated.View style={[styles.insightBar, insightStyle]}>
          <Text style={styles.insightText} numberOfLines={1}>
            ✨ {currentInsight}
          </Text>
        </Animated.View>
      )}

      {/* Инпут */}
      <ChatInputBar
        onSend={handleSend}
        onVoicePress={() => setVoiceOpen(true)}
        quotedMessage={quotedMsg ? { id: quotedMsg.id, content: quotedMsg.content } : null}
        onCancelQuote={() => quoteMessage(null)}
        isDisabled={!isOnline}
      />

      {/* Голосовой лист */}
      <VoiceSheet
        visible={isVoiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSend={handleVoiceSend}
        colorTheme={colorTheme}
        voiceConfig={friend.voiceConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.sm },
  backIcon: { color: Colors.textPrimary, fontSize: 22 },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  friendName: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  moodEmoji: { fontSize: 20 },
  settingsBtn: { padding: Spacing.sm },
  settingsIcon: { fontSize: 20 },
  offlineBanner: {
    backgroundColor: Colors.warning + '33',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + '66',
  },
  offlineText: {
    color: Colors.warning,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  chipText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  insightBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  insightText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  errorWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: { color: Colors.textPrimary, fontSize: Typography.size.lg },
});
