// Компонент пузырька сообщения
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { Message } from '@/types';
import type { ColorThemeId } from '@/constants/theme';
import { ColorThemes, Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  message: Message;
  colorTheme: ColorThemeId;
  onSwipe?: (messageId: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MessageBubble = React.memo(function MessageBubble({
  message,
  colorTheme,
  onSwipe,
}: Props) {
  const isUser = message.role === 'user';
  const theme = ColorThemes.find((t) => t.id === colorTheme) ?? ColorThemes[0]!;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  // Свайп вправо = цитирование
  const handleLongPress = useCallback(() => {
    if (onSwipe) {
      translateX.value = withSpring(8, { damping: 10 }, () => {
        translateX.value = withSpring(0);
      });
      onSwipe(message.id);
    }
  }, [message.id, onSwipe, translateX]);

  const timeStr = format(new Date(message.createdAt), 'HH:mm', { locale: ru });

  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify()}
      style={[styles.wrap, isUser ? styles.wrapUser : styles.wrapAssistant]}
    >
      <AnimatedPressable
        style={animStyle}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        {isUser ? (
          // Исходящее — цвет темы (градиент)
          <LinearGradient
            colors={[...theme.colors]}
            style={[styles.bubble, styles.bubbleUser]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.textUser}>{message.content}</Text>
            <Text style={styles.timeUser}>{timeStr} {message.isVoice ? '🎤' : ''}</Text>
          </LinearGradient>
        ) : (
          // Входящее — адаптивный тёмный
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <Text style={styles.textAssistant}>{message.content}</Text>
            <Text style={styles.timeAssistant}>{timeStr} {message.isVoice ? '🎤' : ''}</Text>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginVertical: 2, paddingHorizontal: Spacing.md },
  wrapUser: { alignItems: 'flex-end' },
  wrapAssistant: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  bubbleUser: {
    borderBottomRightRadius: Radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textUser: {
    fontSize: Typography.size.md,
    color: '#fff',
    lineHeight: Typography.size.md * Typography.lineHeight.normal,
  },
  textAssistant: {
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    lineHeight: Typography.size.md * Typography.lineHeight.normal,
  },
  timeUser: {
    fontSize: Typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeAssistant: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
});
