// Экран 3 онбординга — выбор темы
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';
import { ColorThemes, Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { ColorThemeId } from '@/constants/theme';

export default function ThemeScreen() {
  const { onboarding, setColorTheme, completeOnboarding } = useUserStore();
  const selected = onboarding.colorTheme;

  const handleSelect = useCallback((id: ColorThemeId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColorTheme(id);
  }, [setColorTheme]);

  const handleFinish = useCallback(() => {
    try {
      const friend = completeOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/chat/${friend.id}`);
    } catch (e) {
      console.error(e);
    }
  }, [completeOnboarding]);

  return (
    <LinearGradient colors={[Colors.background, '#0A0A1A']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>

        <Text style={styles.title}>Выбери цвет{'\n'}настроения</Text>
        <Text style={styles.subtitle}>Это будет цвет вашего общения</Text>

        <View style={styles.grid}>
          {ColorThemes.map((theme) => {
            const isSelected = selected === theme.id;
            return (
              <Pressable
                key={theme.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(theme.id as ColorThemeId)}
              >
                <LinearGradient
                  colors={[...theme.colors]}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.cardName}>{theme.name}</Text>
                {isSelected && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.button} onPress={handleFinish}>
          <LinearGradient colors={['#6C63FF', '#9D50BB']} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Начать общение →</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
  backText: { color: Colors.textSecondary, fontSize: Typography.size.md },
  title: {
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 40,
  },
  subtitle: { fontSize: Typography.size.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  card: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  cardSelected: { borderColor: '#fff' },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  cardName: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: '#fff', textAlign: 'center' },
  check: { position: 'absolute', top: 4, right: 8, fontSize: 16, color: '#fff', fontWeight: 'bold' },
  button: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', marginBottom: Spacing.lg },
  buttonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  buttonText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#fff' },
  progress: { flexDirection: 'row', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
});
