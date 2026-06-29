// Экран 1 онбординга — выбор персонажа
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';
import { PersonaConfig, Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { PersonaType } from '@/constants/theme';

const PERSONAS: PersonaType[] = ['girlfriend', 'friend', 'spark', 'sage'];

export default function PersonaScreen() {
  const { onboarding, setPersonaType } = useUserStore();
  const selected = onboarding.personaType;

  const handleSelect = useCallback((type: PersonaType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPersonaType(type);
  }, [setPersonaType]);

  const handleNext = useCallback(() => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/name');
  }, [selected]);

  return (
    <LinearGradient colors={[Colors.background, '#0A0A1A']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Кто будет твоим{'\n'}собеседником?</Text>
        <Text style={styles.subtitle}>Выбери характер голосового друга</Text>

        <View style={styles.grid}>
          {PERSONAS.map((type) => {
            const config = PersonaConfig[type];
            const isSelected = selected === type;
            return (
              <Pressable
                key={type}
                style={[styles.card, isSelected && { borderColor: config.color, borderWidth: 2 }]}
                onPress={() => handleSelect(type)}
              >
                {isSelected && (
                  <LinearGradient
                    colors={[config.color + '22', config.color + '11']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.emoji}>{config.emoji}</Text>
                <Text style={[styles.cardTitle, isSelected && { color: config.color }]}>
                  {config.label}
                </Text>
                <Text style={styles.cardDesc}>{config.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <LinearGradient
            colors={selected ? ['#6C63FF', '#9D50BB'] : [Colors.border, Colors.border]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Далее →</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: Spacing.xl, alignItems: 'center' },
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
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  cardTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardDesc: { fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'center' },
  button: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', marginBottom: Spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  buttonText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#fff' },
  progress: { flexDirection: 'row', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
});
