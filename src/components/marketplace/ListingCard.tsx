import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@src/components/ui/Badge';
import { Avatar } from '@src/components/ui/Avatar';
import { COLORS, LISTING_TYPE_CONFIG, PRICE_TYPE_LABELS } from '@src/utils/constants';
import { timeAgo, formatCurrency } from '@src/utils/formatters';
import type { Listing } from '@src/types/database';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();
  const business = listing.business as any;
  const config = LISTING_TYPE_CONFIG[listing.listing_type];
  const thumbnail = listing.media_urls?.[0];

  function getPriceBadge() {
    if (listing.price_type === 'free') return 'Free';
    if (listing.price != null) {
      const label = PRICE_TYPE_LABELS[listing.price_type || 'fixed'] || '';
      return `${formatCurrency(listing.price)} ${label !== 'Fixed Price' ? label : ''}`.trim();
    }
    if (listing.hourly_rate != null) {
      return `${formatCurrency(listing.hourly_rate)}/hr`;
    }
    return null;
  }

  function getDetailLine() {
    switch (listing.listing_type) {
      case 'equipment':
      case 'supply':
        return listing.condition ? `Condition: ${listing.condition}` : null;
      case 'staff_available':
      case 'staff_needed':
        return listing.role_title
          ? `${listing.role_title}${listing.hourly_rate ? ` · ${formatCurrency(listing.hourly_rate)}/hr` : ''}`
          : null;
      case 'group_deal':
        if (listing.target_quantity) {
          return `${listing.current_signups || 0} / ${listing.target_quantity} signups`;
        }
        return listing.supplier_name ? `Supplier: ${listing.supplier_name}` : null;
      default:
        return null;
    }
  }

  const priceBadge = getPriceBadge();
  const detailLine = getDetailLine();

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push(`/marketplace/${listing.id}` as any)}
    >
      {thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      )}

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={[styles.typeIcon, { backgroundColor: config?.color + '20' }]}>
            <Ionicons
              name={(config?.icon || 'pricetag') as any}
              size={18}
              color={config?.color || COLORS.primary}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {listing.title}
            </Text>
            <View style={styles.badges}>
              <Badge text={config?.label || listing.listing_type} variant="neutral" size="sm" />
              {priceBadge && (
                <Badge
                  text={priceBadge}
                  variant={listing.price_type === 'free' ? 'success' : 'primary'}
                  size="sm"
                />
              )}
            </View>
          </View>
        </View>

        {listing.description && (
          <Text style={styles.description} numberOfLines={2}>
            {listing.description}
          </Text>
        )}

        {detailLine && (
          <Text style={styles.detail} numberOfLines={1}>
            {detailLine}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.businessInfo}>
            <Avatar uri={business?.logo_url} name={business?.name} size={20} />
            <Text style={styles.businessName} numberOfLines={1}>
              {business?.name || 'Unknown'}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo(listing.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#f3f4f6',
  },
  body: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  detail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  businessName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
});
