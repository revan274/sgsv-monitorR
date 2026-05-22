import { get, set } from 'idb-keyval';
import { isApiConfigured, apiGet, apiUpsert, apiDelete } from './apiClient';
import { captureError } from './monitoring';
import {
  STORAGE_KEYS,
  normalizeIncident,
  normalizePersona,
  stripPreviewForStorage,
  parseStoredArray,
  sortByTimestampDesc,
} from './utils';
import type { Incidente, PersonaInteres, Turno, AppConfig } from '../types';

const canUseCloud = (): boolean => isApiConfigured();

// ─── JSON field helper (D1 stores arrays as TEXT) ─────────────────────────────

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (Array.isArray(value)) return value as T;
  if (value !== null && typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return fallback;
};

// ─── Row mappers (snake_case API row → camelCase model) ───────────────────────

const rowToIncidente = (row: Record<string, unknown>): Incidente =>
  normalizeIncident({
    id: row.id,
    fecha: row.fecha,
    timestamp: row.timestamp,
    titulo: row.titulo,
    tipo: row.tipo,
    severidad: row.severidad,
    descripcion: row.descripcion,
    ubicacion: row.ubicacion,
    status: row.status,
    responsable: row.responsable,
    imagenEvidencia: row.imagen_evidencia,
    imagenPersona: row.imagen_persona,
    videoEvidencia: row.video_evidencia,
    closedAt: row.closed_at,
    notas: parseJsonField(row.notas, []),
    turnoId: row.turno_id,
  });

const rowToPersona = (row: Record<string, unknown>): PersonaInteres =>
  normalizePersona({
    id: row.id,
    fechaRegistro: row.fecha_registro,
    nombre: row.nombre,
    terminos: row.terminos,
    descripcion: row.descripcion,
    imagenes: parseJsonField(row.imagenes, []),
  });

const rowToTurno = (row: Record<string, unknown>): Turno => ({
  id: String(row.id || ''),
  inicio: Number(row.inicio) || Date.now(),
  fin: row.fin != null ? Number(row.fin) : null,
  operador: String(row.operador || 'Operador'),
  ubicacion: String(row.ubicacion || ''),
  notas: parseJsonField(row.notas, []),
  incidenteIds: parseJsonField(row.incidente_ids ?? row.incidenteIds, []),
});

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const normalizeConfig = (config: unknown): AppConfig => {
  const c = (config && typeof config === 'object' ? config : {}) as Record<string, unknown>;
  return {
    customLocations: normalizeStringArray(c.customLocations ?? c.custom_locations),
    customIncidentTypes: normalizeStringArray(c.customIncidentTypes ?? c.custom_incident_types),
    customPcpTerminos: normalizeStringArray(c.customPcpTerminos ?? c.custom_pcp_terminos),
  };
};

// ─── IDB ─────────────────────────────────────────────────────────────────────

export const loadDataFromIDB = async (): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  try {
    let savedIncidentes = await get<Incidente[]>(STORAGE_KEYS.incidentes);
    let savedPCP = await get<PersonaInteres[]>(STORAGE_KEYS.pcp);

    if (!savedIncidentes) {
      const localInc = parseStoredArray(localStorage.getItem(STORAGE_KEYS.incidentes)).map(normalizeIncident);
      if (localInc.length > 0) {
        await set(STORAGE_KEYS.incidentes, localInc);
        savedIncidentes = localInc;
      }
    }

    if (!savedPCP) {
      const localPcp = parseStoredArray(localStorage.getItem(STORAGE_KEYS.pcp)).map(normalizePersona);
      if (localPcp.length > 0) {
        await set(STORAGE_KEYS.pcp, localPcp);
        savedPCP = localPcp;
      }
    }

    return {
      incidentes: sortByTimestampDesc(savedIncidentes || []),
      pcp: savedPCP || [],
    };
  } catch (error) {
    captureError(error, { component: 'storage', action: 'loadDataFromIDB' });
    throw error;
  }
};

export const saveIncidentesToIDB = async (incidentes: Incidente[]): Promise<void> => {
  try { await set(STORAGE_KEYS.incidentes, incidentes.map(normalizeIncident)); } catch { /* ignore */ }
};

export const savePcpToIDB = async (pcp: PersonaInteres[]): Promise<void> => {
  try { await set(STORAGE_KEYS.pcp, pcp.map(normalizePersona)); } catch { /* ignore */ }
};

export const saveTurnosToIDB = async (turnos: Turno[]): Promise<void> => {
  try { await set(STORAGE_KEYS.turnos, turnos); } catch { /* ignore */ }
};

export const loadTurnosFromIDB = async (): Promise<Turno[]> => {
  try { return (await get<Turno[]>(STORAGE_KEYS.turnos)) || []; } catch { return []; }
};

export const saveConfigToIDB = async (config: AppConfig): Promise<void> => {
  try { await set(STORAGE_KEYS.config, config); } catch { /* ignore */ }
};

export const loadConfigFromIDB = async (): Promise<AppConfig> => {
  try {
    return normalizeConfig((await get<AppConfig>(STORAGE_KEYS.config)) || {
      customLocations: [], customIncidentTypes: [], customPcpTerminos: [],
    });
  } catch {
    return { customLocations: [], customIncidentTypes: [], customPcpTerminos: [] };
  }
};

// ─── Carga desde API ──────────────────────────────────────────────────────────

export const loadDataFromCloud = async (): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  const [rawIncidentes, rawPcp] = await Promise.all([
    apiGet('/api/incidentes') as Promise<Record<string, unknown>[]>,
    apiGet('/api/personas') as Promise<Record<string, unknown>[]>,
  ]);

  const incidentes = sortByTimestampDesc((rawIncidentes || []).map(rowToIncidente));
  const pcp = (rawPcp || []).map(rowToPersona);

  await Promise.all([saveIncidentesToIDB(incidentes), savePcpToIDB(pcp)]);
  return { incidentes, pcp };
};

export const loadData = async ({
  preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  if (preferCloud && canUseCloud()) {
    try {
      return await loadDataFromCloud();
    } catch {
      return loadDataFromIDB();
    }
  }
  return loadDataFromIDB();
};

// Config has no API endpoint — always IDB
export const loadConfigFromCloud = async (): Promise<AppConfig> => loadConfigFromIDB();

export const loadConfig = async ({
  preferCloud: _preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<AppConfig> => loadConfigFromIDB();

export const saveConfig = async (
  config: AppConfig,
  { preferCloud: _preferCloud = true }: { preferCloud?: boolean } = {},
): Promise<void> => {
  const normalized = normalizeConfig(config);
  await saveConfigToIDB(normalized);
};

export const loadTurnosFromCloud = async (): Promise<Turno[]> => {
  const raw = (await apiGet('/api/turnos')) as Record<string, unknown>[];
  const turnos = (raw || []).map(rowToTurno);
  await saveTurnosToIDB(turnos);
  return turnos;
};

export const loadTurnos = async ({
  preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<Turno[]> => {
  if (preferCloud && canUseCloud()) {
    try {
      return await loadTurnosFromCloud();
    } catch {
      return loadTurnosFromIDB();
    }
  }
  return loadTurnosFromIDB();
};

// ─── CRUD Cloud ───────────────────────────────────────────────────────────────

export const upsertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
  if (canUseCloud()) {
    await apiUpsert('/api/incidentes', normalized.id, {
      id: normalized.id,
      fecha: normalized.fecha,
      timestamp: normalized.timestamp,
      titulo: normalized.titulo,
      tipo: normalized.tipo,
      severidad: normalized.severidad,
      descripcion: normalized.descripcion,
      ubicacion: normalized.ubicacion,
      status: normalized.status,
      responsable: normalized.responsable,
      imagen_evidencia: normalized.imagenEvidencia,
      imagen_persona: normalized.imagenPersona,
      video_evidencia: normalized.videoEvidencia,
      closed_at: normalized.closedAt,
      notas: normalized.notas,
      turno_id: normalized.turnoId ?? null,
    });
  }
  return normalized;
};

export const insertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
  if (canUseCloud()) {
    await apiUpsert('/api/incidentes', normalized.id, {
      id: normalized.id,
      fecha: normalized.fecha,
      timestamp: normalized.timestamp,
      titulo: normalized.titulo,
      tipo: normalized.tipo,
      severidad: normalized.severidad,
      descripcion: normalized.descripcion,
      ubicacion: normalized.ubicacion,
      status: normalized.status,
      responsable: normalized.responsable,
      imagen_evidencia: normalized.imagenEvidencia,
      imagen_persona: normalized.imagenPersona,
      video_evidencia: normalized.videoEvidencia,
      closed_at: normalized.closedAt,
      notas: normalized.notas,
      turno_id: normalized.turnoId ?? null,
    });
  }
  return normalized;
};

export const deleteIncidenteById = async (id: string): Promise<void> => {
  if (canUseCloud()) {
    await apiDelete(`/api/incidentes/${id}`);
  }
};

export const upsertPersonaInteres = async (persona: PersonaInteres): Promise<PersonaInteres> => {
  const normalized = normalizePersona(persona);
  if (canUseCloud()) {
    await apiUpsert('/api/personas', normalized.id, {
      id: normalized.id,
      fecha_registro: normalized.fechaRegistro,
      nombre: normalized.nombre,
      terminos: normalized.terminos,
      descripcion: normalized.descripcion,
      imagenes: normalized.imagenes,
    });
  }
  return normalized;
};

export const deletePersonaInteresById = async (id: string): Promise<void> => {
  if (canUseCloud()) {
    await apiDelete(`/api/personas/${id}`);
  }
};

export const upsertTurno = async (turno: Turno): Promise<void> => {
  if (canUseCloud()) {
    await apiUpsert('/api/turnos', turno.id, {
      id: turno.id,
      inicio: turno.inicio,
      fin: turno.fin,
      operador: turno.operador,
      ubicacion: turno.ubicacion,
      notas: turno.notas,
      incidente_ids: turno.incidenteIds,
    });
  }
};
