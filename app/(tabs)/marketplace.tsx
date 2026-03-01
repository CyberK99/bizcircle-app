import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { useNearbyListings, useGroupListings } from '@src/hooks/useListings';
import { ListingCard } from '@src/components/marketplace/ListingCard';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS, LISTING_TYPE_CONFIG } from '@src/utils/constants';
import type { ListingType } from '@src/types/database';

type Tab = 'nearby' | 'groups';

const typeFilters: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  ...Object.entries(LISTING_TYPE_CONFIG).map(([key, val]) => ({
    key,
    label: val.label,
  })),
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('nearby');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filters = typeFilter !== 'all' ? { type: typeFilter as ListingType } : undefined;

  const {
    data: nearby,
    isLoading: nearbyLoading,
    refetch: refetchNearby,
  } = useNearbyListings(filters);
  const {
    data: groupListings,
    isLoading: groupLoading,
    refetch: refetchGroups,
  } = useGroupListings(filters);

  const data = activeTab === 'nearby' ? nearby : groupListings;
  const isLoading = activeTab === 'nearby' ? nearbyLoading : groupLoading;
  const refetch = activeTab === 'nearby' ? refetchNearby : refetchGroups;

  const isVerified = business?.verification_status === 'verified';

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {typeFilters.map((filter) => {
          const isActive = typeFilter === filter.key;
          const config = LISTING_TYPE_CONFIG[filter.key];
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.chip,
                isActive && {
                  backgroundColor: config?.color || COLORS.primary,
                  borderColor: config?.color || COLORS.primary,
                },
              ]}
              onPress={() => setTypeFilter(filter.key)}
              activeOpacity={0.7}
            >
              {config && (
                <Ionicons
                  name={config.icon as any}
                  size={14}
                  color={isActive ? '#fff' : COLORS.textSecondary}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Selector */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nearby' && styles.tabActive]}
          onPress={() => setActiveTab('nearby')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'nearby' && styles.tabTextActive,
            ]}
          >
            Nearby
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'groups' && styles.tabTextActive,
            ]}
          >
            My Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listing Feed */}
      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={
          (data || []).length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="storefront-outline"
              title={
                activeTab === 'nearby'
                  ? 'No listings nearby'
                  : 'No group listings'
              }
              message={
                activeTab === 'nearby'
                  ? 'No businesses in your area have active listings. Be the first to post one!'
                  : 'No listings have been posted in your groups yet.'
              }
            />
          ) : null
        }
      />

      {/* FAB */}
      {isVerified && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/marketplace/new' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chipContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
  list: {
    paddingVertical: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
