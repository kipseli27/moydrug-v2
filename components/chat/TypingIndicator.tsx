// Typing indicator — три анимированные точки (Reanimated 3)
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withDelay,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@/constants/theme';

const DOT_SIZE = 8;
const ANIMATION_DURATION = 400;

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: ANIMATION_DURATION }),
          withTiming(0, { duration: ANIMATION_DURATION })
        ),
        -1,
        false
      )
    );
    return () => { translateY.value = 0; };
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator() {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.textSecondary,
  },
});
