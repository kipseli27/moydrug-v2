// VoiceSheet — нижний лист голосового общения
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, interpolate, FadeIn, FadeOut, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  startListening, stopListening, useSTTEvents, speak, stopSpeaking,
  requestSpeechPermission,
} from '@/services/VoiceService';
import { Colors, Spacing, Radius, Typography, ColorThemes } from '@/constants/theme';
import type { ColorThemeId } from '@/constants/theme';
import type { VoiceConfig } from '@/types';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<string>; // возвращает ответ AI
  colorTheme: ColorThemeId;
  voiceConfig: VoiceConfig;
}

// Волны — анимированные круги
function WaveRing({ delay, color }: { delay: number; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2, { duration: 1200 }),
      -1, false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1200 }),
      -1, false
    );
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    borderColor: color,
  }));

  return (
    <Animated.View
      style={[styles.wave, style]}
      entering={FadeIn.delay(delay)}
    />
  );
}

function MicButton({
  state,
  color,
  onPressIn,
  onPressOut,
}: {
  state: VoiceState;
  color: string;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (state === 'listening') {
      scale.value = withRepeat(
        withTiming(1.05, { duration: 600 }),
        -1, true
      );
      bgOpacity.value = withRepeat(
        withTiming(0.35, { duration: 600 }),
        -1, true
      );
    } else {
      scale.value = withSpring(1);
      bgOpacity.value = withTiming(0.2);
    }
  }, [state, scale, bgOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: `${color}${Math.round(bgOpacity.value * 255).toString(16).padStart(2, '0')}`,
  }));

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.micBtn, animStyle, { borderColor: color }]}>
        <Text style={styles.micEmoji}>
          {state === 'listening' ? '🔴' : state === 'thinking' ? '💭' : state === 'speaking' ? '🔊' : '🎤'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function VoiceSheet({ visible, onClose, onSend, colorTheme, voiceConfig }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  const theme = ColorThemes.find((t) => t.id === colorTheme) ?? ColorThemes[0]!;
  const themeColor = theme.colors[0];

  const stateColors: Record<VoiceState, string> = {
    idle: Colors.textSecondary,
    listening: Colors.success,
    thinking: Colors.textMuted,
    speaking: themeColor,
  };

  const stateLabels: Record<VoiceState, string> = {
    idle: 'Удержи кнопку и говори',
    listening: 'Слушаю...',
    thinking: 'Думаю...',
    speaking: 'Говорю...',
  };

  // Запрашиваем разрешения при открытии
  useEffect(() => {
    if (visible) {
      requestSpeechPermission().then(setHasPermission);
      setTranscript('');
      setVoiceState('idle');
    }
  }, [visible]);

  // Обработчики STT
  useSTTEvents(
    useCallback(async (text: string) => {
      setTranscript(text);
      setVoiceState('thinking');

      try {
        const response = await onSend(text);
        setVoiceState('speaking');
        await speak(response, voiceConfig, () => setVoiceState('idle'));
      } catch {
        setVoiceState('idle');
      }
    }, [onSend, voiceConfig]),
    useCallback((error: string) => {
      console.warn('STT ошибка:', error);
      setVoiceState('idle');
    }, [])
  );

  const handlePressIn = useCallback(() => {
    if (!hasPermission || voiceState !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoiceState('listening');
    startListening(voiceConfig.language);
  }, [hasPermission, voiceConfig.language, voiceState]);

  const handlePressOut = useCallback(() => {
    if (voiceState !== 'listening') return;
    stopListening();
  }, [voiceState]);

  const handleStop = useCallback(() => {
    stopSpeaking();
    setVoiceState('idle');
  }, []);

  const color = stateColors[voiceState];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
        >
          <Pressable style={styles.sheet}>
            <View style={[styles.handle]} />

            {/* Статус */}
            <Text style={[styles.stateLabel, { color }]}>
              {stateLabels[voiceState]}
            </Text>

            {/* Транскрипт */}
            {transcript.length > 0 && (
              <Text style={styles.transcript} numberOfLines={3}>
                {transcript}
              </Text>
            )}

            {/* Волны + кнопка */}
            <View style={styles.micWrap}>
              {voiceState === 'listening' && (
                <>
                  <WaveRing delay={0} color={color} />
                  <WaveRing delay={300} color={color} />
                  <WaveRing delay={600} color={color} />
                </>
              )}

              <MicButton
                state={voiceState}
                color={color}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            </View>

            {/* Кнопка стоп */}
            {voiceState === 'speaking' && (
              <Pressable style={styles.stopBtn} onPress={handleStop}>
                <Text style={styles.stopText}>■ Стоп</Text>
              </Pressable>
            )}

            {!hasPermission && (
              <Text style={styles.permError}>
                Нужен доступ к микрофону — разреши в Настройках
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minHeight: 320,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  stateLabel: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.md,
  },
  transcript: {
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  micWrap: {
    width: 120, height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  wave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  micBtn: {
    width: 88, height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: { fontSize: 36 },
  stopBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.error + '33',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  stopText: {
    color: Colors.error,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.md,
  },
  permError: {
    color: Colors.warning,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
