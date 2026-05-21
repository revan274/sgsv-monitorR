import { get, set } from 'idb-keyval';
import { isApiConfigured, apiUpsert, apiDelete } from './apiClient';

const QUEUE_KEY = 'sgsv_sync_queue';

export type SyncOpType = 'upsert' | 'delete';
export type SyncTable = 'incidentes' | 'personas_interes' | 'turnos';

export const MAX_RETRIES = 5;

export interface SyncOperation {
  id: string;
  type: SyncOpType;
  table: SyncTable;
  entityId: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  retries?: number;
  lastError?: string;
}

// ─── Queue management ─────────────────────────────────────────────────────────

const readQueue = async (): Promise<SyncOperation[]> => {
  try { return (await get<SyncOperation[]>(QUEUE_KEY)) ?? []; } catch { return []; }
};

const writeQueue = async (q: SyncOperation[]): Promise<void> => {
  try { await set(QUEUE_KEY, q); } catch { /* ignore */ }
};

export const getQueueCount = async (): Promise<number> =>
  (await readQueue()).length;

export const clearQueue = async (): Promise<void> => writeQueue([]);

/**
 * Encola una operación CRUD para sincronizar con la API cuando haya conexión.
 * Aplica merging inteligente:
 *   - upsert → reemplaza cualquier upsert previo del mismo entityId+table
 *   - delete → elimina cualquier upsert previo y añade delete (toma precedencia)
 */
export const enqueueOp = async (
  op: Omit<SyncOperation, 'id' | 'createdAt'>,
): Promise<void> => {
  const q = await readQueue();

  const newOp: SyncOperation = { ...op, id: crypto.randomUUID(), createdAt: Date.now(), retries: 0 };

  if (op.type === 'delete') {
    const filtered = q.filter(
      (o) => !(o.table === op.table && o.entityId === op.entityId),
    );
    await writeQueue([...filtered, newOp]);
  } else {
    const hasDelete = q.some(
      (o) => o.table === op.table && o.entityId === op.entityId && o.type === 'delete',
    );
    if (hasDelete) return;
    const filtered = q.filter(
      (o) => !(o.table === op.table && o.entityId === op.entityId),
    );
    await writeQueue([...filtered, newOp]);
  }
};

const removeOp = async (id: string): Promise<void> => {
  const q = await readQueue();
  await writeQueue(q.filter((o) => o.id !== id));
};

// ─── Mapeo tabla → endpoint de la API ────────────────────────────────────────

const TABLE_ENDPOINTS: Record<SyncTable, string> = {
  incidentes: '/api/incidentes',
  personas_interes: '/api/personas',
  turnos: '/api/turnos',
};

// ─── Mapeo JS model → DB row (camelCase → snake_case) ────────────────────────

const toUrl = (v: unknown): string | null =>
  typeof v === 'string' && v.startsWith('https://') ? v : null;

const incidenteToRow = (p: Record<string, unknown>): Record<string, unknown> => ({
  id: p.id,
  fecha: p.fecha,
  timestamp: p.timestamp,
  titulo: p.titulo,
  tipo: p.tipo,
  severidad: p.severidad,
  descripcion: p.descripcion,
  ubicacion: p.ubicacion,
  status: p.status,
  responsable: p.responsable,
  imagen_evidencia: toUrl(p.imagenEvidencia),
  imagen_persona: toUrl(p.imagenPersona),
  video_evidencia: toUrl(p.videoEvidencia),
  closed_at: p.closedAt ?? null,
  notas: p.notas ?? [],
  turno_id: p.turnoId ?? null,
});

const personaToRow = (p: Record<string, unknown>): Record<string, unknown> => ({
  id: p.id,
  fecha_registro: p.fechaRegistro,
  nombre: p.nombre,
  terminos: p.terminos,
  descripcion: p.descripcion,
  imagenes: p.imagenes ?? [],
});

const turnoToRow = (p: Record<string, unknown>): Record<string, unknown> => ({
  id: p.id,
  inicio: p.inicio,
  fin: p.fin ?? null,
  operador: p.operador,
  ubicacion: p.ubicacion,
  notas: p.notas ?? [],
  incidente_ids: p.incidenteIds ?? [],
});

const toDbRow = (table: SyncTable, payload: Record<string, unknown>): Record<string, unknown> => {
  switch (table) {
    case 'incidentes':       return incidenteToRow(payload);
    case 'personas_interes': return personaToRow(payload);
    case 'turnos':           return turnoToRow(payload);
  }
};

// ─── Procesador de cola ───────────────────────────────────────────────────────

export const processQueue = async (): Promise<{ succeeded: number; failed: number; firstError: string | null }> => {
  if (!isApiConfigured() || !navigator.onLine) return { succeeded: 0, failed: 0, firstError: null };

  const queue = await readQueue();
  if (!queue.length) return { succeeded: 0, failed: 0, firstError: null };

  const sorted = [...queue].sort((a, b) => a.createdAt - b.createdAt);
  let succeeded = 0;
  let failed = 0;
  let firstError: string | null = null;

  for (const op of sorted) {
    const endpoint = TABLE_ENDPOINTS[op.table];
    try {
      if (op.type === 'delete') {
        await apiDelete(`${endpoint}/${op.entityId}`);
      } else {
        const row = toDbRow(op.table, op.payload as Record<string, unknown>);
        await apiUpsert(endpoint, op.entityId, row);
      }
      await removeOp(op.id);
      succeeded++;
    } catch (err) {
      const msg = (err as Error).message || 'Error desconocido';
      if (!firstError) firstError = msg;
      const retries = (op.retries ?? 0) + 1;
      if (retries >= MAX_RETRIES) {
        await removeOp(op.id);
        console.warn(`[SyncQueue] Op descartada tras ${MAX_RETRIES} intentos (${op.table}/${op.entityId}):`, msg);
      } else {
        const q = await readQueue();
        await writeQueue(q.map((o) => o.id === op.id ? { ...o, retries, lastError: msg } : o));
        failed++;
      }
    }
  }

  return { succeeded, failed, firstError };
};
