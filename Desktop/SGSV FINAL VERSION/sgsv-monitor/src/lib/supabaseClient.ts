import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => String(import.meta.env[key] || '').trim();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const isPlaceholder = (value: string): boolean =>
  !value || value.includes('YOUR_') || value.includes('supabase.co/project');

export const isSupabaseConfigured = (): boolean =>
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
    throw new Error('Supabase no esta configurado.');
  }
  return supabase;
};
