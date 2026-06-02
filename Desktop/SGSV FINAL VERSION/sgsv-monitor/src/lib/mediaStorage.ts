import { get, set } from 'idb-keyval';
import { isApiConfigured, apiGet, apiPatch, apiUpload } from './apiClient';
import { compressImage } from './utils';
import { captureError, captureWarning } from './monitoring';

const UPLOAD_QUEUE_KEY = 'sgsv_media_upload_queue';
const MEDIA_MAX_RETRIES = 3;

export interface HandleMediaOptions {
  file: File;
  storagePath: string;
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
}

interface PendingUpload {
  id: string;
  storagePath: string;
  entityPath: string;
  patchKey: string;
  imagenesIndex?: number;
  base64: string;
  createdAt: number;
  retries: number;
}

// ─── Field name mapping ───────────────────────────────────────────────────────

const FIELD_TO_SNAKE: Record<string, string> = {
  imagenEvidencia: 'imagen_evidencia',
  imagenPersona: 'imagen_persona',
  videoEvidencia: 'video_evidencia',
  imagenes: 'imagenes',
};

const toEntityPath = (entityType: 'incidente' | 'pcp', entityId: string): string =>
  entityType === 'incidente' ? `/api/incidentes/${entityId}` : `/api/personas/${entityId}`;

// ─── Queue helpers ────────────────────────────────────────────────────────────

const readUploadQueue = async (): Promise<PendingUpload[]> => {
  try { return (await get<PendingUpload[]>(UPLOAD_QUEUE_KEY)) ?? []; } catch { return []; }
};

const writeUploadQueue = async (q: PendingUpload[]): Promise<void> => {
  try { await set(UPLOAD_QUEUE_KEY, q); } catch { /* ignore */ }
};

const enqueuePendingUpload = async (
  upload: Omit<PendingUpload, 'id' | 'createdAt' | 'retries'>,
): Promise<void> => {
  const q = await readUploadQueue();
  await writeUploadQueue([
    ...q,
    { ...upload, id: crypto.randomUUID(), createdAt: Date.now(), retries: 0 },
  ]);
};

const removeUpload = async (id: string): Promise<void> => {
  const q = await readUploadQueue();
  await writeUploadQueue(q.filter((u) => u.id !== id));
};

// ─── Upload helpers ───────────────────────────────────────────────────────────

const base64ToFormData = (base64: string, filename: string): FormData => {
  const [meta, data] = base64.split(',');
  const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bytes = atob(data);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mimeType }), filename);
  return form;
};

const uploadToWorker = async (base64: string, storagePath: string): Promise<string> => {
  const filename = storagePath.split('/').pop() ?? 'upload';
  const form = base64ToFormData(base64, filename);
  form.append('path', storagePath);
  const result = (await apiUpload('/api/upload', form)) as { url: string };
  return result.url;
};

// Parcheamos la entidad con la URL definitiva.
// Para imagenes[] de PCP necesitamos el array actual para actualizar el índice correcto.
const applyUploadToEntity = async (upload: PendingUpload, url: string): Promise<void> => {
  if (upload.imagenesIndex === undefined) {
    await apiPatch(upload.entityPath, { [upload.patchKey]: url });
  } else {
    const current = (await apiGet(upload.entityPath)) as Record<string, unknown>;
    const imagenes: string[] = Array.isArray(current.imagenes)
      ? [...(current.imagenes as string[])]
      : [];
    imagenes[upload.imagenesIndex] = url;
    await apiPatch(upload.entityPath, { imagenes });
  }
};

// ─── API pública ──────────────────────────────────────────────────────────────

export const handleMediaFile = async ({
  file,
  storagePath,
  entityType,
  entityId,
  field,
  imagenesIndex,
}: HandleMediaOptions): Promise<string> => {
  const isImage = file.type.startsWith('image/');

  const base64 = isImage
    ? await compressImage(file)
    : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target!.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

  if (isApiConfigured() && navigator.onLine) {
    try {
      return await uploadToWorker(base64, storagePath);
    } catch (err) {
      captureWarning('R2 upload fallido, encolando para reintento', {
        component: 'mediaStorage',
        action: 'handleMediaFile',
        entityId,
      });
    }
  }

  // Sin conexión o upload fallido — devuelve base64 para preview inmediato
  // y encola el upload para cuando haya conexión
  await enqueuePendingUpload({
    storagePath,
    entityPath: toEntityPath(entityType, entityId),
    patchKey: FIELD_TO_SNAKE[field] ?? field,
    imagenesIndex,
    base64,
  });

  return base64;
};

export const processPendingMediaUploads = async (): Promise<{
  succeeded: number;
  failed: number;
}> => {
  if (!isApiConfigured() || !navigator.onLine) return { succeeded: 0, failed: 0 };

  const queue = await readUploadQueue();
  if (!queue.length) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const upload of queue) {
    try {
      const url = await uploadToWorker(upload.base64, upload.storagePath);
      await applyUploadToEntity(upload, url);
      await removeUpload(upload.id);
      succeeded++;
    } catch (err) {
      const retries = upload.retries + 1;
      if (retries >= MEDIA_MAX_RETRIES) {
        await removeUpload(upload.id);
        captureWarning(`Media upload descartado tras ${MEDIA_MAX_RETRIES} intentos`, {
          component: 'mediaStorage',
          action: 'processPendingMediaUploads',
          entityId: upload.entityPath,
        });
      } else {
        const q = await readUploadQueue();
        await writeUploadQueue(q.map((u) => (u.id === upload.id ? { ...u, retries } : u)));
        failed++;
      }
      captureError(err, { component: 'mediaStorage', action: 'processPendingMediaUploads' });
    }
  }

  return { succeeded, failed };
};