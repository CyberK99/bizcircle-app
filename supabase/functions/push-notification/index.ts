import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationPayload {
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  };
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();
    const { record } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get push tokens for the user
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_token')
      .eq('user_id', record.user_id);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build Expo push messages
    const messages = tokens.map((t: { expo_token: string }) => ({
      to: t.expo_token,
      sound: 'default',
      title: record.title,
      body: record.body || '',
      data: record.data || {},
    }));

    // Send via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Mark notification as push sent
    await supabase
      .from('notifications')
      .update({ is_push_sent: true })
      .eq('id', record.id);

    return new Response(JSON.stringify({ sent: messages.length, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
