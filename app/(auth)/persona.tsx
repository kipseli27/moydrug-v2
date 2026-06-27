// Экран 1 онбординга — выбор персонажа
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';
import { PersonaConfig, Colors, Spacing, Radius, Typography } from '@/constants/theme';
import type { PersonaType } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

const PERSONAS: PersonaType[] = ['girlfriend', 'friend', 'spark', 'sage'];

function PersonaCard({
  type,
  isSelected,
  onSelect,
}: {
  type: PersonaType;
  isSelected: boolean;
  onSelect: (type: PersonaType) => void;
}) {
  const config = PersonaConfig[type];
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, borderOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: interpolate(borderOpacity.value, [0, 1], [0, 2]),
    borderColor: config.color,
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    runOnJS(onSelect)(type);
  }, [onSelect, scale, type]);

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.card, animStyle]}>
        <LinearGradient
          colors={[config.color + '33', Colors.surface]}
          style={styles.cardGradient}
        >
          <Text style={styles.cardEmoji}>{config.emoji}</Text>
          <Text style={styles.cardLabel}>{config.label}</Text>
          <Text style={styles.cardDesc}>{config.description}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function PersonaScreen() {
  const { onboarding, setPersonaType } = useUserStore();
  const selected = onboarding.personaType;

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(20);

  React.useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 600 });
    titleTranslate.value = withTiming(0, { duration: 600 });
  }, [titleOpacity, titleTranslate]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const handleNext = useCallback(() => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/name');
  }, [selected]);

  return (
    <LinearGradient colors={[Colors.background, '#0A0A1A']} style={styles.container}>
      <Animated.View style={[styles.header, titleStyle]}>
        <Text style={styles.title}>Кто твой друг?</Text>
        <Text style={styles.subtitle}>Выбери персонажа, который тебе ближе</Text>
      </Animated.View>

      <View style={styles.grid}>
        {PERSONAS.map((type) => (
          <PersonaCard
            key={type}
            type={type}
            isSelected={selected === type}
            onSelect={setPersonaType}
          />
        ))}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 80 },
  header: { marginBottom: Spacing.xl, alignItems: 'center' },
  title: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.size.md, color: Colors.textSecondary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.xl },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.sm },
  cardGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  cardEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  cardLabel: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardDesc: { fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'center' },
  button: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  buttonText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
});
