import { get, set } from 'idb-keyval';
import { isSupabaseConfigured, requireSupabase } from './supabaseClient';
import { compressImage } from './utils';

export const SGSV_BUCKET = 'sgsv-media';
const PENDING_KEY = 'sgsv_pending_media';

// ─── Cola de subidas pendientes ───────────────────────────────────────────────

export interface PendingUpload {
  id: string;
  storagePath: string;
  base64: string;
  mimeType: string;
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
  createdAt: number;
}

export interface MediaPatch {
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
  url: string;
}

const readQueue = async (): Promise<PendingUpload[]> => {
  try { return (await get<PendingUpload[]>(PENDING_KEY)) ?? []; } catch { return []; }
};

const writeQueue = async (q: PendingUpload[]): Promise<void> => {
  try { await set(PENDING_KEY, q); } catch { /* ignore */ }
};

const enqueue = async (item: PendingUpload): Promise<void> => {
  const q = await readQueue();
  // Reemplaza si ya existe el mismo campo+entidad para evitar duplicados
  const filtered = q.filter(
    (u) => !(u.entityId === item.entityId && u.field === item.field && u.imagenesIndex === item.imagenesIndex),
  );
  await writeQueue([...filtered, item]);
};

export const removePendingUpload = async (id: string): Promise<void> => {
  const q = await readQueue();
  await writeQueue(q.filter((u) => u.id !== id));
};

export const getPendingUploadsCount = async (): Promise<number> =>
  (await readQueue()).length;

// ─── Operaciones de Storage ───────────────────────────────────────────────────

export const getStoragePublicUrl = (storagePath: string): string =>
  requireSupabase().storage.from(SGSV_BUCKET).getPublicUrl(storagePath).data.publicUrl;

const base64ToBlob = (base64: string): Promise<Blob> =>
  fetch(base64).then((r) => r.blob());

export const uploadBase64ToStorage = async (
  base64: string,
  storagePath: string,
  mimeType: string,
): Promise<string> => {
  const supabase = requireSupabase();
  const blob = await base64ToBlob(base64);
  const { error } = await supabase.storage
    .from(SGSV_BUCKET)
    .upload(storagePath, blob, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Error subiendo a Storage: ${error.message}`);
  return getStoragePublicUrl(storagePath);
};

// ─── Punto de entrada para modales y vistas ───────────────────────────────────

export interface HandleMediaOptions {
  file: File;
  storagePath: string;
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
}

/**
 * Sube un archivo al bucket sgsv-media de Supabase Storage y devuelve la URL pública.
 * Si la subida falla (offline o error de red), encola la operación en IDB para
 * reintentarla al reconectar, y devuelve el base64 para mostrar inmediatamente.
 */
export const handleMediaFile = async ({
  file,
  storagePath,
  entityType,
  entityId,
  field,
  imagenesIndex,
}: HandleMediaOptions): Promise<string> => {
  const isImage = file.type.startsWith('image/');
  const mimeType = isImage ? 'image/jpeg' : file.type;

  let base64: string;
  if (isImage) {
    base64 = await compressImage(file);
  } else {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const canUpload = isSupabaseConfigured() && navigator.onLine;

  if (!canUpload) {
    // Offline: encolar si Supabase está configurado, devolver base64 para UI
    if (isSupabaseConfigured()) {
      await enqueue({
        id: crypto.randomUUID(),
        storagePath,
        base64,
        mimeType,
        entityType,
        entityId,
        field,
        imagenesIndex,
        createdAt: Date.now(),
      });
    }
    return base64;
  }

  try {
    return await uploadBase64ToStorage(base64, storagePath, mimeType);
  } catch {
    // Subida falló (error de red transitorio): encolar y devolver base64
    await enqueue({
      id: crypto.randomUUID(),
      storagePath,
      base64,
      mimeType,
      entityType,
      entityId,
      field,
      imagenesIndex,
      createdAt: Date.now(),
    });
    return base64;
  }
};

// ─── Sincronización al reconectar ─────────────────────────────────────────────

export const processPendingMediaUploads = async (
  onPatched: (patch: MediaPatch) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> => {
  if (!isSupabaseConfigured() || !navigator.onLine) return { succeeded: 0, failed: 0 };

  const pending = await readQueue();
  if (!pending.length) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const url = await uploadBase64ToStorage(item.base64, item.storagePath, item.mimeType);
      await onPatched({
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
        imagenesIndex: item.imagenesIndex,
        url,
      });
      await removePendingUpload(item.id);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
};
