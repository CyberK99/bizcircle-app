import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import { useGroup, useGroupMembers } from '@src/hooks/useGroups';
import { useGroupPosts, useCreatePost, useToggleLike } from '@src/hooks/usePosts';
import { PostCard } from '@src/components/post/PostCard';
import { Avatar } from '@src/components/ui/Avatar';
import { Badge } from '@src/components/ui/Badge';
import { Button } from '@src/components/ui/Button';
import { Input } from '@src/components/ui/Input';
import { LoadingScreen } from '@src/components/ui/LoadingScreen';
import { EmptyState } from '@src/components/ui/EmptyState';
import { COLORS, POST_TYPE_LABELS } from '@src/utils/constants';
import { pluralize } from '@src/utils/formatters';
import type { PostType } from '@src/types/database';
import { useQueryClient } from '@tanstack/react-query';
import { pickMultipleImages, uploadImage } from '@src/lib/storage';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'announcement', label: 'Announcement' },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { business } = useAuth();

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(id);
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useGroupPosts(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const createPost = useCreatePost(id);

  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');
  const [showNewPost, setShowNewPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Real-time subscription for posts
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`group-posts:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `group_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleAddPhotos = useCallback(async () => {
    const remaining = 4 - postImages.length;
    if (remaining <= 0) return;
    const uris = await pickMultipleImages(remaining);
    if (uris.length > 0) {
      setPostImages((prev) => [...prev, ...uris].slice(0, 4));
    }
  }, [postImages.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreatePost = useCallback(async () => {
    if (!postBody.trim()) {
      Alert.alert('Error', 'Post body is required.');
      return;
    }

    try {
      setUploading(true);
      let mediaUrls: string[] = [];

      if (postImages.length > 0) {
        const uploadPromises = postImages.map((uri) => {
          const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          return uploadImage('post-images', path, uri);
        });
        const results = await Promise.all(uploadPromises);
        mediaUrls = results.filter((url): url is string => url !== null);

        if (mediaUrls.length !== postImages.length) {
          Alert.alert('Warning', 'Some images failed to upload. Post will be created with the successful uploads.');
        }
      }

      await createPost.mutateAsync({
        title: postTitle.trim() || undefined,
        body: postBody.trim(),
        postType,
        mediaUrls,
      });
      setPostTitle('');
      setPostBody('');
      setPostType('discussion');
      setPostImages([]);
      setShowNewPost(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [postTitle, postBody, postType, postImages, createPost, id]);

  if (groupLoading) return <LoadingScreen />;

  if (groupError || !group) {
    return (
      <>
        <Stack.Screen options={{ title: 'Group' }} />
        <EmptyState
          icon="alert-circle-outline"
          title="Group Not Found"
          message="This group could not be loaded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </>
    );
  }

  const industryIcon = (group.industry as any)?.icon || 'business';

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <View style={styles.container}>
        {/* Group Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name={industryIcon as any}
              size={28}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.memberCount}>
              {pluralize(group.member_count, 'member')}
            </Text>
          </View>
        </View>

        {group.description && (
          <Text style={styles.description}>{group.description}</Text>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'posts' && styles.tabTextActive,
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'members' && styles.tabTextActive,
              ]}
            >
              Members
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'posts' ? (
          <View style={styles.content}>
            {postsLoading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            ) : !posts || posts.length === 0 ? (
              <EmptyState
                icon="chatbubbles-outline"
                title="No Posts Yet"
                message="Be the first to start a conversation in this group."
                actionLabel="Create Post"
                onAction={() => setShowNewPost(true)}
              />
            ) : (
              <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onLike={() => {}}
                  />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* FAB */}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setShowNewPost(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {membersLoading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            ) : !members || members.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Members"
                message="This group has no members yet."
              />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const biz = item.business;
                  return (
                    <TouchableOpacity
                      style={styles.memberRow}
                      onPress={() =>
                        router.push(`/business/${biz?.id}` as any)
                      }
                      activeOpacity={0.7}
                    >
                      <Avatar
                        uri={biz?.logo_url}
                        name={biz?.name}
                        size={44}
                        verified={
                          biz?.verification_status === 'verified'
                        }
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {biz?.name || 'Unknown Business'}
                        </Text>
                        {(biz?.industry as any)?.name && (
                          <Text style={styles.memberIndustry}>
                            {(biz?.industry as any).name}
                          </Text>
                        )}
                      </View>
                      <Badge
                        text={item.role}
                        variant={
                          item.role === 'admin'
                            ? 'primary'
                            : item.role === 'moderator'
                            ? 'warning'
                            : 'neutral'
                        }
                      />
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {/* New Post Modal */}
        <Modal
          visible={showNewPost}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setShowNewPost(false); setPostImages([]); }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowNewPost(false); setPostImages([]); }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Post</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Post Type Selector */}
              <Text style={styles.fieldLabel}>Post Type</Text>
              <View style={styles.typeSelector}>
                {POST_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      postType === type.value && styles.typeOptionActive,
                    ]}
                    onPress={() => setPostType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        postType === type.value && styles.typeOptionTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Title (optional)"
                placeholder="Give your post a title"
                value={postTitle}
                onChangeText={setPostTitle}
              />

              <Input
                label="Body"
                placeholder="What's on your mind?"
                value={postBody}
                onChangeText={setPostBody}
                multiline
                numberOfLines={6}
                containerStyle={{ marginBottom: 16 }}
              />

              {/* Photo Picker */}
              <View style={styles.photoSection}>
                {postImages.length > 0 && (
                  <View style={styles.photoRow}>
                    {postImages.map((uri, index) => (
                      <View key={uri} style={styles.photoThumb}>
                        <Image source={{ uri }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.photoRemove}
                          onPress={() => handleRemovePhoto(index)}
                        >
                          <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.addPhotosButton,
                    postImages.length >= 4 && styles.addPhotosButtonDisabled,
                  ]}
                  onPress={handleAddPhotos}
                  disabled={postImages.length >= 4}
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={postImages.length >= 4 ? COLORS.textMuted : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.addPhotosText,
                      postImages.length >= 4 && styles.addPhotosTextDisabled,
                    ]}
                  >
                    {postImages.length >= 4 ? 'Photo limit reached' : 'Add Photos'}
                  </Text>
                  <Text style={styles.photoCounter}>{postImages.length}/4</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={uploading ? 'Uploading...' : 'Post'}
                onPress={handleCreatePost}
                loading={createPost.isPending || uploading}
                disabled={!postBody.trim() || uploading}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  memberCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 80,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberIndustry: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    width: 60,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#dbeafe',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: COLORS.primary,
  },
  photoSection: {
    marginBottom: 24,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addPhotosButtonDisabled: {
    borderColor: COLORS.border,
  },
  addPhotosText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    flex: 1,
  },
  addPhotosTextDisabled: {
    color: COLORS.textMuted,
  },
  photoCounter: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
