import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadDotEnv = () => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
};

loadDotEnv();

const splitCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 12),
  corsOrigins: splitCsv(process.env.CORS_ORIGINS),
  initialAdminEmail: process.env.ADMIN_EMAIL || '',
  initialAdminPassword: process.env.ADMIN_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  mediaMaxBytes: Number(process.env.MEDIA_MAX_BYTES || 12 * 1024 * 1024),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'media',
};

export const isProduction = config.nodeEnv === 'production';

export function assertRequiredRuntimeConfig() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL es requerido para SGSV cloud.');
  }
  if (isProduction && !config.sessionSecret) {
    throw new Error('SESSION_SECRET es requerido en produccion.');
  }
}
