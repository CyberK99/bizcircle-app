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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { useCreateListing } from '@src/hooks/useListings';
import { useMyGroups } from '@src/hooks/useGroups';
import { pickMultipleImages, uploadImage } from '@src/lib/storage';
import { Input } from '@src/components/ui/Input';
import { Button } from '@src/components/ui/Button';
import {
  COLORS,
  LISTING_TYPE_CONFIG,
  PRICE_TYPE_LABELS,
  CONDITION_OPTIONS,
} from '@src/utils/constants';
import type { ListingType, PriceType } from '@src/types/database';

const listingTypes = Object.entries(LISTING_TYPE_CONFIG) as [
  ListingType,
  { label: string; icon: string; color: string },
][];

const priceTypes = Object.entries(PRICE_TYPE_LABELS) as [PriceType, string][];

export default function NewListingScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const createListing = useCreateListing();
  const { data: myGroups } = useMyGroups();

  // Form state
  const [listingType, setListingType] = useState<ListingType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Type-specific fields
  const [condition, setCondition] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<PriceType | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');
  const [duration, setDuration] = useState('');
  const [skills, setSkills] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [dealDeadline, setDealDeadline] = useState('');

  // Group selector
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  async function handlePickPhotos() {
    const uris = await pickMultipleImages(4 - photos.length);
    if (uris.length > 0) {
      setPhotos((prev) => [...prev, ...uris].slice(0, 4));
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!listingType || !title.trim()) {
      Alert.alert('Missing Info', 'Please select a listing type and enter a title.');
      return;
    }

    try {
      setUploading(true);

      // Upload photos
      let mediaUrls: string[] = [];
      if (photos.length > 0 && business) {
        const uploads = await Promise.all(
          photos.map((uri, i) =>
            uploadImage(
              'listing-images',
              `${business.id}/${Date.now()}_${i}.jpg`,
              uri
            )
          )
        );
        mediaUrls = uploads.filter((url): url is string => url !== null);
      }

      const result = await createListing.mutateAsync({
        listing_type: listingType,
        title: title.trim(),
        description: description.trim() || undefined,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        group_id: selectedGroupId,
        condition: condition || undefined,
        price: price ? parseFloat(price) : undefined,
        price_type: priceType || undefined,
        role_title: roleTitle.trim() || undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        date_needed: dateNeeded.trim() || undefined,
        duration: duration.trim() || undefined,
        skills: skills.trim()
          ? skills.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        target_quantity: targetQuantity ? parseInt(targetQuantity, 10) : undefined,
        deal_deadline: dealDeadline.trim() || undefined,
        supplier_name: supplierName.trim() || undefined,
      });

      Alert.alert('Listing Created', 'Your listing is now live!', [
        {
          text: 'View Listing',
          onPress: () => {
            router.back();
            router.push(`/marketplace/${result.id}` as any);
          },
        },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
  }

  const showPriceFields =
    listingType === 'equipment' ||
    listingType === 'supply' ||
    listingType === 'space' ||
    listingType === 'group_deal';

  const showCondition = listingType === 'equipment' || listingType === 'supply';
  const showStaffFields = listingType === 'staff_available' || listingType === 'staff_needed';
  const showGroupDealFields = listingType === 'group_deal';

  // Filter price types for space (include per_hour/per_day)
  const availablePriceTypes =
    listingType === 'space'
      ? priceTypes
      : priceTypes.filter(([key]) => key !== 'per_hour' && key !== 'per_day');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Listing Type */}
        <Text style={styles.sectionTitle}>What are you listing?</Text>
        <View style={styles.typeGrid}>
          {listingTypes.map(([key, val]) => {
            const isActive = listingType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.typeCard,
                  isActive && {
                    borderColor: val.color,
                    backgroundColor: val.color + '10',
                  },
                ]}
                onPress={() => setListingType(key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={val.icon as any}
                  size={24}
                  color={isActive ? val.color : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    isActive && { color: val.color },
                  ]}
                >
                  {val.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Input
          label="Title"
          placeholder="What are you listing?"
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label="Description"
          placeholder="Provide details about your listing..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Photos */}
        <Text style={styles.label}>Photos (optional)</Text>
        <View style={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoContainer}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => removePhoto(i)}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 4 && (
            <TouchableOpacity style={styles.photoAdd} onPress={handlePickPhotos}>
              <Ionicons name="camera-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.photoAddText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Type-specific Fields */}
        {showCondition && (
          <>
            <Text style={styles.sectionTitle}>Condition</Text>
            <View style={styles.pillRow}>
              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.pill,
                    condition === opt && styles.pillActive,
                  ]}
                  onPress={() => setCondition(opt)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      condition === opt && styles.pillTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {showPriceFields && (
          <>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <Input
              label="Price"
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.label}>Price Type</Text>
            <View style={styles.pillRow}>
              {availablePriceTypes.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pill,
                    priceType === key && styles.pillActive,
                  ]}
                  onPress={() => setPriceType(key)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      priceType === key && styles.pillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {showStaffFields && (
          <>
            <Text style={styles.sectionTitle}>Staff Details</Text>
            <Input
              label="Role Title"
              placeholder="e.g., Line Cook, Server, Plumber"
              value={roleTitle}
              onChangeText={setRoleTitle}
            />
            <Input
              label="Hourly Rate"
              placeholder="0.00"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
            />
            <Input
              label="Skills (comma separated)"
              placeholder="e.g., food prep, customer service"
              value={skills}
              onChangeText={setSkills}
            />
            <Input
              label="Duration"
              placeholder="e.g., 2 weeks, ongoing"
              value={duration}
              onChangeText={setDuration}
            />
            {listingType === 'staff_needed' && (
              <Input
                label="Date Needed"
                placeholder="e.g., ASAP, March 15"
                value={dateNeeded}
                onChangeText={setDateNeeded}
              />
            )}
          </>
        )}

        {showGroupDealFields && (
          <>
            <Text style={styles.sectionTitle}>Group Deal Details</Text>
            <Input
              label="Supplier Name"
              placeholder="Who is offering the deal?"
              value={supplierName}
              onChangeText={setSupplierName}
            />
            <Input
              label="Target Quantity"
              placeholder="How many signups needed?"
              value={targetQuantity}
              onChangeText={setTargetQuantity}
              keyboardType="number-pad"
            />
            <Input
              label="Deal Deadline"
              placeholder="e.g., March 31, 2026"
              value={dealDeadline}
              onChangeText={setDealDeadline}
            />
          </>
        )}

        {/* Group Selector */}
        <Text style={styles.sectionTitle}>Post to Group (optional)</Text>
        <View style={styles.groupList}>
          <TouchableOpacity
            style={[
              styles.groupOption,
              selectedGroupId === null && styles.groupOptionActive,
            ]}
            onPress={() => setSelectedGroupId(null)}
          >
            <Ionicons
              name="globe-outline"
              size={20}
              color={selectedGroupId === null ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.groupOptionText,
                selectedGroupId === null && styles.groupOptionTextActive,
              ]}
            >
              None — visible to all nearby
            </Text>
            {selectedGroupId === null && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
          {(myGroups || []).map((membership) => {
            const group = membership.group;
            const isActive = selectedGroupId === group.id;
            return (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupOption,
                  isActive && styles.groupOptionActive,
                ]}
                onPress={() => setSelectedGroupId(group.id)}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={isActive ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.groupOptionText,
                    isActive && styles.groupOptionTextActive,
                  ]}
                >
                  {group.name}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit */}
        <Button
          title="Create Listing"
          onPress={handleSubmit}
          loading={createListing.isPending || uploading}
          style={{ marginTop: 8 }}
        />
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
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeCard: {
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
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  pillActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.primary,
  },
  groupList: {
    gap: 8,
    marginBottom: 24,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    gap: 10,
  },
  groupOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  groupOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  groupOptionTextActive: {
    color: COLORS.primary,
  },
});
