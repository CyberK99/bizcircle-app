import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import { useStartConversation } from '@src/hooks/useMessages';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { Button } from '@src/components/ui/Button';
import { Card } from '@src/components/ui/Card';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS, VERIFICATION_STATUS_LABELS } from '@src/utils/constants';
import type { Business } from '@src/types/database';
import { useQuery } from '@tanstack/react-query';

function useBusiness(businessId: string) {
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: async (): Promise<Business | null> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*, industry:industries(*), county:counties(*)')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { business: myBusiness } = useAuth();
  const startConversation = useStartConversation();

  const { data: business, isLoading, error } = useBusiness(id);
  const [connectLoading, setConnectLoading] = useState(false);

  const isOwnProfile = myBusiness?.id === id;

  const handleMessage = async () => {
    if (!business) return;

    try {
      const conversationId = await startConversation.mutateAsync(business.id);
      router.push(`/messages/${conversationId}` as any);
    } catch (err) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleConnect = () => {
    Alert.alert(
      'Connect',
      `Send a connection request to ${business?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            setConnectLoading(true);
            // Placeholder for connection logic
            setTimeout(() => {
              setConnectLoading(false);
              Alert.alert('Sent', 'Connection request sent!');
            }, 1000);
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWebsite = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(fullUrl);
  };

  if (isLoading) return <LoadingScreen />;

  if (error || !business) {
    return (
      <>
        <Stack.Screen options={{ title: 'Business Profile' }} />
        <EmptyState
          icon="alert-circle-outline"
          title="Business Not Found"
          message="This business profile could not be loaded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </>
    );
  }

  const industry = business.industry as any;
  const county = business.county as any;
  const isVerified = business.verification_status === 'verified';

  const locationParts = [
    business.city,
    business.state_code,
    county?.name ? `${county.name} County` : null,
  ].filter(Boolean);
  const locationString = locationParts.join(', ');

  return (
    <>
      <Stack.Screen options={{ title: business.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar
            uri={business.logo_url}
            name={business.name}
            size={80}
            verified={isVerified}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Badge
              text={
                VERIFICATION_STATUS_LABELS[business.verification_status] ||
                business.verification_status
              }
              variant={
                isVerified
                  ? 'success'
                  : business.verification_status === 'pending'
                  ? 'warning'
                  : 'neutral'
              }
              size="md"
              style={{ marginTop: 6 }}
            />
          </View>
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            <Button
              title="Message"
              onPress={handleMessage}
              loading={startConversation.isPending}
              icon={
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              }
              style={{ flex: 1 }}
              size="md"
            />
            <Button
              title="Connect"
              onPress={handleConnect}
              variant="outline"
              loading={connectLoading}
              icon={
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={COLORS.primary}
                />
              }
              style={{ flex: 1 }}
              size="md"
            />
          </View>
        )}

        {/* Trust Score */}
        {business.trust_score > 0 && (
          <Card style={styles.trustCard}>
            <View style={styles.trustHeader}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
              <Text style={styles.trustTitle}>Trust Score</Text>
            </View>
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScoreValue}>{business.trust_score}</Text>
              <Text style={styles.trustScoreMax}>/100</Text>
            </View>
            <View style={styles.trustBar}>
              <View
                style={[
                  styles.trustBarFill,
                  { width: `${Math.min(business.trust_score, 100)}%` },
                ]}
              />
            </View>
            {business.review_count > 0 && (
              <Text style={styles.reviewCount}>
                Based on {business.review_count}{' '}
                {business.review_count === 1 ? 'review' : 'reviews'}
              </Text>
            )}
          </Card>
        )}

        {/* Business Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Business Details</Text>

          {industry?.name && (
            <View style={styles.infoRow}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Industry</Text>
                <Text style={styles.infoValue}>{industry.name}</Text>
              </View>
            </View>
          )}

          {locationString && (
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{locationString}</Text>
              </View>
            </View>
          )}

          {business.employee_count != null && (
            <View style={styles.infoRow}>
              <Ionicons
                name="people-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Employees</Text>
                <Text style={styles.infoValue}>{business.employee_count}</Text>
              </View>
            </View>
          )}

          {business.year_founded != null && (
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Founded</Text>
                <Text style={styles.infoValue}>{business.year_founded}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Description */}
        {business.description && (
          <Card style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{business.description}</Text>
          </Card>
        )}

        {/* Contact Info */}
        {(business.phone || business.website) && (
          <Card style={styles.contactCard}>
            <Text style={styles.sectionTitle}>Contact</Text>

            {business.phone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => handleCall(business.phone!)}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.contactValue}>{business.phone}</Text>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}

            {business.website && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => handleWebsite(business.website!)}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.contactValue} numberOfLines={1}>
                  {business.website}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Address */}
        {business.address_line1 && (
          <Card style={styles.addressCard}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.addressText}>
              {business.address_line1}
              {business.address_line2 ? `\n${business.address_line2}` : ''}
              {'\n'}
              {[business.city, business.state_code, business.zip]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  trustCard: {
    margin: 16,
    marginBottom: 0,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  trustScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  trustScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.success,
  },
  trustScoreMax: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  trustBar: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  reviewCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  infoCard: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  descriptionCard: {
    margin: 16,
    marginBottom: 0,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  contactCard: {
    margin: 16,
    marginBottom: 0,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  contactValue: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addressCard: {
    margin: 16,
    marginBottom: 0,
  },
  addressText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
