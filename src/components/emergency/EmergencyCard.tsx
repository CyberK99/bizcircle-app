import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@src/components/ui/Badge';
import { Avatar } from '@src/components/ui/Avatar';
import {
  COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  EMERGENCY_CATEGORIES,
} from '@src/utils/constants';
import { timeAgo } from '@src/utils/formatters';
import type { EmergencyRequest } from '@src/types/database';

interface EmergencyCardProps {
  request: EmergencyRequest;
}

export function EmergencyCard({ request }: EmergencyCardProps) {
  const router = useRouter();
  const requester = request.requester as any;
  const category = EMERGENCY_CATEGORIES[request.category] || EMERGENCY_CATEGORIES.other;

  const urgencyVariant =
    request.urgency_level === 1
      ? 'danger'
      : request.urgency_level === 2
      ? 'warning'
      : 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderLeftColor: URGENCY_COLORS[request.urgency_level],
          borderLeftWidth: 4,
        },
      ]}
      activeOpacity={0.7}
      onPress={() => router.push(`/emergency/${request.id}` as any)}
    >
      <View style={styles.header}>
        <View style={styles.categoryIcon}>
          <Ionicons
            name={category.icon as any}
            size={20}
            color={URGENCY_COLORS[request.urgency_level]}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{request.title}</Text>
          <View style={styles.meta}>
            <Badge
              text={URGENCY_LABELS[request.urgency_level]}
              variant={urgencyVariant}
              size="sm"
            />
            <Badge text={category.label} variant="neutral" size="sm" />
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {request.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.requesterInfo}>
          <Avatar
            uri={requester?.logo_url}
            name={requester?.name}
            size={20}
          />
          <Text style={styles.requesterName}>{requester?.name || 'Unknown'}</Text>
          {requester?.county_name && (
            <Text style={styles.location}>
              {requester.county_name}, {requester.state_code}
            </Text>
          )}
        </View>
        <Text style={styles.time}>{timeAgo(request.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    gap: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requesterName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  location: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  time: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
