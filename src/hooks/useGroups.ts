import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import type { Group, GroupMembership } from '@src/types/database';

export function useMyGroups() {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['my-groups', business?.id],
    queryFn: async (): Promise<(GroupMembership & { group: Group })[]> => {
      if (!business) return [];
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          *,
          group:groups(
            *,
            industry:industries(*),
            county:counties(*)
          )
        `)
        .eq('business_id', business.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business,
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async (): Promise<Group | null> => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          industry:industries(*),
          county:counties(*)
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          *,
          business:businesses(*, industry:industries(*))
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });
}
