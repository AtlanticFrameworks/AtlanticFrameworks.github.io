/**
 * BWRP Security Headers – Cloudflare Worker
 *
 * Sits in front of GitHub Pages (atlanticframeworks.github.io) for all
 * non-API traffic at bwrp.net. Injects a hardened security header set and
 * strips the wildcard CORS header from HTML page responses.
 *
 * Route: bwrp.net/*
 * NOTE: The more-specific route bwrp.net/api/* is handled by the
 *       bwrpauth worker (worker/wrangler.toml). Cloudflare's route
 *       specificity ensures bwrpauth wins for /api/* paths.
 */

// ── CSP ──────────────────────────────────────────────────────────────────────
//
// Sources identified by static analysis of the repo (2026-04-28):
//   Scripts : cdn.tailwindcss.com, unpkg.com (lucide), cdn.jsdelivr.net (driver.js)
//   Styles  : fonts.googleapis.com, cdn.jsdelivr.net (driver.js)
//   Fonts   : fonts.gstatic.com
//   Images  : self, data:, www.roblox.com, thumbnails.roblox.com
//   Connect : self (bwrp.net/api), discord.com (widget), roblox APIs,
//             public CORS proxies used in main.js (codetabs, allorigins, corsproxy.io)
//
// 'unsafe-inline' for scripts/styles is required because:
//   • Every page has inline <script> blocks for tailwind.config
//   • Tailwind CDN injects inline <style> at runtime
//   Removing this requires migrating to a nonce-based or hash-based CSP.
//
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://www.roblox.com https://thumbnails.roblox.com",
  "connect-src 'self' https://discord.com https://api.codetabs.com https://api.allorigins.win https://corsproxy.io https://groups.roblox.com https://thumbnails.roblox.com https://apis.roblox.com",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

// ── Security headers injected on every response ───────────────────────────────
const SECURITY_HEADERS = {
  'Content-Security-Policy':   CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':           'DENY',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'geolocation=(), camera=(), microphone=()',
};

// ── Helper: is this an HTML response? ────────────────────────────────────────
function isHtmlResponse(response) {
  const ct = response.headers.get('Content-Type') || '';
  return ct.includes('text/html');
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // Subrequests from Cloudflare Workers do NOT re-trigger this worker,
    // so fetch(request) goes directly to the GitHub Pages origin.
    let response;
    try {
      response = await fetch(request);
    } catch (err) {
      return new Response('Bad Gateway', { status: 502 });
    }

    // Clone and mutate headers
    const newHeaders = new Headers(response.headers);

    // 1. Inject all security headers
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      newHeaders.set(name, value);
    }

    // 2. Strip wildcard CORS from HTML page responses only.
    //    Keep CORS on assets (fonts, images) so cross-origin font loading works.
    if (isHtmlResponse(response)) {
      newHeaders.delete('Access-Control-Allow-Origin');
      newHeaders.delete('Access-Control-Allow-Methods');
      newHeaders.delete('Access-Control-Allow-Headers');
    }

    // 3. Remove the X-Powered-By / Server leakage headers if GitHub Pages adds them
    newHeaders.delete('X-Powered-By');

    return new Response(response.body, {
      status:     response.status,
      statusText: response.statusText,
      headers:    newHeaders,
    });
  },
};
