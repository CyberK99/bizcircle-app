import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import { useIndustries } from '@src/hooks/useIndustries';
import { geocodeAddress } from '@src/lib/geocoder';
import { uploadVerificationDoc, pickImage } from '@src/lib/storage';
import { supabase } from '@src/lib/supabase';
import { COLORS } from '@src/utils/constants';
import { Button } from '@src/components/ui/Button';
import { Input } from '@src/components/ui/Input';
import { Card } from '@src/components/ui/Card';
import type { DocumentType } from '@src/types/database';

const TOTAL_STEPS = 4;

const EMPLOYEE_RANGES = ['1-5', '6-10', '11-25', '26-50'] as const;

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'business_license', label: 'Business License' },
  { value: 'ein_letter', label: 'EIN Letter' },
  { value: 'secretary_of_state', label: 'State Filing' },
  { value: 'insurance_cert', label: 'Insurance Certificate' },
  { value: 'other', label: 'Other' },
];

interface OnboardingFormData {
  // Step 1 — Business Basics
  businessName: string;
  industryId: string;
  employeeCount: string;
  // Step 2 — Location
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateCode: string;
  zip: string;
  // Step 3 — Verification
  documentType: DocumentType;
  documentUri: string;
  documentFileName: string;
}

// ---------------------------------------------------------------------------
// Progress Indicator
// ---------------------------------------------------------------------------
function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.labelRow}>
        <Text style={progressStyles.stepText}>
          Step {currentStep} of {TOTAL_STEPS}
        </Text>
        <Text style={progressStyles.percentText}>
          {Math.round((currentStep / TOTAL_STEPS) * 100)}%
        </Text>
      </View>
      <View style={progressStyles.track}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              progressStyles.segment,
              i < currentStep && progressStyles.segmentActive,
              i === 0 && progressStyles.segmentFirst,
              i === TOTAL_STEPS - 1 && progressStyles.segmentLast,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  track: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  segmentLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});

// ---------------------------------------------------------------------------
// Main Onboarding Screen
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, business, refreshBusiness } = useAuth();
  const { data: industries, isLoading: industriesLoading } = useIndustries();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Geocode state
  const [geocoding, setGeocoding] = useState(false);
  const [countyName, setCountyName] = useState<string | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<{
    county_fips: string;
    county_name: string;
    state_code: string;
    state_name: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Industry sub-selection
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Created business ID (populated after step 2 submit)
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  // Group info (populated after business creation)
  const [joinedGroupName, setJoinedGroupName] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    defaultValues: {
      businessName: '',
      industryId: '',
      employeeCount: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateCode: '',
      zip: '',
      documentType: 'business_license',
      documentUri: '',
      documentFileName: '',
    },
  });

  const watchedIndustryId = watch('industryId');
  const watchedEmployeeCount = watch('employeeCount');
  const watchedDocType = watch('documentType');
  const watchedDocUri = watch('documentUri');
  const watchedDocFileName = watch('documentFileName');
  const watchedAddressLine1 = watch('addressLine1');
  const watchedCity = watch('city');
  const watchedStateCode = watch('stateCode');
  const watchedZip = watch('zip');

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------
  async function goNext() {
    if (step === 1) {
      const valid = await trigger(['businessName', 'industryId', 'employeeCount']);
      if (!valid) return;
      setStep(2);
    } else if (step === 2) {
      const valid = await trigger(['addressLine1', 'city', 'stateCode', 'zip']);
      if (!valid) return;
      if (!geocodeResult) {
        Alert.alert('County Required', 'Please detect your county before continuing.');
        return;
      }
      await handleCreateBusiness();
    } else if (step === 3) {
      if (watchedDocUri) {
        await handleUploadVerification();
      } else {
        // Skip verification
        await handleSkipVerification();
      }
    }
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  // -------------------------------------------------------------------------
  // Step 2 → Create business
  // -------------------------------------------------------------------------
  async function handleCreateBusiness() {
    if (!user || !geocodeResult) return;
    setSubmitting(true);

    try {
      const formData = watch();
      const empRange = formData.employeeCount;
      // Use the midpoint of the range as the employee_count number
      const empMap: Record<string, number> = {
        '1-5': 3,
        '6-10': 8,
        '11-25': 18,
        '26-50': 38,
      };

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: formData.businessName.trim(),
          industry_id: formData.industryId,
          employee_count: empMap[empRange] ?? 1,
          address_line1: formData.addressLine1.trim(),
          address_line2: formData.addressLine2?.trim() || null,
          city: formData.city.trim(),
          state_code: geocodeResult.state_code || formData.stateCode.trim().toUpperCase(),
          zip: formData.zip.trim(),
          county_fips: geocodeResult.county_fips,
          county_name: geocodeResult.county_name,
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          verification_status: 'unverified',
        })
        .select('id')
        .single();

      if (error) throw error;

      setCreatedBusinessId(data.id);

      // Refresh auth business context (triggers DB auto-group join)
      await refreshBusiness();

      // Fetch the auto-joined group name
      const { data: membership } = await supabase
        .from('group_memberships')
        .select('group:groups(name)')
        .eq('business_id', data.id)
        .limit(1)
        .single();

      if (membership?.group) {
        const group = membership.group as unknown as { name: string };
        setJoinedGroupName(group.name);
      }

      setStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create business. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 helper → Detect county
  // -------------------------------------------------------------------------
  async function handleDetectCounty() {
    const street = watchedAddressLine1;
    const city = watchedCity;
    const state = watchedStateCode;
    const zip = watchedZip;

    if (!street || !city || !state || !zip) {
      Alert.alert('Missing Fields', 'Please fill in all address fields before detecting county.');
      return;
    }

    setGeocoding(true);
    setCountyName(null);
    setGeocodeResult(null);

    try {
      const result = await geocodeAddress(street.trim(), city.trim(), state.trim(), zip.trim());
      if (result) {
        setGeocodeResult(result);
        setCountyName(result.county_name);
      } else {
        Alert.alert(
          'County Not Found',
          'We could not detect the county for this address. Please double-check the address and try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to detect county. Please try again.');
    } finally {
      setGeocoding(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 3 → Upload verification document
  // -------------------------------------------------------------------------
  async function handlePickDocument() {
    const uri = await pickImage();
    if (uri) {
      const fileName = uri.split('/').pop() || 'document.jpg';
      setValue('documentUri', uri);
      setValue('documentFileName', fileName);
    }
  }

  async function handleUploadVerification() {
    const bizId = createdBusinessId || business?.id;
    if (!bizId || !watchedDocUri) return;

    setSubmitting(true);
    try {
      const docPath = await uploadVerificationDoc(bizId, watchedDocUri, watchedDocFileName);
      if (!docPath) throw new Error('Upload failed');

      // Insert verification_submissions record
      const { error: subError } = await supabase.from('verification_submissions').insert({
        business_id: bizId,
        document_type: watchedDocType,
        document_url: docPath,
        status: 'pending',
      });
      if (subError) throw subError;

      // Update business verification_status to pending
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ verification_status: 'pending' })
        .eq('id', bizId);
      if (updateError) throw updateError;

      await refreshBusiness();
      setStep(4);
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkipVerification() {
    setStep(4);
  }

  // -------------------------------------------------------------------------
  // Step 4 → Done
  // -------------------------------------------------------------------------
  function handleGetStarted() {
    router.replace('/(tabs)');
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  function getStepTitle(): string {
    switch (step) {
      case 1:
        return 'Business Basics';
      case 2:
        return 'Business Location';
      case 3:
        return 'Verification';
      case 4:
        return 'You\'re All Set!';
      default:
        return '';
    }
  }

  function getStepDescription(): string {
    switch (step) {
      case 1:
        return 'Tell us about your business so we can connect you with the right community.';
      case 2:
        return 'Your address helps us place you in your local business group.';
      case 3:
        return 'Verified businesses earn more trust from the community.';
      case 4:
        return '';
      default:
        return '';
    }
  }

  // =========================================================================
  // STEP 1 — Business Basics
  // =========================================================================
  function renderStep1() {
    const selectedParent = industries?.find((i) => i.id === selectedParentId);
    const subIndustries = selectedParent?.children || [];

    return (
      <View>
        {/* Business Name */}
        <Controller
          control={control}
          name="businessName"
          rules={{ required: 'Business name is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Business Name"
              placeholder="e.g. Smith's Auto Repair"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.businessName?.message}
              autoCapitalize="words"
            />
          )}
        />

        {/* Industry Picker */}
        <Text style={styles.sectionLabel}>Industry</Text>
        {errors.industryId && (
          <Text style={styles.fieldError}>{errors.industryId.message}</Text>
        )}

        {industriesLoading ? (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={{ marginVertical: 16 }}
          />
        ) : (
          <>
            {/* Top-level categories */}
            <View style={styles.chipGrid}>
              {industries?.map((industry) => {
                const isSelected = selectedParentId === industry.id;
                return (
                  <TouchableOpacity
                    key={industry.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => {
                      setSelectedParentId(industry.id);
                      // If no children, select this directly
                      if (!industry.children || industry.children.length === 0) {
                        setValue('industryId', industry.id, { shouldValidate: true });
                      } else {
                        // Clear sub-selection when parent changes
                        if (selectedParentId !== industry.id) {
                          setValue('industryId', '', { shouldValidate: false });
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {industry.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sub-industries */}
            {subIndustries.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subSectionLabel}>
                  Select a specialty in {selectedParent?.name}
                </Text>
                <View style={styles.chipGrid}>
                  {subIndustries.map((sub) => {
                    const isSelected = watchedIndustryId === sub.id;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() =>
                          setValue('industryId', sub.id, { shouldValidate: true })
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextSelected]}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {/* Employee Count */}
        <Controller
          control={control}
          name="employeeCount"
          rules={{ required: 'Employee count is required' }}
          render={() => (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionLabel}>Employee Count</Text>
              {errors.employeeCount && (
                <Text style={styles.fieldError}>{errors.employeeCount.message}</Text>
              )}
              <View style={styles.chipGrid}>
                {EMPLOYEE_RANGES.map((range) => {
                  const isSelected = watchedEmployeeCount === range;
                  return (
                    <TouchableOpacity
                      key={range}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() =>
                        setValue('employeeCount', range, { shouldValidate: true })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.chipText, isSelected && styles.chipTextSelected]}
                      >
                        {range}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />

        {/* Hidden validation trigger for industryId */}
        <Controller
          control={control}
          name="industryId"
          rules={{ required: 'Please select an industry' }}
          render={() => <></>}
        />
      </View>
    );
  }

  // =========================================================================
  // STEP 2 — Business Location
  // =========================================================================
  function renderStep2() {
    return (
      <View>
        <Controller
          control={control}
          name="addressLine1"
          rules={{ required: 'Address is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Address Line 1"
              placeholder="123 Main Street"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                // Reset county when address changes
                setCountyName(null);
                setGeocodeResult(null);
              }}
              onBlur={onBlur}
              error={errors.addressLine1?.message}
              autoCapitalize="words"
            />
          )}
        />

        <Controller
          control={control}
          name="addressLine2"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Address Line 2 (optional)"
              placeholder="Suite 100"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
            />
          )}
        />

        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <Controller
              control={control}
              name="city"
              rules={{ required: 'City is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="City"
                  placeholder="Springfield"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setCountyName(null);
                    setGeocodeResult(null);
                  }}
                  onBlur={onBlur}
                  error={errors.city?.message}
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="stateCode"
              rules={{
                required: 'Required',
                pattern: {
                  value: /^[A-Za-z]{2}$/,
                  message: '2 letters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="State"
                  placeholder="IL"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text.toUpperCase());
                    setCountyName(null);
                    setGeocodeResult(null);
                  }}
                  onBlur={onBlur}
                  error={errors.stateCode?.message}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              )}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="zip"
              rules={{
                required: 'Required',
                pattern: {
                  value: /^\d{5}$/,
                  message: '5 digits',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="ZIP"
                  placeholder="62701"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setCountyName(null);
                    setGeocodeResult(null);
                  }}
                  onBlur={onBlur}
                  error={errors.zip?.message}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              )}
            />
          </View>
        </View>

        {/* Detect County */}
        <Button
          title={geocoding ? 'Detecting...' : 'Detect County'}
          onPress={handleDetectCounty}
          variant="outline"
          loading={geocoding}
          disabled={geocoding}
          icon={
            !geocoding ? (
              <Ionicons name="location" size={18} color={COLORS.primary} />
            ) : undefined
          }
          style={{ marginTop: 4 }}
        />

        {/* County result */}
        {countyName && (
          <Card style={styles.countyCard}>
            <View style={styles.countyRow}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.countyLabel}>County Detected</Text>
                <Text style={styles.countyName}>{countyName} County</Text>
              </View>
            </View>
          </Card>
        )}
      </View>
    );
  }

  // =========================================================================
  // STEP 3 — Verification
  // =========================================================================
  function renderStep3() {
    return (
      <View>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Upload one of the following to verify your business: business license, EIN
              letter, state filing, or insurance certificate.
            </Text>
          </View>
        </Card>

        {/* Document Type Selector */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Document Type</Text>
        <View style={styles.chipGrid}>
          {DOCUMENT_TYPES.map((docType) => {
            const isSelected = watchedDocType === docType.value;
            return (
              <TouchableOpacity
                key={docType.value}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() =>
                  setValue('documentType', docType.value, { shouldValidate: true })
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {docType.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Choose Document */}
        <View style={{ marginTop: 20 }}>
          <Button
            title="Choose Document"
            onPress={handlePickDocument}
            variant="outline"
            icon={<Ionicons name="document-attach" size={18} color={COLORS.primary} />}
          />
        </View>

        {/* File Preview */}
        {watchedDocUri ? (
          <Card style={styles.previewCard}>
            <Image source={{ uri: watchedDocUri }} style={styles.previewImage} />
            <View style={styles.previewInfo}>
              <View style={styles.previewTextRow}>
                <Ionicons name="document" size={18} color={COLORS.primary} />
                <Text style={styles.previewFileName} numberOfLines={1}>
                  {watchedDocFileName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setValue('documentUri', '');
                  setValue('documentFileName', '');
                }}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : null}

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipVerification}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =========================================================================
  // STEP 4 — Done
  // =========================================================================
  function renderStep4() {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneIconWrap}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={styles.doneTitle}>Welcome to BizCircle!</Text>
        <Text style={styles.doneSubtitle}>
          Your business profile has been created and you're ready to connect with your
          local business community.
        </Text>

        {joinedGroupName && (
          <Card style={styles.groupCard}>
            <View style={styles.groupRow}>
              <View style={styles.groupIconWrap}>
                <Ionicons name="people" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupJoinedLabel}>Auto-joined group</Text>
                <Text style={styles.groupName}>{joinedGroupName}</Text>
              </View>
            </View>
          </Card>
        )}

        <Button
          title="Get Started"
          onPress={handleGetStarted}
          style={{ marginTop: 32 }}
        />
      </View>
    );
  }

  // =========================================================================
  // Main Render
  // =========================================================================
  function renderCurrentStep() {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  }

  const showBackButton = step > 1 && step < 4;
  const showNextButton = step < 4 && step !== 3; // Step 3 has its own submit via upload/skip
  const showSubmitButton = step === 3 && !!watchedDocUri;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <ProgressBar currentStep={step} />

          {/* Title */}
          <Text style={styles.title}>{getStepTitle()}</Text>
          {getStepDescription() ? (
            <Text style={styles.description}>{getStepDescription()}</Text>
          ) : null}

          {/* Step Content */}
          <View style={styles.stepContent}>{renderCurrentStep()}</View>
        </ScrollView>

        {/* Bottom Buttons (not shown on step 4 — that has its own CTA) */}
        {step < 4 && (
          <View style={styles.bottomBar}>
            {showBackButton ? (
              <Button
                title="Back"
                onPress={goBack}
                variant="ghost"
                fullWidth={false}
                style={{ flex: 1, marginRight: 8 }}
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {showNextButton && (
              <Button
                title={step === 2 ? 'Create Business' : 'Continue'}
                onPress={goNext}
                loading={submitting}
                disabled={submitting}
                fullWidth={false}
                style={{ flex: 2 }}
              />
            )}

            {showSubmitButton && (
              <Button
                title="Upload & Continue"
                onPress={goNext}
                loading={submitting}
                disabled={submitting}
                fullWidth={false}
                style={{ flex: 2 }}
              />
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  stepContent: {
    marginTop: 24,
  },

  // Chip grid (for industry, employee count, doc type)
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.danger,
    marginBottom: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Step 2 — Location
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  countyCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  countyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countyLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  countyName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Step 3 — Verification
  infoCard: {
    padding: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  previewCard: {
    marginTop: 16,
    padding: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  previewTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  previewFileName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Step 4 — Done
  doneContainer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  doneIconWrap: {
    marginBottom: 24,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  doneSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  groupCard: {
    marginTop: 28,
    padding: 16,
    width: '100%',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupJoinedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
});
