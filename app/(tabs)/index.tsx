import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { useHomeFeed } from '@src/hooks/usePosts';
import { useNearbyEmergencies } from '@src/hooks/useEmergency';
import { PostCard } from '@src/components/post/PostCard';
import { EmergencyCard } from '@src/components/emergency/EmergencyCard';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS } from '@src/utils/constants';

export default function HomeScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const { data: posts, isLoading, refetch } = useHomeFeed();
  const { data: emergencies } = useNearbyEmergencies();

  const activeEmergencies = (emergencies || []).filter(
    (e) => e.status === 'active'
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} showGroup />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>
                Welcome back, {business?.name || 'there'}
              </Text>
            </View>

            {activeEmergencies.length > 0 && (
              <View style={styles.emergencySection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                  <Text style={styles.sectionTitle}>
                    Nearby Emergencies ({activeEmergencies.length})
                  </Text>
                </View>
                {activeEmergencies.slice(0, 3).map((e) => (
                  <EmergencyCard key={e.id} request={e} />
                ))}
                {activeEmergencies.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAll}
                    onPress={() => router.push('/(tabs)/emergency')}
                  >
                    <Text style={styles.viewAllText}>View all emergencies</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Ionicons name="newspaper" size={20} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Recent Posts</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="newspaper-outline"
              title="No posts yet"
              message="Join a group to see posts from your local business community."
              actionLabel="Browse Groups"
              onAction={() => router.push('/(tabs)/groups')}
            />
          ) : null
        }
        contentContainerStyle={
          (posts || []).length === 0 ? styles.emptyList : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  greeting: {
    padding: 16,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emergencySection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewAll: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyList: {
    flexGrow: 1,
  },
});
