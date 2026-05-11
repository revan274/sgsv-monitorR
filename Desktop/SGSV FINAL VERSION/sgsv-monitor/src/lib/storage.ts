import { get, set } from 'idb-keyval';
import { isSupabaseConfigured, requireSupabase } from './supabaseClient';
import {
  STORAGE_KEYS,
  normalizeIncident,
  normalizePersona,
  stripPreviewForStorage,
  parseStoredArray,
  sortByTimestampDesc,
} from './utils';
import type { Incidente, PersonaInteres, Turno, AppConfig } from '../types';

const canUseCloud = (): boolean => isSupabaseConfigured();

type SupabaseErrorResult = {
  error: { message: string } | null;
};

const assertSupabaseOk = <T extends SupabaseErrorResult>(result: T, action: string): T => {
  if (result.error) {
    throw new Error(`${action}: ${result.error.message}`);
  }
  return result;
};

const normalizeTurno = (turno: unknown): Turno => {
  const t = (turno && typeof turno === 'object' ? turno : {}) as Record<string, unknown>;
  return {
    id: typeof t.id === 'string' && t.id ? t.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    inicio: Number.isFinite(Number(t.inicio)) ? Number(t.inicio) : Date.now(),
    fin: t.fin == null ? null : Number(t.fin),
    operador: typeof t.operador === 'string' && t.operador ? t.operador : 'Operador',
    ubicacion: typeof t.ubicacion === 'string' && t.ubicacion ? t.ubicacion : 'TJ01',
    notas: Array.isArray(t.notas) ? (t.notas as Turno['notas']) : [],
    incidenteIds: Array.isArray(t.incidenteIds)
      ? (t.incidenteIds as string[])
      : Array.isArray(t.incidente_ids)
        ? (t.incidente_ids as string[])
        : [],
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
    console.error('Error al cargar datos desde IndexedDB:', error);
    throw error;
  }
};

export const saveIncidentesToIDB = async (incidentes: Incidente[]): Promise<void> => {
  try { await set(STORAGE_KEYS.incidentes, incidentes.map(stripPreviewForStorage)); } catch { /* ignore */ }
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
    return (await get<AppConfig>(STORAGE_KEYS.config)) || {
      customLocations: [], customIncidentTypes: [], customPcpTerminos: [],
    };
  } catch {
    return { customLocations: [], customIncidentTypes: [], customPcpTerminos: [] };
  }
};

// ─── Carga desde API ──────────────────────────────────────────────────────────

export const loadDataFromCloud = async (): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  const supabase = requireSupabase();
  
  const [incRes, pcpRes] = await Promise.all([
    supabase.from('incidentes').select('*').order('timestamp', { ascending: false }).limit(500),
    supabase.from('personas_interes').select('*').order('nombre', { ascending: true })
  ]);

  assertSupabaseOk(incRes, 'Error al cargar incidentes desde Supabase');
  assertSupabaseOk(pcpRes, 'Error al cargar PCP desde Supabase');

  const rawIncidentes = incRes.data || [];
  const rawPcp = pcpRes.data || [];

  // Map snake_case to camelCase
  const mappedIncidentes = rawIncidentes.map(row => ({
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
    notas: row.notas,
    turnoId: row.turno_id
  }));

  const mappedPcp = rawPcp.map(row => ({
    id: row.id,
    fechaRegistro: row.fecha_registro,
    nombre: row.nombre,
    terminos: row.terminos,
    descripcion: row.descripcion,
    imagenes: row.imagenes
  }));

  const incidentes = sortByTimestampDesc(mappedIncidentes.map(normalizeIncident));
  const pcp = mappedPcp.map(normalizePersona);

  await Promise.all([saveIncidentesToIDB(incidentes), savePcpToIDB(pcp)]);
  return { incidentes, pcp };
};

export const loadData = async ({
  preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  if (preferCloud && canUseCloud()) return loadDataFromCloud();
  return loadDataFromIDB();
};

export const loadTurnosFromCloud = async (): Promise<Turno[]> => {
  const supabase = requireSupabase();
  const result = await supabase
    .from('turnos')
    .select('*')
    .order('inicio', { ascending: false });

  assertSupabaseOk(result, 'Error al cargar turnos desde Supabase');

  const turnos = (result.data || []).map(normalizeTurno);
  await saveTurnosToIDB(turnos);
  return turnos;
};

export const loadTurnos = async ({
  preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<Turno[]> => {
  if (preferCloud && canUseCloud()) return loadTurnosFromCloud();
  return loadTurnosFromIDB();
};

// ─── Paginacion server-side ───────────────────────────────────────────────────

export interface IncidentPage {
  incidentes: Incidente[];
  total: number;
  page: number;
  pageSize: number;
}

export const loadIncidentesPage = async (
  page = 1,
  pageSize = 20,
): Promise<IncidentPage> => {
  if (!canUseCloud()) {
    const { incidentes } = await loadDataFromIDB();
    const start = (page - 1) * pageSize;
    return { incidentes: incidentes.slice(start, start + pageSize), total: incidentes.length, page, pageSize };
  }

  const supabase = requireSupabase();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const result = await supabase
    .from('incidentes')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(start, end);

  assertSupabaseOk(result, 'Error al cargar pagina de incidentes desde Supabase');

  const { data, count } = result;

  const mappedIncidentes = (data || []).map(row => ({
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
    notas: row.notas,
    turnoId: row.turno_id
  }));

  return {
    incidentes: mappedIncidentes.map(normalizeIncident),
    total: count ?? 0,
    page,
    pageSize,
  };
};

// ─── CRUD Cloud ───────────────────────────────────────────────────────────────

export const upsertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
  if (canUseCloud()) {
    const supabase = requireSupabase();
    const result = await supabase.from('incidentes').upsert({
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
      turno_id: normalized.turnoId
    });
    assertSupabaseOk(result, 'Error guardando incidente en Supabase');
  }
  return normalized;
};

export const deleteIncidenteById = async (id: string): Promise<void> => {
  if (canUseCloud()) {
    const supabase = requireSupabase();
    const result = await supabase.from('incidentes').delete().eq('id', id);
    assertSupabaseOk(result, 'Error eliminando incidente en Supabase');
  }
};

export const upsertPersonaInteres = async (persona: PersonaInteres): Promise<PersonaInteres> => {
  const normalized = normalizePersona(persona);
  if (canUseCloud()) {
    const supabase = requireSupabase();
    const result = await supabase.from('personas_interes').upsert({
      id: normalized.id,
      fecha_registro: normalized.fechaRegistro,
      nombre: normalized.nombre,
      terminos: normalized.terminos,
      descripcion: normalized.descripcion,
      imagenes: normalized.imagenes
    });
    assertSupabaseOk(result, 'Error guardando PCP en Supabase');
  }
  return normalized;
};

export const deletePersonaInteresById = async (id: string): Promise<void> => {
  if (canUseCloud()) {
    const supabase = requireSupabase();
    const result = await supabase.from('personas_interes').delete().eq('id', id);
    assertSupabaseOk(result, 'Error eliminando PCP en Supabase');
  }
};

export const upsertTurno = async (turno: Turno): Promise<void> => {
  if (canUseCloud()) {
    const supabase = requireSupabase();
    const result = await supabase.from('turnos').upsert({
      id: turno.id,
      inicio: turno.inicio,
      fin: turno.fin,
      operador: turno.operador,
      ubicacion: turno.ubicacion,
      notas: turno.notas,
      incidente_ids: turno.incidenteIds
    });
    assertSupabaseOk(result, 'Error guardando turno en Supabase');
  }
};
