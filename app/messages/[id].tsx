import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@src/providers/AuthProvider';
import {
  useMessages,
  useSendMessage,
  useMarkRead,
} from '@src/hooks/useMessages';
import { supabase } from '@src/lib/supabase';
import { Avatar } from '@src/components/ui/Avatar';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS } from '@src/utils/constants';
import { timeAgo } from '@src/utils/formatters';
import type { Message } from '@src/types/database';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { business } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, isLoading, error } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkRead(id);

  const [messageText, setMessageText] = useState('');
  const [otherParticipant, setOtherParticipant] = useState<any>(null);

  // Load conversation details to get other participant name
  useEffect(() => {
    if (!id || !business) return;

    async function loadConversationDetails() {
      const { data } = await supabase
        .from('conversation_participants')
        .select('*, business:businesses(id, name, logo_url, verification_status)')
        .eq('conversation_id', id)
        .neq('business_id', business!.id)
        .single();

      if (data?.business) {
        setOtherParticipant(data.business);
      }
    }

    loadConversationDetails();
  }, [id, business?.id]);

  // Mark as read on mount
  useEffect(() => {
    if (id) {
      markRead.mutate();
    }
  }, [id]);

  // Mark as read when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      markRead.mutate();
    }
  }, [messages?.length]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim()) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      await sendMessage.mutateAsync({ body: text });
    } catch (err) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessageText(text);
    }
  }, [messageText, sendMessage]);

  if (isLoading) return <LoadingScreen />;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === business?.id;
    const sender = item.sender as any;

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        {!isMine && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/business/${sender?.id}` as any)
            }
          >
            <Avatar
              uri={sender?.logo_url}
              name={sender?.name}
              size={32}
            />
          </TouchableOpacity>
        )}
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine ? styles.messageTextMine : styles.messageTextOther,
            ]}
          >
            {item.body}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMine ? styles.messageTimeMine : styles.messageTimeOther,
            ]}
          >
            {timeAgo(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: otherParticipant?.name || 'Chat',
          headerShown: true,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Error"
            message="Failed to load messages."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesText}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />
        )}

        {/* Message Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextMine: {
    color: '#fff',
  },
  messageTextOther: {
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  messageTimeOther: {
    color: COLORS.textMuted,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    // inverted list so we flip this
    transform: [{ scaleY: -1 }],
  },
  emptyMessagesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
});
