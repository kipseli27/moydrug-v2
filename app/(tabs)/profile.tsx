// Экран профиля и настроек
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/userStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Colors, Spacing, Radius, Typography, PersonaConfig, ColorThemes } from '@/constants/theme';
import { clearMessages, initDatabase } from '@/services/MemoryService';

export default function ProfileScreen() {
  const friend = useUserStore((s) => s.friend);
  const resetAll = useUserStore((s) => s.resetAll);
  const { isPremium, showPaywall } = useSubscriptionStore();

  if (!friend) return null;

  const config = PersonaConfig[friend.personaType];
  const theme = ColorThemes.find((t) => t.id === friend.colorTheme) ?? ColorThemes[0]!;

  const handleResetHistory = useCallback(() => {
    Alert.alert(
      'Сбросить историю?',
      'Все сообщения будут удалены. Нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            const db = await initDatabase();
            await clearMessages(db, friend.id);
            Alert.alert('Готово', 'История очищена');
          },
        },
      ]
    );
  }, [friend.id]);

  const handleNewFriend = useCallback(() => {
    Alert.alert(
      'Начать заново?',
      'Потеряешь текущего друга и всю историю.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Начать заново', style: 'destructive',
          onPress: () => { resetAll(); router.replace('/'); },
        },
      ]
    );
  }, [resetAll]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[...theme.colors]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.avatar}>{config.emoji}</Text>
          <Text style={styles.name}>{friend.name}</Text>
          <Text style={styles.personaLabel}>{config.label}</Text>
        </LinearGradient>

        {/* Подписка */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Подписка</Text>
          {isPremium() ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>✨ Premium активен</Text>
              <Text style={[styles.rowValue, { color: Colors.success }]}>Активна</Text>
            </View>
          ) : (
            <Pressable style={styles.upgradeBtn} onPress={showPaywall}>
              <LinearGradient colors={['#6C63FF', '#9D50BB']} style={styles.upgradeBtnGradient}>
                <Text style={styles.upgradeBtnText}>⭐ Перейти на Premium</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Настройки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <Pressable style={styles.row} onPress={() => isPremium() ? null : showPaywall()}>
            <Text style={styles.rowLabel}>Изменить имя друга</Text>
            <Text style={styles.rowValue}>{friend.name} →</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/(auth)/theme')}>
            <Text style={styles.rowLabel}>Цветовая тема</Text>
            <LinearGradient colors={[...theme.colors]} style={styles.themePreview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </Pressable>
        </View>

        {/* Данные */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данные</Text>
          <Pressable style={styles.row} onPress={handleResetHistory}>
            <Text style={[styles.rowLabel, { color: Colors.warning }]}>🗑 Очистить историю</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={handleNewFriend}>
            <Text style={[styles.rowLabel, { color: Colors.error }]}>⚠️ Начать заново</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Мой Друг v1.0.0 · Сделано с ❤️</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingTop: Spacing.xl + Spacing.lg },
  avatar: { fontSize: 72, marginBottom: Spacing.md },
  name: { fontSize: Typography.size.title, fontWeight: Typography.weight.extrabold, color: '#fff', marginBottom: Spacing.xs },
  personaLabel: { fontSize: Typography.size.md, color: 'rgba(255,255,255,0.8)' },
  section: { marginTop: Spacing.lg, marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.textMuted, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: Typography.size.md, color: Colors.textPrimary },
  rowValue: { fontSize: Typography.size.md, color: Colors.textSecondary },
  themePreview: { width: 44, height: 24, borderRadius: Radius.sm },
  upgradeBtn: { margin: Spacing.md, borderRadius: Radius.md, overflow: 'hidden' },
  upgradeBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  upgradeBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: Typography.size.sm, marginVertical: Spacing.xl },
});
