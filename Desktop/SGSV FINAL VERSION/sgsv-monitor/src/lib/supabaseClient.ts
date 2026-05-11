import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => String(import.meta.env[key] || '').trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseApiKey =
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

const isPlaceholder = (value: string): boolean =>
  !value ||
  value.includes('YOUR_') ||
  value.includes('PEGA_AQUI') ||
  value.includes('SUBSTITUTE_') ||
  value.includes('<') ||
  value.includes('>') ||
  value.includes('...');

const isSupabaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

const isLegacyJwt = (value: string): boolean =>
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

const isPublishableKey = (value: string): boolean =>
  /^sb_publishable_[A-Za-z0-9_-]+$/.test(value);

const readJwtRole = (value: string): string | null => {
  const [, payload] = value.split('.');
  if (!payload || typeof globalThis.atob !== 'function') return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    const parsed = JSON.parse(decoded) as { role?: unknown };
    return typeof parsed.role === 'string' ? parsed.role : null;
  } catch {
    return null;
  }
};

export const hasSupabaseEnv = (): boolean =>
  Boolean(supabaseUrl || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY'));

export const getSupabaseConfigError = (): string | null => {
  if (!hasSupabaseEnv()) return null;

  if (isPlaceholder(supabaseUrl) || !isSupabaseUrl(supabaseUrl)) {
    return 'VITE_SUPABASE_URL no es una URL valida de Supabase.';
  }

  if (isPlaceholder(supabaseApiKey) || /\s/.test(supabaseApiKey)) {
    return 'La clave publica de Supabase esta incompleta o mal pegada. Copiala completa, sin "..." ni saltos de linea.';
  }

  if (supabaseApiKey.startsWith('sb_secret_')) {
    return 'No uses una secret key de Supabase en el frontend. Usa la publishable key o la anon key.';
  }

  if (!isPublishableKey(supabaseApiKey) && !isLegacyJwt(supabaseApiKey)) {
    return 'La clave publica de Supabase no tiene formato valido. Usa VITE_SUPABASE_PUBLISHABLE_KEY o VITE_SUPABASE_ANON_KEY.';
  }

  if (isLegacyJwt(supabaseApiKey) && readJwtRole(supabaseApiKey) === 'service_role') {
    return 'No uses la service_role key de Supabase en el frontend. Usa la anon key o publishable key.';
  }

  return null;
};

export const isSupabaseConfigured = (): boolean =>
  hasSupabaseEnv() && !getSupabaseConfigError();

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseApiKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || 'Supabase no esta configurado.');
  }
  return supabase;
};
