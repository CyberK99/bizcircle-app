import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@src/components/ui/Button';
import { COLORS } from '@src/utils/constants';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.message}>
          This screen doesn't exist.
        </Text>
        <Button
          title="Go Home"
          onPress={() => router.replace('/(tabs)')}
          variant="primary"
          fullWidth={false}
          style={{ marginTop: 24 }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
