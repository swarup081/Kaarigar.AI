// ============================================
// Kaarigar — AI Gateway Edge Function
// Proxies requests from mobile app to AI server
// Handles auth, rate limiting, error wrapping
// ============================================
// Deploy: supabase functions deploy ai-gateway

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const AI_SERVER_URL = Deno.env.get('AI_SERVER_URL') ?? 'http://localhost:8001';
const AI_API_KEY = Deno.env.get('AI_SHARED_API_KEY') ?? '';

const ROUTE_MAP: Record<string, { port: number; path: string }> = {
  '/enhance-image': { port: 8001, path: '/api/enhance-image' },
  '/voice-to-listing': { port: 8002, path: '/api/voice-to-listing' },
  '/suggest-price': { port: 8003, path: '/api/suggest-price' },
  '/text-to-speech': { port: 8004, path: '/api/text-to-speech' },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace('/ai-gateway', '');

    // Find matching route
    const route = ROUTE_MAP[pathname];
    if (!route) {
      return new Response(
        JSON.stringify({ error: 'Unknown AI endpoint', path: pathname }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build target URL
    // In production, AI_SERVER_URL points to friend's server
    // Locally, services run on different ports
    const targetUrl = AI_SERVER_URL.includes('localhost')
      ? `http://localhost:${route.port}${route.path}`
      : `${AI_SERVER_URL}${route.path}`;

    // Forward request to AI service
    const headers = new Headers(req.headers);
    headers.set('X-API-Key', AI_API_KEY);
    headers.delete('host');

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body,
    });

    // Return AI service response
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('AI Gateway error:', error);
    return new Response(
      JSON.stringify({
        error: 'AI service unavailable',
        message: 'The AI service is currently unreachable. Please try again later.',
        code: 'AI_SERVICE_UNAVAILABLE',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
