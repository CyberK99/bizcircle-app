import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import { usePost, useCreatePost, useToggleLike } from '@src/hooks/usePosts';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS, POST_TYPE_LABELS } from '@src/utils/constants';
import { timeAgo } from '@src/utils/formatters';
import { useQueryClient } from '@tanstack/react-query';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { business } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const { data: post, isLoading, error } = usePost(id);
  const toggleLike = useToggleLike(id, post?.group_id || '');

  const [replyText, setReplyText] = useState('');

  // We need the groupId from the post to create replies
  const groupId = post?.group_id || '';
  const createReply = useCreatePost(groupId);

  // Real-time subscription for new replies
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`post-replies:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `parent_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['post', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !groupId) return;

    try {
      await createReply.mutateAsync({
        body: replyText.trim(),
        parentId: id,
      });
      setReplyText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    }
  };

  const handleLike = () => {
    if (!post) return;
    toggleLike.mutate(!!post.is_liked);
  };

  if (isLoading) return <LoadingScreen />;

  if (error || !post) {
    return (
      <>
        <Stack.Screen options={{ title: 'Post' }} />
        <EmptyState
          icon="alert-circle-outline"
          title="Post Not Found"
          message="This post could not be loaded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </>
    );
  }

  const author = post.author as any;
  const replies = (post.replies as any[]) || [];

  const renderHeader = () => (
    <View style={styles.postContainer}>
      {/* Author Info */}
      <View style={styles.authorRow}>
        <TouchableOpacity
          onPress={() => router.push(`/business/${author?.id}` as any)}
        >
          <Avatar
            uri={author?.logo_url}
            name={author?.name}
            size={44}
            verified={author?.verification_status === 'verified'}
          />
        </TouchableOpacity>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{author?.name || 'Unknown'}</Text>
          <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
        {post.post_type !== 'discussion' && (
          <Badge
            text={POST_TYPE_LABELS[post.post_type]}
            variant={post.post_type === 'question' ? 'warning' : 'primary'}
          />
        )}
      </View>

      {/* Post Content */}
      {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
      <Text style={styles.postBody}>{post.body}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={toggleLike.isPending}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.is_liked ? COLORS.danger : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.actionText,
              post.is_liked && { color: COLORS.danger },
            ]}
          >
            {post.like_count} {post.like_count === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButton}>
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={COLORS.textSecondary}
          />
          <Text style={styles.actionText}>
            {post.reply_count} {post.reply_count === 1 ? 'Reply' : 'Replies'}
          </Text>
        </View>
      </View>

      {/* Replies Header */}
      <View style={styles.repliesHeader}>
        <Text style={styles.repliesTitle}>Replies</Text>
      </View>
    </View>
  );

  const renderReply = ({ item }: { item: any }) => {
    const replyAuthor = item.author as any;
    return (
      <View style={styles.replyContainer}>
        <TouchableOpacity
          onPress={() =>
            router.push(`/business/${replyAuthor?.id}` as any)
          }
        >
          <Avatar
            uri={replyAuthor?.logo_url}
            name={replyAuthor?.name}
            size={36}
            verified={replyAuthor?.verification_status === 'verified'}
          />
        </TouchableOpacity>
        <View style={styles.replyContent}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyAuthorName}>
              {replyAuthor?.name || 'Unknown'}
            </Text>
            <Text style={styles.replyTime}>
              {timeAgo(item.created_at)}
            </Text>
          </View>
          <Text style={styles.replyBody}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Post' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          renderItem={renderReply}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyReplies}>
              <Text style={styles.emptyRepliesText}>
                No replies yet. Be the first to respond.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Input */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.replyInput}
            placeholder="Write a reply..."
            placeholderTextColor={COLORS.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !replyText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || createReply.isPending}
          >
            {createReply.isPending ? (
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
  listContent: {
    paddingBottom: 8,
  },
  postContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  postTime: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  postBody: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 28,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  repliesHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  repliesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  replyContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  replyContent: {
    flex: 1,
    marginLeft: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  replyAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  replyTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  emptyReplies: {
    padding: 32,
    alignItems: 'center',
  },
  emptyRepliesText: {
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
  replyInput: {
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
