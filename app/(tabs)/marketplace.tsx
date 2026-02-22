import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS } from '@src/utils/constants';

export default function MarketplaceScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="storefront-outline"
        title="Marketplace Coming Soon"
        message="Share equipment, find staff, and discover group deals with businesses in your area. This feature is coming in a future update."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
});
