// Точка входа — редиректим на онбординг или чат
import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function Index() {
  const isComplete = useUserStore((s) => s.onboarding.isComplete);
  const friend = useUserStore((s) => s.friend);

  if (isComplete && friend) {
    return <Redirect href={`/chat/${friend.id}`} />;
  }

  return <Redirect href="/(auth)/persona" />;
}
