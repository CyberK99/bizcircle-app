import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import type { Conversation, Message } from '@src/types/database';

export function useConversations() {
  const { business } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', business?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!business) return [];

      const { data: participantRows, error: pErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('business_id', business.id);

      if (pErr) throw pErr;
      if (!participantRows || participantRows.length === 0) return [];

      const convIds = participantRows.map((p) => p.conversation_id);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            business:businesses(id, name, logo_url, verification_status)
          )
        `)
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get last message for each conversation
      const conversations = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*, sender:businesses(id, name)')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const otherParticipant = conv.participants?.find(
            (p: { business_id: string }) => p.business_id !== business.id
          );

          return {
            ...conv,
            last_message: msgs?.[0] || null,
            other_participant: otherParticipant?.business || null,
          };
        })
      );

      return conversations;
    },
    enabled: !!business,
  });

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!business) return;

    const channel = supabase
      .channel('conversations-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['conversations', business.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id]);

  return query;
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:businesses(id, name, logo_url, verification_status)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['messages', conversationId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async ({ body }: { body: string }) => {
      if (!business) throw new Error('No business profile');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: business.id,
          body,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async (otherBusinessId: string) => {
      if (!business) throw new Error('No business profile');

      // Check if conversation already exists
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('business_id', business.id);

      if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map((c) => c.conversation_id);
        const { data: existing } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('business_id', otherBusinessId)
          .in('conversation_id', myConvIds);

        if (existing && existing.length > 0) {
          return existing[0].conversation_id;
        }
      }

      // Create new conversation
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convErr) throw convErr;

      // Add participants
      const { error: partErr } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conv.id, business_id: business.id },
          { conversation_id: conv.id, business_id: otherBusinessId },
        ]);

      if (partErr) throw partErr;

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return conv.id;
    },
  });
}

export function useMarkRead(conversationId: string) {
  const { business } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!business) return;

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('business_id', business.id);
    },
  });
}
