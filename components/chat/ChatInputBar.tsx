// Строка ввода с кнопкой голоса
import React, { useCallback, useState } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Text,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

interface Props {
  onSend: (text: string) => void;
  onVoicePress: () => void;
  quotedMessage?: { id: string; content: string } | null;
  onCancelQuote: () => void;
  isDisabled?: boolean;
}

export function ChatInputBar({
  onSend, onVoicePress, quotedMessage, onCancelQuote, isDisabled,
}: Props) {
  const [text, setText] = useState('');
  const sendScale = useSharedValue(1);

  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isDisabled) return;

    sendScale.value = withSpring(0.85, { damping: 10 }, () => {
      sendScale.value = withSpring(1);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
  }, [text, isDisabled, onSend, sendScale]);

  const canSend = text.trim().length > 0 && !isDisabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Цитата */}
      {quotedMessage && (
        <View style={styles.quoteBar}>
          <View style={styles.quoteContent}>
            <Text style={styles.quoteLabel}>Ответ на:</Text>
            <Text style={styles.quoteText} numberOfLines={1}>
              {quotedMessage.content}
            </Text>
          </View>
          <Pressable onPress={onCancelQuote} style={styles.quoteClose}>
            <Text style={styles.quoteCloseText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Инпут */}
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Написать..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={2000}
          returnKeyType="default"
          editable={!isDisabled}
        />

        {/* Кнопка голоса */}
        <Pressable style={styles.iconBtn} onPress={onVoicePress}>
          <Text style={styles.iconEmoji}>🎤</Text>
        </Pressable>

        {/* Кнопка отправки */}
        <Animated.View style={sendStyle}>
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    maxHeight: 120,
    minHeight: 44,
  },
  iconBtn: {
    width: 44, height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: Typography.weight.bold,
  },
  quoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quoteContent: { flex: 1 },
  quoteLabel: {
    fontSize: Typography.size.xs,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
    marginBottom: 2,
  },
  quoteText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  quoteClose: { padding: Spacing.sm },
  quoteCloseText: { color: Colors.textMuted, fontSize: Typography.size.md },
});
