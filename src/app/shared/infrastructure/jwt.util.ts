/** Minimal JWT payload shape used by SmartPalm tokens. */
export interface JwtPayload {
  sid?: string | number;
  name?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Decodes a JWT payload without verifying the signature (client-side convenience).
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    // Browser + modern Node provide atob; avoid Buffer for CSR bundle safety.
    if (typeof atob !== 'function') return null;
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** User id from claim `sid` (backend TokenService). */
export function userIdFromToken(token: string | null | undefined): number | null {
  const payload = decodeJwtPayload(token);
  if (payload?.sid === undefined || payload.sid === null) return null;
  const id = Number(payload.sid);
  return Number.isFinite(id) ? id : null;
}
