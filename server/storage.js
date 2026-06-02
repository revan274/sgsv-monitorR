import { config } from './config.js';

const trimSlash = (value) => String(value || '').replace(/\/$/, '');

const sanitizePath = (value) =>
  String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/');

export function storageConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseStorageBucket);
}

export async function uploadToSupabaseStorage({ file, path }) {
  if (!storageConfigured()) {
    const error = new Error('Storage cloud no configurado.');
    error.status = 503;
    throw error;
  }

  const objectPath = sanitizePath(path || file.originalname);
  if (!objectPath) {
    const error = new Error('Ruta de archivo invalida.');
    error.status = 400;
    throw error;
  }

  const baseUrl = trimSlash(config.supabaseUrl);
  const bucket = encodeURIComponent(config.supabaseStorageBucket);
  const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      apikey: config.supabaseServiceRoleKey,
      'Content-Type': file.mimetype || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file.buffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    const error = new Error(`No se pudo subir archivo: ${text}`);
    error.status = response.status;
    throw error;
  }

  return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}
