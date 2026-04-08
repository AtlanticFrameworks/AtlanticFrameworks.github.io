/**
 * BWRP Roblox OAuth Cloudflare Worker
 * 
 * DEPLOYMENT STEPS:
 * ==================================================
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Name it: bwrp-oauth (or any name you like)
 * 3. Paste the entire contents of this file into the editor
 * 4. Click "Save and Deploy"
 * 5. Go to Settings → Variables → Add Environment Variable:
 *    Name:  ROBLOX_AUTH_SECRET
 *    Value: (your Roblox OAuth app client secret)
 *    ✅ Check "Encrypt" to keep it secret
 * 6. Copy the deployed worker URL (e.g. https://bwrp-oauth.xyz.workers.dev)
 * 7. In team.html, replace YOUR_SUBDOMAIN in the WORKER_URL variable with your actual subdomain
 * ==================================================
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://bwrp.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: CORS_HEADERS
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    const { code, redirect_uri } = body;
    const client_id = body.client_id || '1185800266267472506';
    const clientSecret = env.ROBLOX_AUTH_SECRET;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    if (!clientSecret) {
      return new Response(JSON.stringify({ error: 'Worker missing ROBLOX_AUTH_SECRET environment variable' }), {
        status: 500, headers: CORS_HEADERS
      });
    }

    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect_uri || 'https://bwrp.net/team',
    });

    const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const userData = await userRes.json();

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch userinfo', details: userData }), {
        status: 400, headers: CORS_HEADERS
      });
    }

    // 3. Return structured response to the frontend
    return new Response(JSON.stringify({
      success: true,
      userId: userData.sub,
      username: userData.preferred_username || userData.name,
      picture: userData.picture || null,
    }), { status: 200, headers: CORS_HEADERS });
  }
};
