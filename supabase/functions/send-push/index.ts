/**
 * Edge Function — envoi push Expo (S1 scale).
 * Le client n’appelle plus exp.host directement en prod.
 *
 * Deploy :
 *   npx supabase functions deploy send-push --no-verify-jwt=false
 *
 * Secrets (auto sur Supabase) :
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * Body JSON :
 *   { userIds: string[], title: string, body: string, data?: object }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PushBody = {
  userIds?: string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifie le JWT appelant (user connecté)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as PushBody;
    const userIds = Array.from(
      new Set((payload.userIds || []).filter((id) => typeof id === 'string' && id.length > 0))
    ).slice(0, 100);
    const title = String(payload.title || '').slice(0, 120);
    const body = String(payload.body || '').slice(0, 500);

    if (!userIds.length || !title || !body) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tokens via service role (profiles.expo_push_token)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, expo_push_token, push_enabled')
      .in('id', userIds);

    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages: {
      to: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
      sound: 'default';
      channelId: string;
      priority: 'high';
    }[] = [];

    for (const p of profiles || []) {
      if ((p as any).push_enabled === false) continue;
      const token = (p as any).expo_push_token as string | null;
      if (!token || typeof token !== 'string' || token.length < 20) continue;
      messages.push({
        to: token,
        title,
        body,
        data: {
          ...(payload.data || {}),
          sentBy: user.id,
        },
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      });
    }

    if (!messages.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Expo batch ≤ 100
    const results: unknown[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      results.push(await res.json());
    }

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
