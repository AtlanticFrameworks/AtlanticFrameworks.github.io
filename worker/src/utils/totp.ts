/**
 * TOTP (RFC 6238) implementation using Web Crypto API.
 * Compatible with Google Authenticator — no external dependencies.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Uint8Array {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const out: number[] = [];
  let buf = 0;
  let bits = 0;

  for (const ch of str) {
    const val = BASE32.indexOf(ch);
    if (val === -1) continue;
    buf = (buf << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }

  return new Uint8Array(out);
}

/** Pack a counter into an 8-byte big-endian buffer (for HOTP). */
function counterBytes(n: number): Uint8Array {
  const buf = new Uint8Array(8);
  let v = n;
  for (let i = 7; i >= 0; i--) {
    buf[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return buf;
}

/** Generate a 6-digit HOTP code for the given counter. */
async function hotp(secret: string, counter: number): Promise<string> {
  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign'],
  );

  const mac  = await crypto.subtle.sign('HMAC', key, counterBytes(counter));
  const hash = new Uint8Array(mac);

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = hash[hash.length - 1] & 0x0f;
  const code   =
    (((hash[offset]     & 0x7f) << 24) |
     ((hash[offset + 1] & 0xff) << 16) |
     ((hash[offset + 2] & 0xff) <<  8) |
      (hash[offset + 3] & 0xff)) % 1_000_000;

  return code.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code against a base32 secret.
 * Accepts the current 30-second window plus ±1 step for clock skew.
 */
export async function verifyTOTP(secret: string, userCode: string): Promise<boolean> {
  const code = userCode.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const step = Math.floor(Date.now() / 1000 / 30);

  for (const delta of [-1, 0, 1]) {
    if ((await hotp(secret, step + delta)) === code) return true;
  }

  return false;
}

// ─── Docs Session Cookie ──────────────────────────────────────────────────────
// Cookie value format: "<expires_unix>.<hmac_hex>"
// Signed with DOCS_TOTP_SECRET via HMAC-SHA-256.

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Create a signed session cookie value that expires in `ttlSeconds`. */
export async function signSession(secret: string, ttlSeconds = 300): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(secret, String(expires));
  return `${expires}.${sig}`;
}

/**
 * Verify a session cookie value.
 * Returns the Unix expiry timestamp if valid and not expired, otherwise null.
 */
export async function verifySession(secret: string, value: string): Promise<number | null> {
  const dot = value.indexOf('.');
  if (dot === -1) return null;

  const expiresStr = value.slice(0, dot);
  const givenSig   = value.slice(dot + 1);
  const expires    = parseInt(expiresStr, 10);

  if (isNaN(expires) || Math.floor(Date.now() / 1000) > expires) return null;

  const expectedSig = await hmacHex(secret, expiresStr);
  if (expectedSig !== givenSig) return null;

  return expires;
}
