import { apiGet, apiPatch, apiUpsert, apiDelete } from './apiClient';
import {
  normalizeIncident,
  normalizePersona,
  stripPreviewForStorage,
  sortByTimestampDesc,
} from './utils';
import type { Incidente, PersonaInteres, Turno, AppConfig } from '../types';

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

// ─── Carga desde API ──────────────────────────────────────────────────────────



export const saveConfig = async (
  config: AppConfig
): Promise<void> => {
  const normalized = normalizeConfig(config);
  await apiPatch('/api/config', normalized);
};



export const loadBootstrap = async (): Promise<{
  incidentes: Incidente[];
  pcp: PersonaInteres[];
  turnos: Turno[];
  config: AppConfig;
  usuarios: import('../types').UserProfile[];
}> => {
  const raw = (await apiGet('/api/bootstrap')) as {
    incidentes?: Record<string, unknown>[];
    pcp?: Record<string, unknown>[];
    turnos?: Record<string, unknown>[];
    config?: unknown;
    usuarios?: import('../types').UserProfile[];
  };
  return {
    incidentes: sortByTimestampDesc((raw.incidentes || []).map((item) => normalizeIncident(item))),
    pcp: (raw.pcp || []).map((item) => normalizePersona(item)),
    turnos: (raw.turnos || []).map(rowToTurno),
    config: normalizeConfig(raw.config),
    usuarios: raw.usuarios || [],
  };
};

// ─── CRUD Cloud ───────────────────────────────────────────────────────────────

export const upsertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
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
  return normalized;
};

export const insertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
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
  return normalized;
};

export const deleteIncidenteById = async (id: string): Promise<void> => {
  await apiDelete(`/api/incidentes/${id}`);
};

export const upsertPersonaInteres = async (persona: PersonaInteres): Promise<PersonaInteres> => {
  const normalized = normalizePersona(persona);
  await apiUpsert('/api/personas', normalized.id, {
    id: normalized.id,
    fecha_registro: normalized.fechaRegistro,
    nombre: normalized.nombre,
    terminos: normalized.terminos,
    descripcion: normalized.descripcion,
    imagenes: normalized.imagenes,
  });
  return normalized;
};

export const deletePersonaInteresById = async (id: string): Promise<void> => {
  await apiDelete(`/api/personas/${id}`);
};

export const upsertTurno = async (turno: Turno): Promise<void> => {
  await apiUpsert('/api/turnos', turno.id, {
    id: turno.id,
    inicio: turno.inicio,
    fin: turno.fin,
    operador: turno.operador,
    ubicacion: turno.ubicacion,
    notas: turno.notas,
    incidente_ids: turno.incidenteIds,
  });
};
