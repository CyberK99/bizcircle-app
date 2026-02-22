import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import type { Post, PostType } from '@src/types/database';

export function useGroupPosts(groupId: string) {
  return useQuery({
    queryKey: ['posts', groupId],
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:businesses(id, name, logo_url, verification_status)
        `)
        .eq('group_id', groupId)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:businesses(id, name, logo_url, verification_status),
          replies:posts(
            *,
            author:businesses(id, name, logo_url, verification_status)
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
}

export function useCreatePost(groupId: string) {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      body,
      postType,
      parentId,
      mediaUrls,
    }: {
      title?: string;
      body: string;
      postType?: PostType;
      parentId?: string;
      mediaUrls?: string[];
    }) => {
      if (!business) throw new Error('No business profile');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          group_id: groupId,
          author_id: business.id,
          title: title || null,
          body,
          post_type: postType || 'discussion',
          parent_id: parentId || null,
          media_urls: mediaUrls || [],
        })
        .select(`
          *,
          author:businesses(id, name, logo_url, verification_status)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', groupId] });
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: ['post', variables.parentId] });
      }
    },
  });
}

export function useToggleLike(postId: string, groupId: string) {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async (isLiked: boolean) => {
      if (!business) throw new Error('No business profile');

      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('business_id', business.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, business_id: business.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useHomeFeed() {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['home-feed', business?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!business) return [];

      // Get user's group IDs
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('business_id', business.id);

      if (!memberships || memberships.length === 0) return [];

      const groupIds = memberships.map((m) => m.group_id);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:businesses(id, name, logo_url, verification_status),
          group:groups(id, name, slug)
        `)
        .in('group_id', groupIds)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!business,
  });
}
