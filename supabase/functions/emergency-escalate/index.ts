import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Emergency Escalation Edge Function
 *
 * For MVP: Called manually when user taps "Share Wider" button.
 * Post-MVP: Called by pg_cron every 60 seconds for auto-escalation.
 *
 * Escalation tiers:
 * 1. Same group members + direct connections (same county)
 * 2. Same industry, adjacent counties (~50mi)
 * 3. Related industries, wider area (~100mi)
 * 4. All verified businesses in metro area
 */

interface EscalatePayload {
  request_id: string;
  manual?: boolean; // true when user taps "Share Wider"
}

serve(async (req) => {
  try {
    const payload: EscalatePayload = await req.json();
    const { request_id } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the emergency request
    const { data: request, error: reqError } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        requester:businesses(id, industry_id, county_fips, owner_id)
      `)
      .eq('id', request_id)
      .eq('status', 'active')
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: 'Request not found or not active' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentTier = request.current_tier;
    const nextTier = Math.min(currentTier + 1, 4);
    const requester = request.requester as any;

    let recipientBusinessIds: string[] = [];

    if (nextTier === 2) {
      // Tier 2: Same industry, adjacent counties
      const { data: adjacent } = await supabase
        .from('county_adjacency')
        .select('neighbor_fips')
        .eq('county_fips', requester.county_fips);

      const countyFips = [
        requester.county_fips,
        ...(adjacent?.map((a: { neighbor_fips: string }) => a.neighbor_fips) || []),
      ];

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, owner_id')
        .eq('industry_id', requester.industry_id)
        .in('county_fips', countyFips)
        .eq('verification_status', 'verified')
        .neq('id', requester.id);

      recipientBusinessIds = businesses?.map((b: { id: string }) => b.id) || [];
    } else if (nextTier === 3) {
      // Tier 3: All verified businesses in adjacent counties (any industry)
      const { data: adjacent } = await supabase
        .from('county_adjacency')
        .select('neighbor_fips')
        .eq('county_fips', requester.county_fips);

      const countyFips = [
        requester.county_fips,
        ...(adjacent?.map((a: { neighbor_fips: string }) => a.neighbor_fips) || []),
      ];

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, owner_id')
        .in('county_fips', countyFips)
        .eq('verification_status', 'verified')
        .neq('id', requester.id);

      recipientBusinessIds = businesses?.map((b: { id: string }) => b.id) || [];
    } else if (nextTier === 4) {
      // Tier 4: Wide broadcast — all verified businesses in state
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, owner_id')
        .eq('verification_status', 'verified')
        .neq('id', requester.id)
        .limit(500);

      recipientBusinessIds = businesses?.map((b: { id: string }) => b.id) || [];
    }

    // Get owner user IDs for notifications
    const { data: recipientBusinesses } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .in('id', recipientBusinessIds);

    // Create notifications for each recipient (deduplicate)
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('type', 'emergency_request')
      .eq('data->>request_id', request_id);

    const alreadyNotified = new Set(
      existingNotifs?.map((n: { user_id: string }) => n.user_id) || []
    );

    const newNotifications = (recipientBusinesses || [])
      .filter((b: { owner_id: string }) => !alreadyNotified.has(b.owner_id))
      .map((b: { id: string; owner_id: string }) => ({
        user_id: b.owner_id,
        type: 'emergency_request',
        title: `Emergency: ${request.title}`,
        body: `A nearby business needs ${request.category.replace(/_/g, ' ')}`,
        data: {
          request_id: request.id,
          screen: 'emergency_detail',
        },
      }));

    if (newNotifications.length > 0) {
      await supabase.from('notifications').insert(newNotifications);
    }

    // Update request tier
    await supabase
      .from('emergency_requests')
      .update({ current_tier: nextTier })
      .eq('id', request_id);

    // Log escalation
    await supabase.from('emergency_escalation_log').insert({
      request_id,
      tier: nextTier,
      notified_count: newNotifications.length,
    });

    return new Response(
      JSON.stringify({
        escalated_to: nextTier,
        new_notifications: newNotifications.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
