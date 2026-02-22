import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateEmergency } from '@src/hooks/useEmergency';
import { Input } from '@src/components/ui/Input';
import { Button } from '@src/components/ui/Button';
import {
  COLORS,
  EMERGENCY_CATEGORIES,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '@src/utils/constants';
import type { EmergencyCategory, UrgencyLevel } from '@src/types/database';

const categories = Object.entries(EMERGENCY_CATEGORIES) as [
  EmergencyCategory,
  { label: string; icon: string },
][];

const urgencyLevels: { value: UrgencyLevel; label: string; description: string }[] = [
  { value: 1, label: 'Critical', description: 'Need help within the hour' },
  { value: 2, label: 'Urgent', description: 'Need help today' },
  { value: 3, label: 'Same Day', description: 'Can wait a few hours' },
];

export default function NewEmergencyScreen() {
  const router = useRouter();
  const createEmergency = useCreateEmergency();

  const [category, setCategory] = useState<EmergencyCategory | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit() {
    if (!category || !urgencyLevel || !title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    try {
      const result = await createEmergency.mutateAsync({
        category,
        title: title.trim(),
        description: description.trim(),
        urgencyLevel,
      });

      Alert.alert(
        'Request Created',
        'Your emergency request has been sent to your group members.',
        [
          {
            text: 'View Request',
            onPress: () => {
              router.back();
              router.push(`/emergency/${result.id}` as any);
            },
          },
        ]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create request';
      Alert.alert('Error', message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={styles.sectionTitle}>What do you need?</Text>
        <View style={styles.categoryGrid}>
          {categories.map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryCard,
                category === key && styles.categoryCardActive,
              ]}
              onPress={() => setCategory(key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={val.icon as any}
                size={24}
                color={category === key ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  category === key && styles.categoryLabelActive,
                ]}
              >
                {val.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgency */}
        <Text style={styles.sectionTitle}>How urgent is this?</Text>
        <View style={styles.urgencyList}>
          {urgencyLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.urgencyCard,
                urgencyLevel === level.value && {
                  borderColor: URGENCY_COLORS[level.value],
                  backgroundColor: `${URGENCY_COLORS[level.value]}10`,
                },
              ]}
              onPress={() => setUrgencyLevel(level.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.urgencyDot,
                  { backgroundColor: URGENCY_COLORS[level.value] },
                ]}
              />
              <View style={styles.urgencyText}>
                <Text style={styles.urgencyLabel}>{level.label}</Text>
                <Text style={styles.urgencyDesc}>{level.description}</Text>
              </View>
              {urgencyLevel === level.value && (
                <Ionicons name="checkmark-circle" size={22} color={URGENCY_COLORS[level.value]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Input
          label="Title"
          placeholder="Brief summary of what you need"
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label="Description"
          placeholder="Describe your situation in detail. Include relevant info like location, timing, budget, etc."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Button
          title="Send Emergency Request"
          onPress={handleSubmit}
          loading={createEmergency.isPending}
          variant="danger"
          style={{ marginTop: 8 }}
        />

        <Text style={styles.disclaimer}>
          Your request will be sent to members in your group. If no one responds,
          you can manually expand to nearby areas.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '31%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  categoryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: COLORS.primary,
  },
  urgencyList: {
    gap: 10,
    marginBottom: 24,
  },
  urgencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    gap: 12,
  },
  urgencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  urgencyText: {
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  urgencyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
