import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { signOut } from '@src/lib/auth';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { Card } from '@src/components/ui/Card';
import { COLORS, VERIFICATION_STATUS_LABELS } from '@src/utils/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { business, profile } = useAuth();

  const verificationVariant =
    business?.verification_status === 'verified'
      ? 'success'
      : business?.verification_status === 'pending'
      ? 'warning'
      : business?.verification_status === 'rejected'
      ? 'danger'
      : 'neutral';

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Business Card */}
      <Card style={styles.businessCard}>
        <View style={styles.businessHeader}>
          <Avatar
            uri={business?.logo_url}
            name={business?.name}
            size={64}
            verified={business?.verification_status === 'verified'}
          />
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{business?.name}</Text>
            <Text style={styles.ownerName}>{profile?.full_name}</Text>
            <Badge
              text={
                VERIFICATION_STATUS_LABELS[
                  business?.verification_status || 'unverified'
                ]
              }
              variant={verificationVariant}
              size="sm"
            />
          </View>
        </View>
        {business?.description && (
          <Text style={styles.description}>{business.description}</Text>
        )}
        <View style={styles.businessDetails}>
          {business?.industry && (
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                {(business.industry as any).name}
              </Text>
            </View>
          )}
          {business?.city && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                {business.city}, {business.state_code}
              </Text>
            </View>
          )}
          {business?.employee_count && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                {business.employee_count} employees
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Menu Items */}
      <View style={styles.menu}>
        <MenuItem
          icon="chatbubbles-outline"
          label="Messages"
          onPress={() => router.push('/messages/' as any)}
        />
        <MenuItem
          icon="person-outline"
          label="Edit Business Profile"
          onPress={() => router.push(`/business/${business?.id}` as any)}
        />
        {business?.verification_status !== 'verified' && (
          <MenuItem
            icon="shield-checkmark-outline"
            label="Verify Business"
            onPress={() => router.push('/onboarding/verify' as any)}
            badge="Action Required"
          />
        )}
        <MenuItem
          icon="notifications-outline"
          label="Notification Settings"
          onPress={() => {}}
        />
        <MenuItem
          icon="help-circle-outline"
          label="Help & Support"
          onPress={() => {}}
        />
      </View>

      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={COLORS.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      {badge && <Badge text={badge} variant="warning" size="sm" />}
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  businessCard: {
    marginBottom: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ownerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  businessDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
