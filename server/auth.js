import crypto from 'node:crypto';
import { config, isProduction } from './config.js';

const HASH_PREFIX = 'scrypt-v1';

const base64url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const fromBase64url = (input) => {
  const padded = String(input).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
};

const secret = () => {
  if (config.sessionSecret) return config.sessionSecret;
  if (isProduction) throw new Error('SESSION_SECRET no configurado.');
  return 'sgsv-dev-session-secret-change-me';
};

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [prefix, salt, hash] = String(storedHash || '').split('$');
  if (prefix !== HASH_PREFIX || !salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

export function signSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + Math.max(1, config.sessionTtlHours) * 60 * 60,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length || !crypto.timingSafeEqual(received, wanted)) return null;

  try {
    const payload = JSON.parse(fromBase64url(encoded));
    if (!payload?.sub || !payload?.exp) return null;
    if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const publicUser = (user) => ({
  id: String(user.id),
  email: String(user.email),
  role: user.role === 'administrador' ? 'administrador' : 'operador',
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const can = (role, permission) => {
  if (role === 'administrador') return true;
  return permission === 'create_incidents';
};
