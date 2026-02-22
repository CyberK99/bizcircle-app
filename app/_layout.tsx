import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@src/providers/AuthProvider';
import { QueryProvider } from '@src/providers/QueryProvider';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && !hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding/');
    } else if (isAuthenticated && hasCompletedOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, segments]);

  if (isLoading) return <LoadingScreen />;

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryProvider>
      <AuthProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="group/[id]"
              options={{ headerShown: true, title: 'Group' }}
            />
            <Stack.Screen
              name="group/post/[id]"
              options={{ headerShown: true, title: 'Post' }}
            />
            <Stack.Screen
              name="emergency/new"
              options={{ headerShown: true, title: 'New Emergency', presentation: 'modal' }}
            />
            <Stack.Screen
              name="emergency/[id]"
              options={{ headerShown: true, title: 'Emergency Request' }}
            />
            <Stack.Screen
              name="messages"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="business/[id]"
              options={{ headerShown: true, title: 'Business Profile' }}
            />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryProvider>
  );
}
