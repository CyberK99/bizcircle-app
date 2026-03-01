import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import type { Listing, ListingType, ListingStatus, PriceType } from '@src/types/database';

interface ListingFilters {
  type?: ListingType;
  searchQuery?: string;
}

export function useNearbyListings(filters?: ListingFilters) {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['listings-nearby', business?.county_fips, filters?.type, filters?.searchQuery],
    queryFn: async (): Promise<Listing[]> => {
      if (!business?.county_fips) return [];

      // Get adjacent counties
      const { data: adjacency } = await supabase
        .from('county_adjacency')
        .select('neighbor_fips')
        .eq('county_fips', business.county_fips);

      const countyFips = [
        business.county_fips,
        ...(adjacency?.map((a) => a.neighbor_fips) || []),
      ];

      let query = supabase
        .from('listings')
        .select(`
          *,
          business:businesses!business_id(id, name, logo_url, verification_status, county_name, state_code, county_fips, industry:industries(name))
        `)
        .eq('status', 'active')
        .is('group_id', null)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('listing_type', filters.type);
      }

      if (filters?.searchQuery) {
        query = query.ilike('title', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by nearby counties client-side
      return (data || []).filter((listing) => {
        const biz = listing.business as any;
        return biz?.county_fips && countyFips.includes(biz.county_fips);
      });
    },
    enabled: !!business?.county_fips,
    refetchInterval: 60000,
  });
}

export function useGroupListings(filters?: ListingFilters) {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['listings-groups', business?.id, filters?.type, filters?.searchQuery],
    queryFn: async (): Promise<Listing[]> => {
      if (!business) return [];

      // Get user's group IDs
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('business_id', business.id);

      const groupIds = memberships?.map((m) => m.group_id) || [];
      if (groupIds.length === 0) return [];

      let query = supabase
        .from('listings')
        .select(`
          *,
          business:businesses!business_id(id, name, logo_url, verification_status, county_name, state_code, industry:industries(name))
        `)
        .eq('status', 'active')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('listing_type', filters.type);
      }

      if (filters?.searchQuery) {
        query = query.ilike('title', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!business,
    refetchInterval: 60000,
  });
}

export function useListing(id: string) {
  const { business } = useAuth();
  const viewTracked = useRef(false);

  // Increment view count once per session
  useEffect(() => {
    if (id && !viewTracked.current) {
      viewTracked.current = true;
      supabase.rpc('increment_listing_views', { p_listing_id: id });
    }
  }, [id]);

  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          business:businesses!business_id(id, name, logo_url, verification_status, phone, county_name, state_code, industry:industries(name))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const listing = data as Listing;

      // Check if current user has saved this listing
      if (business) {
        const { data: saveData } = await supabase
          .from('listing_saves')
          .select('listing_id')
          .eq('listing_id', id)
          .eq('business_id', business.id)
          .maybeSingle();

        listing.is_saved = !!saveData;
      }

      return listing;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      listing_type: ListingType;
      title: string;
      description?: string;
      media_urls?: string[];
      group_id?: string | null;
      condition?: string;
      price?: number;
      price_type?: PriceType;
      role_title?: string;
      hourly_rate?: number;
      date_needed?: string;
      duration?: string;
      skills?: string[];
      target_quantity?: number;
      deal_deadline?: string;
      supplier_name?: string;
    }) => {
      if (!business) throw new Error('No business profile');

      const { data, error } = await supabase
        .from('listings')
        .insert({
          business_id: business.id,
          listing_type: input.listing_type,
          title: input.title,
          description: input.description || null,
          media_urls: input.media_urls || [],
          group_id: input.group_id || null,
          condition: input.condition || null,
          price: input.price ?? null,
          price_type: input.price_type || null,
          role_title: input.role_title || null,
          hourly_rate: input.hourly_rate ?? null,
          date_needed: input.date_needed || null,
          duration: input.duration || null,
          skills: input.skills || null,
          target_quantity: input.target_quantity ?? null,
          deal_deadline: input.deal_deadline || null,
          supplier_name: input.supplier_name || null,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['listings-groups'] });
    },
  });
}

export function useUpdateListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      status,
    }: {
      listingId: string;
      status: ListingStatus;
    }) => {
      const { error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', listingId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['listing', variables.listingId],
      });
      queryClient.invalidateQueries({ queryKey: ['listings-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['listings-groups'] });
    },
  });
}

export function useToggleListingSave(listingId: string) {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async (isSaved: boolean) => {
      if (!business) throw new Error('No business profile');

      if (isSaved) {
        const { error } = await supabase
          .from('listing_saves')
          .delete()
          .eq('listing_id', listingId)
          .eq('business_id', business.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('listing_saves')
          .insert({ listing_id: listingId, business_id: business.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['listings-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['listings-groups'] });
    },
  });
}
