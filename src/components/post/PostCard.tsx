import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { COLORS, POST_TYPE_LABELS } from '@src/utils/constants';
import { timeAgo, truncate } from '@src/utils/formatters';
import type { Post } from '@src/types/database';

interface PostCardProps {
  post: Post;
  showGroup?: boolean;
  onLike?: () => void;
}

export function PostCard({ post, showGroup = false, onLike }: PostCardProps) {
  const router = useRouter();
  const author = post.author as any;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() =>
        router.push(`/group/post/${post.id}` as any)
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/business/${author?.id}` as any)}
        >
          <Avatar
            uri={author?.logo_url}
            name={author?.name}
            size={40}
            verified={author?.verification_status === 'verified'}
          />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.authorName}>{author?.name || 'Unknown'}</Text>
          <View style={styles.meta}>
            <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
            {showGroup && (post as any).group && (
              <Text style={styles.groupName}>
                {' in '}
                {(post as any).group.name}
              </Text>
            )}
          </View>
        </View>
        {post.post_type !== 'discussion' && (
          <Badge
            text={POST_TYPE_LABELS[post.post_type]}
            variant={post.post_type === 'question' ? 'warning' : 'primary'}
          />
        )}
      </View>

      {post.title && <Text style={styles.title}>{post.title}</Text>}
      <Text style={styles.body}>{truncate(post.body, 200)}</Text>

      {post.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={12} color={COLORS.primary} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onLike?.();
          }}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={18}
            color={post.is_liked ? COLORS.danger : COLORS.textSecondary}
          />
          <Text style={styles.actionText}>{post.like_count}</Text>
        </TouchableOpacity>

        <View style={styles.actionButton}>
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={COLORS.textSecondary}
          />
          <Text style={styles.actionText}>{post.reply_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  groupName: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
