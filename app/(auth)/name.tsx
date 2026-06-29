// Экран 2 онбординга — имя друга
import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';
import { PersonaConfig, Colors, Spacing, Radius, Typography } from '@/constants/theme';

export default function NameScreen() {
  const { onboarding, setFriendName } = useUserStore();
  const { personaType, friendName } = onboarding;
  const config = personaType ? PersonaConfig[personaType] : null;
  const inputRef = useRef<TextInput>(null);

  const handleChange = useCallback((text: string) => {
    setFriendName(text);
  }, [setFriendName]);

  const handleNext = useCallback(() => {
    if (!friendName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/theme');
  }, [friendName]);

  return (
    <LinearGradient colors={[Colors.background, '#0A0A1A']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>

        <View style={[styles.avatar, { backgroundColor: (config?.color ?? '#333') + '33' }]}>
          <Text style={styles.avatarEmoji}>{config?.emoji ?? '👤'}</Text>
        </View>
        <Text style={[styles.avatarName, { color: config?.color ?? Colors.primary }]}>
          {friendName || config?.label || ''}
        </Text>

        <Text style={styles.title}>Как зовут твоего{'\n'}собеседника?</Text>
        <Text style={styles.subtitle}>От 1 до 18 символов</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={friendName}
          onChangeText={handleChange}
          placeholder={config?.label ?? 'Имя'}
          placeholderTextColor={Colors.textMuted}
          maxLength={18}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
        />
        <Text style={styles.counter}>{friendName.length}/18</Text>

        <Pressable
          style={[styles.button, !friendName.trim() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!friendName.trim()}
        >
          <LinearGradient
            colors={friendName.trim() ? ['#6C63FF', '#9D50BB'] : [Colors.border, Colors.border]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Далее →</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 60, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
  backText: { color: Colors.textSecondary, fontSize: Typography.size.md },
  avatar: { width: 100, height: 100, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  avatarEmoji: { fontSize: 48 },
  avatarName: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, marginBottom: Spacing.xl, minHeight: 28 },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: { fontSize: Typography.size.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  input: {
    width: '100%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: Typography.size.xl, fontWeight: Typography.weight.medium, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: Spacing.xs,
  },
  counter: { fontSize: Typography.size.sm, color: Colors.textMuted, alignSelf: 'flex-end', marginBottom: Spacing.xl },
  button: { borderRadius: Radius.full, overflow: 'hidden', width: '100%', marginBottom: Spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  buttonText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#fff' },
  progress: { flexDirection: 'row', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
});
