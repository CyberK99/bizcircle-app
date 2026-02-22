import { useQuery } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import type { Industry } from '@src/types/database';

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: async (): Promise<Industry[]> => {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Build hierarchy
      const topLevel = (data || []).filter((i) => !i.parent_id);
      return topLevel.map((parent) => ({
        ...parent,
        children: (data || []).filter((i) => i.parent_id === parent.id),
      }));
    },
    staleTime: Infinity, // Industries don't change
  });
}
