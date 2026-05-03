/**
 * SecureMind Visitor Counter — Cloudflare Worker
 *
 * Deploy steps:
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Go to Settings → Variables → KV Namespace Bindings
 *    Add binding: variable name = COUNTER_KV, namespace = create new "securemind-counter"
 * 4. Save & Deploy
 * 5. Copy the Worker URL (e.g. https://counter.yourname.workers.dev)
 * 6. Update WORKER_URL in index.html
 */

const COUNTER_KEY = 'total_visitors';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://securemind.live',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get visitor IP
    const ip = request.headers.get('CF-Connecting-IP')
             || request.headers.get('X-Forwarded-For')
             || 'unknown';

    // Hash IP for privacy (never store raw IPs)
    const ipHash = await hashString(ip + 'sm-salt-2026');
    const ipKey  = `ip:${ipHash}`;

    // Check if already counted in last 24h
    const alreadySeen = await env.COUNTER_KV.get(ipKey);

    let count = parseInt(await env.COUNTER_KV.get(COUNTER_KEY) || '0');

    if (!alreadySeen) {
      count += 1;
      await Promise.all([
        env.COUNTER_KV.put(COUNTER_KEY, count.toString()),
        env.COUNTER_KV.put(ipKey, '1', { expirationTtl: 86400 }), // 24h TTL
      ]);
    }

    return new Response(JSON.stringify({ count, unique: !alreadySeen }), {
      headers: corsHeaders,
    });
  },
};

async function hashString(str) {
  const data = new TextEncoder().encode(str);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 20);
}
