import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@src/providers/AuthProvider';
import { useConversations } from '@src/hooks/useMessages';
import { Avatar } from '@src/components/ui/Avatar';
import { EmptyState } from '@src/components/ui/EmptyState';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import { COLORS } from '@src/utils/constants';
import { timeAgo, truncate } from '@src/utils/formatters';
import type { Conversation } from '@src/types/database';

export default function ConversationListScreen() {
  const router = useRouter();
  const { business } = useAuth();
  const { data: conversations, isLoading, error } = useConversations();

  if (isLoading) return <LoadingScreen />;

  const renderConversation = ({ item }: { item: any }) => {
    const otherParticipant = item.other_participant;
    const lastMessage = item.last_message;

    // Determine if there are unread messages
    const myParticipant = item.participants?.find(
      (p: any) => p.business_id === business?.id
    );
    const lastReadAt = myParticipant?.last_read_at;
    const hasUnread =
      lastMessage &&
      lastReadAt &&
      new Date(lastMessage.created_at) > new Date(lastReadAt);

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() => router.push(`/messages/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar
            uri={otherParticipant?.logo_url}
            name={otherParticipant?.name}
            size={50}
            verified={otherParticipant?.verification_status === 'verified'}
          />
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.participantName,
                hasUnread && styles.participantNameUnread,
              ]}
              numberOfLines={1}
            >
              {otherParticipant?.name || 'Unknown'}
            </Text>
            {lastMessage && (
              <Text style={styles.messageTime}>
                {timeAgo(lastMessage.created_at)}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.lastMessage,
              hasUnread && styles.lastMessageUnread,
            ]}
            numberOfLines={2}
          >
            {lastMessage
              ? truncate(lastMessage.body, 80)
              : 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Messages', headerShown: true }} />
      <View style={styles.container}>
        {error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Something Went Wrong"
            message="Failed to load conversations. Please try again."
          />
        ) : !conversations || conversations.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No Conversations"
            message="Start a conversation by visiting a business profile and tapping Message."
          />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  participantNameUnread: {
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
