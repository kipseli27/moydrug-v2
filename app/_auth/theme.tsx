// Экран 3 онбординга — выбор цветовой темы
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';
import { ColorThemes, Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { ColorThemeId } from '@/constants/theme';

function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: typeof ColorThemes[number];
  isSelected: boolean;
  onSelect: (id: ColorThemeId) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(theme.id);
  }, [onSelect, scale, theme.id]);

  return (
    <Pressable onPress={handlePress} style={styles.themeWrap}>
      <Animated.View style={animStyle}>
        <LinearGradient
          colors={[...theme.colors]}
          style={[styles.themeCard, isSelected && styles.themeCardSelected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isSelected && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </LinearGradient>
        <Text style={[styles.themeName, isSelected && { color: Colors.textPrimary }]}>
          {theme.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ThemeScreen() {
  const { onboarding, setColorTheme, completeOnboarding } = useUserStore();

  const handleFinish = useCallback(() => {
    try {
      const friend = completeOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Переходим в чат — AI пришлёт приветствие
      router.replace(`/chat/${friend.id}`);
    } catch (e) {
      console.error('Ошибка завершения онбординга:', e);
    }
  }, [completeOnboarding]);

  return (
    <LinearGradient colors={[Colors.background, '#0A0A1A']} style={styles.container}>
      {/* Кнопка назад */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Назад</Text>
      </Pressable>

      {/* Заголовок */}
      <Text style={styles.title}>Выбери цвет общения</Text>
      <Text style={styles.subtitle}>
        Этот цвет будет у сообщений твоего{'\n'}друга и акцентов приложения
      </Text>

      {/* Превью */}
      <View style={styles.previewWrap}>
        <LinearGradient
          colors={[...(ColorThemes.find((t) => t.id === onboarding.colorTheme)?.colors ?? ['#6C63FF', '#9D50BB'])]}
          style={styles.preview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.previewText}>
            Привет! Я рад, что ты выбрал меня 😊
          </Text>
        </LinearGradient>
      </View>

      {/* Сетка тем */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {ColorThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={onboarding.colorTheme === theme.id}
            onSelect={setColorTheme}
          />
        ))}
      </ScrollView>

      {/* Кнопка завершения */}
      <Pressable style={styles.button} onPress={handleFinish}>
        <LinearGradient
          colors={[...(ColorThemes.find((t) => t.id === onboarding.colorTheme)?.colors ?? ['#6C63FF', '#9D50BB'])]}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Познакомиться! 🎉</Text>
        </LinearGradient>
      </Pressable>

      {/* Прогресс */}
      <View style={styles.progress}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.textSecondary, fontSize: Typography.size.md },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  previewWrap: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  preview: { padding: Spacing.lg, borderRadius: Radius.lg },
  previewText: {
    fontSize: Typography.size.md,
    color: '#fff',
    fontWeight: Typography.weight.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  themeWrap: { width: '30%', alignItems: 'center' },
  themeCard: {
    width: 80, height: 80,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  themeCardSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  checkmark: { fontSize: 24, color: '#fff', fontWeight: '700' },
  themeName: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.lg },
  buttonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  buttonText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
});
