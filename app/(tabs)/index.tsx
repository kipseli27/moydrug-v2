import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function TabsIndex() {
  const friend = useUserStore((s) => s.friend);

  if (friend) {
    return <Redirect href={`/chat/${friend.id}`} />;
  }

  return <Redirect href="/(auth)/persona" />;
}
