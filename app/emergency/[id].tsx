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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import {
  useEmergencyRequest,
  useRespondToEmergency,
  useUpdateEmergencyStatus,
} from '@src/hooks/useEmergency';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { Button } from '@src/components/ui/Button';
import { Input } from '@src/components/ui/Input';
import { Card } from '@src/components/ui/Card';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import {
  COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  EMERGENCY_CATEGORIES,
} from '@src/utils/constants';
import { timeAgo } from '@src/utils/formatters';

export default function EmergencyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { business } = useAuth();
  const { data: request, isLoading } = useEmergencyRequest(id);
  const respondMutation = useRespondToEmergency();
  const updateStatus = useUpdateEmergencyStatus();

  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [eta, setEta] = useState('');
  const [cost, setCost] = useState('');

  if (isLoading || !request) return <LoadingScreen />;

  const isOwner = request.requester_id === business?.id;
  const category = EMERGENCY_CATEGORIES[request.category] || EMERGENCY_CATEGORIES.other;
  const requester = request.requester as any;
  const responses = (request as any).responses || [];

  const urgencyVariant =
    request.urgency_level === 1
      ? 'danger'
      : request.urgency_level === 2
      ? 'warning'
      : 'primary';

  async function handleRespond() {
    if (!responseMessage.trim()) {
      Alert.alert('Required', 'Please enter a message.');
      return;
    }
    try {
      await respondMutation.mutateAsync({
        requestId: id,
        message: responseMessage.trim(),
        estimatedEta: eta.trim() || undefined,
        estimatedCost: cost.trim() || undefined,
      });
      setShowResponseForm(false);
      setResponseMessage('');
      setEta('');
      setCost('');
      Alert.alert('Response Sent', 'The requester has been notified.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to respond';
      Alert.alert('Error', message);
    }
  }

  async function handleCancel() {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this emergency request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                requestId: id,
                status: 'cancelled',
              });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  }

  async function handleAcceptResponse(responseId: string, responderId: string) {
    try {
      await updateStatus.mutateAsync({
        requestId: id,
        status: 'fulfilled',
        fulfilledBy: responderId,
      });
      Alert.alert('Accepted', 'The responder has been notified.');
    } catch {
      Alert.alert('Error', 'Failed to accept response');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        {request.status !== 'active' && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor:
                  request.status === 'fulfilled'
                    ? '#dcfce7'
                    : request.status === 'cancelled'
                    ? '#fee2e2'
                    : '#fef3c7',
              },
            ]}
          >
            <Text style={styles.statusText}>
              {request.status === 'fulfilled'
                ? 'This request has been fulfilled'
                : request.status === 'cancelled'
                ? 'This request was cancelled'
                : `Status: ${request.status}`}
            </Text>
          </View>
        )}

        {/* Request Details */}
        <Card>
          <View style={styles.requestHeader}>
            <View style={styles.categoryIcon}>
              <Ionicons
                name={category.icon as any}
                size={24}
                color={URGENCY_COLORS[request.urgency_level]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <View style={styles.badges}>
                <Badge
                  text={URGENCY_LABELS[request.urgency_level]}
                  variant={urgencyVariant}
                />
                <Badge text={category.label} variant="neutral" />
                <Badge text={`Tier ${request.current_tier}`} variant="primary" />
              </View>
            </View>
          </View>

          <Text style={styles.description}>{request.description}</Text>

          <View style={styles.requesterRow}>
            <Avatar uri={requester?.logo_url} name={requester?.name} size={32} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.requesterName}>{requester?.name}</Text>
              <Text style={styles.requesterLocation}>
                {requester?.county_name}, {requester?.state_code}
              </Text>
            </View>
            <Text style={styles.timeText}>{timeAgo(request.created_at)}</Text>
          </View>

          {isOwner && request.status === 'active' && (
            <Button
              title="Cancel Request"
              onPress={handleCancel}
              variant="outline"
              size="sm"
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* Responses */}
        <Text style={styles.sectionTitle}>
          Responses ({responses.length})
        </Text>

        {responses.length === 0 ? (
          <Card>
            <Text style={styles.noResponses}>
              No responses yet. Help is on the way!
            </Text>
          </Card>
        ) : (
          responses.map((resp: any) => {
            const responder = resp.responder;
            return (
              <Card key={resp.id} style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Avatar
                    uri={responder?.logo_url}
                    name={responder?.name}
                    size={36}
                    verified={responder?.verification_status === 'verified'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.responderName}>
                      {responder?.name}
                    </Text>
                    <Text style={styles.responseTime}>
                      {timeAgo(resp.created_at)}
                    </Text>
                  </View>
                  <Badge
                    text={resp.status}
                    variant={
                      resp.status === 'accepted'
                        ? 'success'
                        : resp.status === 'declined'
                        ? 'danger'
                        : 'neutral'
                    }
                  />
                </View>
                <Text style={styles.responseMessage}>{resp.message}</Text>
                {(resp.estimated_eta || resp.estimated_cost) && (
                  <View style={styles.responseDetails}>
                    {resp.estimated_eta && (
                      <Text style={styles.responseDetail}>
                        ETA: {resp.estimated_eta}
                      </Text>
                    )}
                    {resp.estimated_cost && (
                      <Text style={styles.responseDetail}>
                        Cost: {resp.estimated_cost}
                      </Text>
                    )}
                  </View>
                )}
                {isOwner && request.status === 'active' && resp.status === 'offered' && (
                  <Button
                    title="Accept This Response"
                    onPress={() => handleAcceptResponse(resp.id, resp.responder_id)}
                    size="sm"
                    style={{ marginTop: 10 }}
                  />
                )}
              </Card>
            );
          })
        )}

        {/* Respond Form */}
        {!isOwner && request.status === 'active' && (
          <>
            {!showResponseForm ? (
              <Button
                title="I Can Help"
                onPress={() => setShowResponseForm(true)}
                style={{ marginTop: 16 }}
                icon={
                  <Ionicons name="hand-left" size={20} color="#fff" />
                }
              />
            ) : (
              <Card style={{ marginTop: 16 }}>
                <Text style={styles.formTitle}>Your Response</Text>
                <Input
                  label="Message"
                  placeholder="How can you help? What can you offer?"
                  value={responseMessage}
                  onChangeText={setResponseMessage}
                  multiline
                />
                <Input
                  label="Estimated Arrival (optional)"
                  placeholder="e.g., 30 minutes, 1 hour"
                  value={eta}
                  onChangeText={setEta}
                />
                <Input
                  label="Estimated Cost (optional)"
                  placeholder="e.g., $200, Free, TBD"
                  value={cost}
                  onChangeText={setCost}
                />
                <View style={styles.formActions}>
                  <Button
                    title="Cancel"
                    onPress={() => setShowResponseForm(false)}
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                  />
                  <Button
                    title="Send Response"
                    onPress={handleRespond}
                    loading={respondMutation.isPending}
                    size="sm"
                    fullWidth={false}
                  />
                </View>
              </Card>
            )}
          </>
        )}
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
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
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
    marginBottom: 16,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  requesterName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  requesterLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  noResponses: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  responseCard: {
    marginBottom: 10,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responderName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  responseTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  responseMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  responseDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  responseDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
