// Корневой layout — инициализация и маршрутизация
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserStore } from '@/stores/userStore';
import { Colors } from '@/constants/theme';
import * as SplashScreen from 'expo-splash-screen';

// Держим сплэш пока не загрузились данные
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

export default function RootLayout() {
  const loadFromStorage = useUserStore((s) => s.loadFromStorage);

  useEffect(() => {
    const prepare = async () => {
      try {
        loadFromStorage();
      } finally {
        // Скрываем сплэш только после восстановления данных
        await SplashScreen.hideAsync();
      }
    };
    prepare();
  }, [loadFromStorage]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="chat/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
