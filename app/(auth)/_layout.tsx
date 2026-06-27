// Layout группы онбординга (auth)
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="persona" />
      <Stack.Screen name="name" />
      <Stack.Screen name="theme" />
    </Stack>
  );
}
