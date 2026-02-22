import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@src/lib/supabase';
import { useAuth } from '@src/providers/AuthProvider';
import type {
  EmergencyRequest,
  EmergencyResponse,
  EmergencyCategory,
  UrgencyLevel,
} from '@src/types/database';

export function useNearbyEmergencies() {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['emergencies-nearby', business?.county_fips],
    queryFn: async (): Promise<EmergencyRequest[]> => {
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

      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          requester:businesses(id, name, logo_url, verification_status, county_name, state_code)
        `)
        .eq('status', 'active')
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.county_fips,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useMyEmergencies() {
  const { business } = useAuth();

  return useQuery({
    queryKey: ['my-emergencies', business?.id],
    queryFn: async (): Promise<EmergencyRequest[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          requester:businesses(id, name, logo_url, verification_status)
        `)
        .eq('requester_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business,
  });
}

export function useEmergencyRequest(requestId: string) {
  return useQuery({
    queryKey: ['emergency', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          requester:businesses(id, name, logo_url, verification_status, phone, county_name, state_code),
          responses:emergency_responses(
            *,
            responder:businesses(id, name, logo_url, verification_status, phone)
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
    refetchInterval: 10000,
  });
}

export function useCreateEmergency() {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async ({
      category,
      title,
      description,
      urgencyLevel,
    }: {
      category: EmergencyCategory;
      title: string;
      description: string;
      urgencyLevel: UrgencyLevel;
    }) => {
      if (!business) throw new Error('No business profile');

      const { data, error } = await supabase
        .from('emergency_requests')
        .insert({
          requester_id: business.id,
          category,
          title,
          description,
          urgency_level: urgencyLevel,
          latitude: business.latitude,
          longitude: business.longitude,
          expires_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencies-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['my-emergencies'] });
    },
  });
}

export function useRespondToEmergency() {
  const queryClient = useQueryClient();
  const { business } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      message,
      estimatedEta,
      estimatedCost,
    }: {
      requestId: string;
      message: string;
      estimatedEta?: string;
      estimatedCost?: string;
    }) => {
      if (!business) throw new Error('No business profile');

      const { data, error } = await supabase
        .from('emergency_responses')
        .insert({
          request_id: requestId,
          responder_id: business.id,
          message,
          estimated_eta: estimatedEta || null,
          estimated_cost: estimatedCost || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['emergency', variables.requestId],
      });
    },
  });
}

export function useUpdateEmergencyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      fulfilledBy,
    }: {
      requestId: string;
      status: string;
      fulfilledBy?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (fulfilledBy) {
        updateData.fulfilled_by = fulfilledBy;
        updateData.fulfilled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('emergency_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['emergency', variables.requestId],
      });
      queryClient.invalidateQueries({ queryKey: ['emergencies-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['my-emergencies'] });
    },
  });
}
