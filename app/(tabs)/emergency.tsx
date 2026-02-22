import React, { useState } from 'react';
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
import { useNearbyEmergencies, useMyEmergencies } from '@src/hooks/useEmergency';
import { EmergencyCard } from '@src/components/emergency/EmergencyCard';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS } from '@src/utils/constants';

type Tab = 'nearby' | 'mine';

export default function EmergencyScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('nearby');

  const { data: nearby, isLoading: nearbyLoading, refetch: refetchNearby } =
    useNearbyEmergencies();
  const { data: mine, isLoading: mineLoading, refetch: refetchMine } =
    useMyEmergencies();

  const data = activeTab === 'nearby' ? nearby : mine;
  const isLoading = activeTab === 'nearby' ? nearbyLoading : mineLoading;
  const refetch = activeTab === 'nearby' ? refetchNearby : refetchMine;

  const isVerified = business?.verification_status === 'verified';

  return (
    <View style={styles.container}>
      {/* SOS Button */}
      {isVerified && (
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => router.push('/emergency/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.sosText}>Request Emergency Help</Text>
        </TouchableOpacity>
      )}

      {/* Tab selector */}
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
          style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
          onPress={() => setActiveTab('mine')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'mine' && styles.tabTextActive,
            ]}
          >
            My Requests
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EmergencyCard request={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={
          (data || []).length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="shield-checkmark-outline"
              title={
                activeTab === 'nearby'
                  ? 'No active emergencies'
                  : 'No requests'
              }
              message={
                activeTab === 'nearby'
                  ? 'No businesses in your area need help right now.'
                  : "You haven't created any emergency requests."
              }
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
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
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
});
