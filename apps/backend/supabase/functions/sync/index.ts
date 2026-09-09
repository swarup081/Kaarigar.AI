// ============================================
// Kaarigar — Product Sync Edge Function
// Receives offline sync payloads from mobile app
// ============================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { operations } = body as {
      operations: Array<{
        entityType: string;
        operation: string;
        payload: Record<string, unknown>;
        localId: string;
      }>;
    };

    const results: Array<{ localId: string; serverId?: string; status: string; error?: string }> = [];

    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'create': {
            const { data, error } = await supabase
              .from(op.entityType === 'product' ? 'products' : 'artisans')
              .insert(op.payload)
              .select('id')
              .single();

            if (error) throw error;
            results.push({ localId: op.localId, serverId: data.id, status: 'success' });
            break;
          }
          case 'update': {
            const { error } = await supabase
              .from(op.entityType === 'product' ? 'products' : 'artisans')
              .update(op.payload)
              .eq('id', op.payload.id);

            if (error) throw error;
            results.push({ localId: op.localId, status: 'success' });
            break;
          }
          case 'delete': {
            const { error } = await supabase
              .from(op.entityType === 'product' ? 'products' : 'artisans')
              .delete()
              .eq('id', op.payload.id);

            if (error) throw error;
            results.push({ localId: op.localId, status: 'success' });
            break;
          }
          default:
            results.push({ localId: op.localId, status: 'error', error: `Unknown operation: ${op.operation}` });
        }
      } catch (error) {
        results.push({
          localId: op.localId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Sync failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
