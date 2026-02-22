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
import { useMyGroups } from '@src/hooks/useGroups';
import { Card } from '@src/components/ui/Card';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS } from '@src/utils/constants';
import { pluralize } from '@src/utils/formatters';

export default function GroupsScreen() {
  const router = useRouter();
  const { data: memberships, isLoading, refetch } = useMyGroups();

  return (
    <View style={styles.container}>
      <FlatList
        data={memberships || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const group = item.group;
          if (!group) return null;
          const industry = (group as any).industry;
          const county = (group as any).county;

          return (
            <Card
              style={styles.card}
              onPress={() => router.push(`/group/${group.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.groupIcon}>
                  <Ionicons
                    name={industry?.icon || 'people'}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {pluralize(group.member_count, 'member')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </Card>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="people-outline"
              title="No groups yet"
              message="Complete your business profile to automatically join your industry group."
            />
          ) : null
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
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  groupMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
