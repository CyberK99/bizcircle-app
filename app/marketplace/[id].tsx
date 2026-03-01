import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { useListing, useUpdateListingStatus } from '@src/hooks/useListings';
import { useStartConversation } from '@src/hooks/useMessages';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { Button } from '@src/components/ui/Button';
import { Card } from '@src/components/ui/Card';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import {
  COLORS,
  LISTING_TYPE_CONFIG,
  PRICE_TYPE_LABELS,
  LISTING_TYPE_LABELS,
} from '@src/utils/constants';
import { timeAgo, formatCurrency, formatDate } from '@src/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { business } = useAuth();
  const { data: listing, isLoading } = useListing(id);
  const updateStatus = useUpdateListingStatus();
  const startConversation = useStartConversation();

  if (isLoading || !listing) return <LoadingScreen />;

  const isOwner = listing.business_id === business?.id;
  const config = LISTING_TYPE_CONFIG[listing.listing_type];
  const listingBusiness = listing.business as any;

  async function handleContactSeller() {
    if (!listing) return;
    try {
      const conversationId = await startConversation.mutateAsync(listing.business_id);
      router.push(`/messages/${conversationId}` as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start conversation';
      Alert.alert('Error', message);
    }
  }

  async function handleMarkFulfilled() {
    Alert.alert(
      'Mark as Fulfilled',
      'Mark this listing as fulfilled? It will be removed from feeds.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Fulfilled',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                listingId: id,
                status: 'fulfilled',
              });
            } catch {
              Alert.alert('Error', 'Failed to update listing');
            }
          },
        },
      ]
    );
  }

  async function handleCancel() {
    Alert.alert(
      'Cancel Listing',
      'Are you sure you want to cancel this listing?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                listingId: id,
                status: 'cancelled',
              });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to cancel listing');
            }
          },
        },
      ]
    );
  }

  function getStatusBanner() {
    if (listing!.status === 'active') return null;
    const statusConfig: Record<string, { bg: string; text: string }> = {
      fulfilled: { bg: '#dcfce7', text: 'This listing has been fulfilled' },
      cancelled: { bg: '#fee2e2', text: 'This listing was cancelled' },
      expired: { bg: '#fef3c7', text: 'This listing has expired' },
      pending: { bg: '#dbeafe', text: 'This listing is pending' },
    };
    const cfg = statusConfig[listing!.status] || statusConfig.pending;
    return (
      <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
        <Text style={styles.statusText}>{cfg.text}</Text>
      </View>
    );
  }

  function renderTypeDetails() {
    const details: { label: string; value: string }[] = [];

    if (listing!.condition) {
      details.push({ label: 'Condition', value: listing!.condition });
    }
    if (listing!.price != null) {
      const priceLabel = PRICE_TYPE_LABELS[listing!.price_type || 'fixed'] || '';
      details.push({ label: 'Price', value: `${formatCurrency(listing!.price)} (${priceLabel})` });
    }
    if (listing!.price_type === 'free') {
      details.push({ label: 'Price', value: 'Free' });
    }
    if (listing!.role_title) {
      details.push({ label: 'Role', value: listing!.role_title });
    }
    if (listing!.hourly_rate != null) {
      details.push({ label: 'Rate', value: `${formatCurrency(listing!.hourly_rate)}/hr` });
    }
    if (listing!.date_needed) {
      details.push({ label: 'Date Needed', value: listing!.date_needed });
    }
    if (listing!.duration) {
      details.push({ label: 'Duration', value: listing!.duration });
    }
    if (listing!.skills && listing!.skills.length > 0) {
      details.push({ label: 'Skills', value: listing!.skills.join(', ') });
    }
    if (listing!.supplier_name) {
      details.push({ label: 'Supplier', value: listing!.supplier_name });
    }
    if (listing!.deal_deadline) {
      details.push({ label: 'Deadline', value: listing!.deal_deadline });
    }

    if (details.length === 0) return null;

    return (
      <Card style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Details</Text>
        {details.map((d, i) => (
          <View key={i} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
      </Card>
    );
  }

  function renderGroupDealProgress() {
    if (listing!.listing_type !== 'group_deal' || !listing!.target_quantity) return null;
    const progress = (listing!.current_signups || 0) / listing!.target_quantity;
    return (
      <Card style={styles.progressCard}>
        <Text style={styles.detailsTitle}>Group Deal Progress</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progress * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {listing!.current_signups || 0} of {listing!.target_quantity} signups
        </Text>
        {listing!.deal_deadline && (
          <Text style={styles.deadlineText}>
            Deadline: {listing!.deal_deadline}
          </Text>
        )}
      </Card>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Image Gallery */}
      {listing.media_urls && listing.media_urls.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
        >
          {listing.media_urls.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={styles.galleryImage}
            />
          ))}
        </ScrollView>
      )}

      {/* Status Banner */}
      {getStatusBanner()}

      {/* Title & Badges */}
      <Card>
        <View style={styles.titleHeader}>
          <View style={[styles.typeIcon, { backgroundColor: (config?.color || COLORS.primary) + '20' }]}>
            <Ionicons
              name={(config?.icon || 'pricetag') as any}
              size={24}
              color={config?.color || COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{listing.title}</Text>
            <View style={styles.badges}>
              <Badge
                text={LISTING_TYPE_LABELS[listing.listing_type] || listing.listing_type}
                variant="neutral"
              />
              {listing.status !== 'active' && (
                <Badge
                  text={listing.status}
                  variant={
                    listing.status === 'fulfilled'
                      ? 'success'
                      : listing.status === 'cancelled'
                      ? 'danger'
                      : 'warning'
                  }
                />
              )}
              {listing.price != null && listing.price_type !== 'free' && (
                <Badge
                  text={formatCurrency(listing.price)}
                  variant="primary"
                />
              )}
              {listing.price_type === 'free' && (
                <Badge text="Free" variant="success" />
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {listing.description && (
          <Text style={styles.description}>{listing.description}</Text>
        )}

        {/* Posted time */}
        <Text style={styles.postedTime}>
          Posted {timeAgo(listing.created_at)}
          {listing.expires_at && ` · Expires ${formatDate(listing.expires_at)}`}
        </Text>
      </Card>

      {/* Type-specific details */}
      {renderTypeDetails()}

      {/* Group Deal Progress */}
      {renderGroupDealProgress()}

      {/* Business Info */}
      <Card>
        <View style={styles.businessRow}>
          <Avatar
            uri={listingBusiness?.logo_url}
            name={listingBusiness?.name}
            size={40}
            verified={listingBusiness?.verification_status === 'verified'}
          />
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{listingBusiness?.name}</Text>
            {listingBusiness?.industry?.name && (
              <Text style={styles.businessIndustry}>
                {listingBusiness.industry.name}
              </Text>
            )}
            {listingBusiness?.county_name && (
              <Text style={styles.businessLocation}>
                {listingBusiness.county_name}, {listingBusiness.state_code}
              </Text>
            )}
          </View>
          {listingBusiness?.verification_status === 'verified' && (
            <Badge text="Verified" variant="success" size="sm" />
          )}
        </View>
      </Card>

      {/* Actions */}
      {!isOwner && listing.status === 'active' && (
        <Button
          title="Contact Seller"
          onPress={handleContactSeller}
          loading={startConversation.isPending}
          icon={<Ionicons name="chatbubble" size={20} color="#fff" />}
          style={{ marginTop: 8 }}
        />
      )}

      {isOwner && listing.status === 'active' && (
        <View style={styles.ownerActions}>
          <Button
            title="Mark as Fulfilled"
            onPress={handleMarkFulfilled}
            loading={updateStatus.isPending}
            icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
          />
          <Button
            title="Cancel Listing"
            onPress={handleCancel}
            variant="outline"
            style={{ marginTop: 8 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  gallery: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
    height: 250,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 250,
    backgroundColor: '#f3f4f6',
  },
  statusBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  postedTime: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  detailsCard: {
    marginTop: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  progressCard: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deadlineText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  businessIndustry: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  businessLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  ownerActions: {
    marginTop: 16,
  },
});
