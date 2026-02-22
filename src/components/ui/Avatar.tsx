import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS } from '@src/utils/constants';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  verified?: boolean;
}

export function Avatar({ uri, name, size = 40, verified = false }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
            {initials}
          </Text>
        </View>
      )}
      {verified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: size * 0.35,
              height: size * 0.35,
              borderRadius: size * 0.175,
              right: -2,
              bottom: -2,
            },
          ]}
        >
          <Text style={{ fontSize: size * 0.2, color: '#fff' }}>✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.border,
  },
  placeholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
